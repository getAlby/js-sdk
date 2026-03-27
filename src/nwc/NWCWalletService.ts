import {
  nip04,
  nip44,
  finalizeEvent,
  getPublicKey,
  Event,
  EventTemplate,
  SimplePool,
} from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";

import {
  Nip47MakeInvoiceRequest,
  Nip47Method,
  Nip47NetworkError,
  Nip47NotificationType,
  Nip47PayInvoiceRequest,
  Nip47PayKeysendRequest,
  Nip47LookupInvoiceRequest,
  Nip47ListTransactionsRequest,
  Nip47SignMessageRequest,
  Nip47SingleMethod,
  Nip47EncryptionType,
} from "./types";
import {
  NWCWalletServiceRequestHandler,
  NWCWalletServiceResponse,
  NWCWalletServiceResponsePromise,
} from "./NWCWalletServiceRequestHandler";

export type NewNWCWalletServiceOptions = {
  relayUrl?: string;
  relayUrls?: string[];
};

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
  pool: SimplePool;
  relayUrls: string[];

  constructor(options: NewNWCWalletServiceOptions) {
    if (options.relayUrls && options.relayUrls.length > 0) {
      this.relayUrls = options.relayUrls;
    } else if (options.relayUrl) {
      this.relayUrls = [options.relayUrl];
    } else {
      throw new Error("Missing relayUrl or relayUrls");
    }

    this.pool = new SimplePool({ enableReconnect: true });

    if (globalThis.WebSocket === undefined) {
      console.error(
        "WebSocket is undefined. Make sure to `import websocket-polyfill` for nodejs environments",
      );
    }
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
      await Promise.allSettled(this.pool.publish(this.relayUrls, event));
    } catch (error) {
      console.error("failed to publish wallet service info event", error);
      throw error;
    }
  }

  async subscribe(
    keypair: NWCWalletServiceKeyPair,
    handler: NWCWalletServiceRequestHandler,
  ): Promise<() => void> {
    console.info("checking connection to relay");
    await this._checkConnected();

    console.info("subscribing to relay");
    const sub = this.pool.subscribe(
      this.relayUrls,

      {
        kinds: [23194],
        authors: [keypair.clientPubkey],
        "#p": [keypair.walletPubkey],
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
              // TODO: handle multi_* methods
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
              tags: [["e", event.id]],
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

            // Tries to publish, but ignores failures if relay is dead
            Promise.allSettled(
              this.pool.publish(this.relayUrls, responseEvent),
            );
          } catch (e) {
            console.error("Failed to parse decrypted event content", e);
            return;
          }
        },
        onclose: (reasons) => {
          console.warn("Subscription closed:", reasons);
        },
      },
    );

    return () => {
      sub?.close();
    };
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
    // console.info("encrypting with" + encryptionType);
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
    // console.info("decrypting with" + encryptionType);
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
