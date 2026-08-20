import {
  nip04,
  nip44,
  finalizeEvent,
  getPublicKey,
  Event,
  EventTemplate,
} from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils.js";

import { Logger, noopLogger } from "../logger";
import {
  Nip47MakeInvoiceRequest,
  Nip47Method,
  Nip47NetworkError,
  Nip47PublishError,
  Nip47NotificationType,
  Nip47PayInvoiceRequest,
  Nip47PayKeysendRequest,
  Nip47LookupInvoiceRequest,
  Nip47ListTransactionsRequest,
  Nip47SignMessageRequest,
  Nip47SingleMethod,
  Nip47EncryptionType,
  Nip47Notification,
} from "./types";
import {
  NWCWalletServiceRequestHandler,
  NWCWalletServiceResponse,
  NWCWalletServiceResponsePromise,
} from "./NWCWalletServiceRequestHandler";
import { ReconnectingPool } from "./ReconnectingPool";

export type NewNWCWalletServiceOptions = {
  relayUrls?: string[];
  logger?: Logger;
};

/**
 * Optional NIP-01 time bounds for the kind 23194 request subscription.
 * Use a persisted high-water mark (e.g. last seen `created_at`) as `since`
 * to limit replay of retained history on resubscribe. This is a best-effort
 * bound for well-behaved relays; non-compliant relays can ignore `since` /
 * `until`. Keep using `recordEvent` for idempotency.
 */
export type NWCWalletServiceSubscribeFilter = {
  since?: number;
  until?: number;
};

// First retry waits 1s; each subsequent attempt doubles (1s, 2s, 4s, 8s, 16s).
const INITIAL_PUBLISH_RETRY_DELAY_MS = 1000;
const MAX_PUBLISH_ATTEMPTS = 6;

export class NWCWalletServiceKeyPair {
  walletSecret: string;
  walletPubkey: string;
  clientPubkey: string;
  constructor(walletSecret: string, clientPubkey: string) {
    this.walletSecret = walletSecret;
    this.clientPubkey = clientPubkey;
    if (!this.walletSecret) {
      throw new Error("Missing wallet secret key");
    }
    if (!this.clientPubkey) {
      throw new Error("Missing client pubkey");
    }
    this.walletPubkey = getPublicKey(hexToBytes(this.walletSecret));
  }
}

export class NWCWalletService {
  pool: ReconnectingPool;
  relayUrls: string[];
  logger: Logger;

  constructor(options: NewNWCWalletServiceOptions) {
    if (!options.relayUrls?.length) {
      throw new Error("Missing relayUrls");
    }

    this.logger = options.logger || noopLogger;
    this.pool = new ReconnectingPool();
    this.relayUrls = options.relayUrls;
  }

  async publishWalletServiceInfoEvent(
    walletSecret: string,
    supportedMethods: Nip47SingleMethod[],
    supportedNotifications: Nip47NotificationType[],
  ) {
    try {
      await this._checkConnected();
      const eventTemplate: EventTemplate = {
        kind: 13194,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["encryption", "nip04 nip44_v2"],
          ["notifications", supportedNotifications.join(" ")],
        ],
        content: supportedMethods.join(" "),
      };

      const event = await this.signEvent(eventTemplate, walletSecret);
      // NOTE: ideally we queue failed publishes and try again later
      await Promise.any(this.pool.publish(this.relayUrls, event));
    } catch (error) {
      console.error("failed to publish wallet service info event", error);
      throw error;
    }
  }

  /**
   * Publish a NIP-47 notification to the connected client.
   * Always publishes both encryption kinds advertised on the info event:
   * nip44_v2 (kind 23197) and nip04 (kind 23196).
   */
  async publishNotification(
    keypair: NWCWalletServiceKeyPair,
    notification: Nip47Notification,
  ): Promise<void> {
    try {
      await this._checkConnected();

      // Match publishWalletServiceInfoEvent's hardcoded encryption tag.
      const encryptionTypes: Nip47EncryptionType[] = ["nip44_v2", "nip04"];
      const payload = JSON.stringify(notification);

      await Promise.all(
        encryptionTypes.map(async (encryptionType) => {
          const eventTemplate: EventTemplate = {
            kind: encryptionType === "nip04" ? 23196 : 23197,
            created_at: Math.floor(Date.now() / 1000),
            tags: [["p", keypair.clientPubkey]],
            content: await this.encrypt(keypair, payload, encryptionType),
          };

          const event = await this.signEvent(
            eventTemplate,
            keypair.walletSecret,
          );

          const published = await this._publishWithRetry(event);
          if (!published) {
            throw new Nip47PublishError(
              "Failed to publish notification event",
              "INTERNAL",
            );
          }
        }),
      );
    } catch (error) {
      console.error("failed to publish notification event", error);
      throw error;
    }
  }

  async subscribe(
    keypair: NWCWalletServiceKeyPair,
    handler: NWCWalletServiceRequestHandler,
    filter?: NWCWalletServiceSubscribeFilter,
  ): Promise<() => void> {
    this.logger.debug("checking connection to relays");
    await this._checkConnected();

    this.logger.debug("subscribing to relays");

    // serializes handler.recordEvent calls so duplicate events delivered in
    // quick succession cannot pass the check concurrently
    let recordEventQueue: Promise<unknown> = Promise.resolve();

    let unsubscribed = false;

    const sub = this.pool.subscribe(
      this.relayUrls,

      {
        kinds: [23194],
        authors: [keypair.clientPubkey],
        "#p": [keypair.walletPubkey],
        ...(filter?.since !== undefined ? { since: filter.since } : {}),
        ...(filter?.until !== undefined ? { until: filter.until } : {}),
      },

      {
        onevent: async (event) => {
          try {
            // console.info("Got event", event);
            const encryptionType = (event.tags.find(
              (t) => t[0] === "encryption",
            )?.[1] || "nip04") as Nip47EncryptionType;

            const decryptedContent = await this.decrypt(
              keypair,
              event.content,
              encryptionType,
            );
            const request = JSON.parse(decryptedContent) as {
              method: Nip47Method;
              params: unknown;
            };

            if (handler.recordEvent) {
              const recordEventPromise = recordEventQueue.then(() =>
                handler.recordEvent?.(event.id),
              );
              // keep the queue alive even if recordEvent throws
              recordEventQueue = recordEventPromise.catch(() => {});
              if ((await recordEventPromise) === "ALREADY_PROCESSED") {
                this.logger.debug("skipped already processed event", event.id);
                return;
              }
            }

            let responsePromise:
              | NWCWalletServiceResponsePromise<unknown>
              | undefined;

            switch (request.method) {
              case "get_info":
                responsePromise = handler.getInfo?.();
                break;
              case "make_invoice":
                responsePromise = handler.makeInvoice?.(
                  request.params as Nip47MakeInvoiceRequest,
                );
                break;
              case "pay_invoice":
                responsePromise = handler.payInvoice?.(
                  request.params as Nip47PayInvoiceRequest,
                );
                break;
              case "pay_keysend":
                responsePromise = handler.payKeysend?.(
                  request.params as Nip47PayKeysendRequest,
                );
                break;
              case "get_balance":
                responsePromise = handler.getBalance?.();
                break;
              case "lookup_invoice":
                responsePromise = handler.lookupInvoice?.(
                  request.params as Nip47LookupInvoiceRequest,
                );
                break;
              case "list_transactions":
                responsePromise = handler.listTransactions?.(
                  request.params as Nip47ListTransactionsRequest,
                );
                break;
              case "sign_message":
                responsePromise = handler.signMessage?.(
                  request.params as Nip47SignMessageRequest,
                );
                break;
            }

            let response: NWCWalletServiceResponse<unknown> | undefined =
              await responsePromise;

            if (!response) {
              console.warn("received unsupported method", request.method);
              response = {
                error: {
                  code: "NOT_IMPLEMENTED",
                  message: "This method is not supported by the wallet service",
                },
                result: undefined,
              };
            }

            const responseEventTemplate: EventTemplate = {
              kind: 23195,
              created_at: Math.floor(Date.now() / 1000),
              tags: [
                ["e", event.id],
                ["p", keypair.clientPubkey],
              ],
              content: await this.encrypt(
                keypair,
                JSON.stringify({
                  result_type: request.method,
                  ...response,
                }),
                encryptionType,
              ),
            };

            const responseEvent = await this.signEvent(
              responseEventTemplate,
              keypair.walletSecret,
            );

            // Try to publish to at least one relay, retrying with
            // exponential backoff (up to MAX_PUBLISH_ATTEMPTS times)
            this._publishWithRetry(responseEvent, () => unsubscribed);
          } catch (e) {
            console.error("Failed to handle event", e);
            return;
          }
        },
        onconnect: (url) => {
          this.logger.debug("relay connected", url);
        },
        ondisconnect: (url, reason) => {
          this.logger.debug("relay disconnected", url, reason);
        },
      },
    );

    return () => {
      unsubscribed = true;
      sub?.close();
    };
  }

  private async _publishWithRetry(
    event: Event,
    isStopped: () => boolean = () => false, // default to not stopping
  ): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_PUBLISH_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const delay = INITIAL_PUBLISH_RETRY_DELAY_MS * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      if (isStopped() || this.pool.closed) {
        return false;
      }
      try {
        // Try to publish to at least one relay
        await Promise.any(this.pool.publish(this.relayUrls, event));
        return true;
      } catch (error) {
        console.error(
          `failed to publish event (attempt ${attempt + 1}/${MAX_PUBLISH_ATTEMPTS})`,
          event.id,
          error,
        );
      }
    }
    return false;
  }

  get connected() {
    const statuses = Array.from(this.pool.listConnectionStatus().values());
    return statuses.some((status) => status === true);
  }

  signEvent(event: EventTemplate, secretKey: string): Promise<Event> {
    return Promise.resolve(finalizeEvent(event, hexToBytes(secretKey)));
  }

  close() {
    return this.pool.close(this.relayUrls);
  }

  async encrypt(
    keypair: NWCWalletServiceKeyPair,
    content: string,
    encryptionType: Nip47EncryptionType,
  ) {
    let encrypted;
    if (encryptionType === "nip04") {
      encrypted = await nip04.encrypt(
        keypair.walletSecret,
        keypair.clientPubkey,
        content,
      );
    } else {
      const key = nip44.getConversationKey(
        hexToBytes(keypair.walletSecret),
        keypair.clientPubkey,
      );
      encrypted = nip44.encrypt(content, key);
    }
    return encrypted;
  }

  async decrypt(
    keypair: NWCWalletServiceKeyPair,
    content: string,
    encryptionType: Nip47EncryptionType,
  ) {
    let decrypted;
    if (encryptionType === "nip04") {
      decrypted = await nip04.decrypt(
        keypair.walletSecret,
        keypair.clientPubkey,
        content,
      );
    } else {
      const key = nip44.getConversationKey(
        hexToBytes(keypair.walletSecret),
        keypair.clientPubkey,
      );
      decrypted = nip44.decrypt(content, key);
    }
    return decrypted;
  }

  private async _checkConnected() {
    // Waits for the socket to open, then proceeds
    try {
      await Promise.any(
        this.relayUrls.map((relayUrl) => this.pool.ensureRelay(relayUrl)),
      );
    } catch (error) {
      console.error("failed to connect to relay", this.relayUrls, error);
      throw new Nip47NetworkError(
        "Failed to connect to " + this.relayUrls.join(","),
        "OTHER",
      );
    }
  }
}
