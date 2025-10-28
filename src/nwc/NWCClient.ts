import {
  nip04,
  nip19,
  nip44,
  finalizeEvent,
  generateSecretKey,
  getEventHash,
  getPublicKey,
  Event,
  EventTemplate,
  SimplePool,
} from "nostr-tools";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils";
import {
  Nip47EncryptionType,
  Nip47SingleMethod,
  Nip47Method,
  Nip47Capability,
  Nip47GetInfoResponse,
  Nip47GetBudgetResponse,
  Nip47GetBalanceResponse,
  Nip47PayResponse,
  Nip47TimeoutValues,
  Nip47MultiPayInvoiceRequest,
  Nip47MultiPayKeysendRequest,
  Nip47MultiPayInvoiceResponse,
  Nip47MultiPayKeysendResponse,
  Nip47ListTransactionsRequest,
  Nip47ListTransactionsResponse,
  Nip47Transaction,
  Nip47NotificationType,
  Nip47Notification,
  Nip47PayInvoiceRequest,
  Nip47PayKeysendRequest,
  Nip47MakeInvoiceRequest,
  Nip47LookupInvoiceRequest,
  Nip47SignMessageRequest,
  Nip47CreateConnectionRequest,
  Nip47CreateConnectionResponse,
  Nip47SignMessageResponse,
  Nip47PublishError,
  Nip47PublishTimeoutError,
  Nip47ReplyTimeoutError,
  Nip47ResponseDecodingError,
  Nip47ResponseValidationError,
  Nip47UnexpectedResponseError,
  Nip47UnsupportedEncryptionError,
  Nip47WalletError,
  Nip47MultiMethod,
  NWCAuthorizationUrlOptions,
  Nip47MakeHoldInvoiceRequest,
  Nip47SettleHoldInvoiceRequest,
  Nip47SettleHoldInvoiceResponse,
  Nip47CancelHoldInvoiceRequest,
  Nip47CancelHoldInvoiceResponse,
  Nip47NetworkError,
} from "./types";
import { SubCloser } from "nostr-tools/lib/types/abstract-pool";

export interface NWCOptions {
  relayUrls: string[];
  walletPubkey: string;
  secret?: string;
  lud16?: string;
}

export type NewNWCClientOptions = {
  relayUrls?: string[];
  secret?: string;
  walletPubkey?: string;
  nostrWalletConnectUrl?: string;
  lud16?: string;
};

export class NWCClient {
  pool: SimplePool;
  relayUrls: string[];
  secret: string | undefined;
  lud16: string | undefined;
  walletPubkey: string;
  options: NWCOptions;
  private _encryptionType: Nip47EncryptionType | undefined;

  static parseWalletConnectUrl(walletConnectUrl: string): NWCOptions {
    // makes it possible to parse with URL in the different environments (browser/node/...)
    // parses both new and legacy protocols, with or without "//"
    walletConnectUrl = walletConnectUrl
      .replace("nostrwalletconnect://", "http://")
      .replace("nostr+walletconnect://", "http://")
      .replace("nostrwalletconnect:", "http://")
      .replace("nostr+walletconnect:", "http://");
    const url = new URL(walletConnectUrl);
    const relayParams = url.searchParams.getAll("relay");
    if (!relayParams) {
      throw new Error("No relay URL found in connection string");
    }

    const options: NWCOptions = {
      walletPubkey: url.host,
      relayUrls: relayParams,
    };
    const secret = url.searchParams.get("secret");
    if (secret) {
      options.secret = secret;
    }
    const lud16 = url.searchParams.get("lud16");
    if (lud16) {
      options.lud16 = lud16;
    }
    return options;
  }

  constructor(options?: NewNWCClientOptions) {
    if (options && options.nostrWalletConnectUrl) {
      options = {
        ...NWCClient.parseWalletConnectUrl(options.nostrWalletConnectUrl),
        ...options,
      };
    }
    this.options = {
      ...(options || {}),
    } as NWCOptions;

    this.relayUrls = this.options.relayUrls;
    this.pool = new SimplePool({
      // TODO: enableReconnect: true, once nostr-tools is updated
    });
    if (this.options.secret) {
      this.secret = (
        this.options.secret.toLowerCase().startsWith("nsec")
          ? nip19.decode(this.options.secret).data
          : this.options.secret
      ) as string;
    }
    this.lud16 = this.options.lud16;
    this.walletPubkey = (
      this.options.walletPubkey.toLowerCase().startsWith("npub")
        ? nip19.decode(this.options.walletPubkey).data
        : this.options.walletPubkey
    ) as string;
    // this.subscribers = {};

    if (globalThis.WebSocket === undefined) {
      console.error(
        "WebSocket is undefined. Make sure to `import websocket-polyfill` for nodejs environments",
      );
    }
  }

  get nostrWalletConnectUrl() {
    return this.getNostrWalletConnectUrl();
  }

  getNostrWalletConnectUrl(includeSecret = true) {
    let url = `nostr+walletconnect://${this.walletPubkey}?relay=${this.relayUrls.join("&relay=")}&pubkey=${this.publicKey}`;
    if (includeSecret) {
      url = `${url}&secret=${this.secret}`;
    }
    if (this.lud16) {
      url = `${url}&lud16=${this.lud16}`;
    }
    return url;
  }

  get connected() {
    const connectionStatus = Array.from(
      this.pool.listConnectionStatus().values(),
    );
    return !!connectionStatus.length && connectionStatus.includes(true);
  }

  get publicKey() {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }
    return getPublicKey(hexToBytes(this.secret));
  }

  get encryptionType(): string {
    if (!this._encryptionType) {
      throw new Error("Missing encryption or version");
    }
    return this._encryptionType;
  }

  getPublicKey(): Promise<string> {
    return Promise.resolve(this.publicKey);
  }

  signEvent(event: EventTemplate): Promise<Event> {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }

    return Promise.resolve(finalizeEvent(event, hexToBytes(this.secret)));
  }

  getEventHash(event: Event) {
    return getEventHash(event);
  }

  close() {
    return this.pool.close(this.relayUrls);
  }

  async encrypt(pubkey: string, content: string) {
    if (!this.secret) {
      throw new Error("Missing secret");
    }
    let encrypted;
    if (this.encryptionType === "nip04") {
      encrypted = await nip04.encrypt(this.secret, pubkey, content);
    } else {
      const key = nip44.getConversationKey(hexToBytes(this.secret), pubkey);
      encrypted = nip44.encrypt(content, key);
    }
    return encrypted;
  }

  async decrypt(pubkey: string, content: string): Promise<string> {
    if (!this.secret) {
      throw new Error("Missing secret");
    }
    let decrypted;
    if (this.encryptionType === "nip04") {
      decrypted = await nip04.decrypt(this.secret, pubkey, content);
    } else {
      const key = nip44.getConversationKey(hexToBytes(this.secret), pubkey);
      decrypted = nip44.decrypt(content, key);
    }
    return decrypted;
  }

  static getAuthorizationUrl(
    authorizationBasePath: string,
    options: NWCAuthorizationUrlOptions = {},
    pubkey: string,
  ): URL {
    if (authorizationBasePath.indexOf("/#/") > -1) {
      throw new Error("hash router paths not supported");
    }
    const url = new URL(authorizationBasePath);
    if (options.name) {
      url.searchParams.set("name", options.name);
    }
    url.searchParams.set("pubkey", pubkey);
    if (options.returnTo) {
      url.searchParams.set("return_to", options.returnTo);
    }

    if (options.budgetRenewal) {
      url.searchParams.set("budget_renewal", options.budgetRenewal);
    }
    if (options.expiresAt) {
      url.searchParams.set(
        "expires_at",
        Math.floor(options.expiresAt.getTime() / 1000).toString(),
      );
    }
    if (options.maxAmount) {
      url.searchParams.set("max_amount", options.maxAmount.toString());
    }

    if (options.requestMethods) {
      url.searchParams.set("request_methods", options.requestMethods.join(" "));
    }
    if (options.notificationTypes) {
      url.searchParams.set(
        "notification_types",
        options.notificationTypes.join(" "),
      );
    }

    if (options.isolated) {
      url.searchParams.set("isolated", "true");
    }

    if (options.metadata) {
      url.searchParams.set("metadata", JSON.stringify(options.metadata));
    }

    return url;
  }

  /**
   * create a new client-initiated NWC connection via HTTP deeplink
   *
   * @param authorizationBasePath the deeplink path e.g. https://my.albyhub.com/apps/new
   * @param options configure the created app (e.g. the name, budget, expiration)
   * @param secret optionally pass a secret, otherwise one will be generated.
   */
  static fromAuthorizationUrl(
    authorizationBasePath: string,
    options: NWCAuthorizationUrlOptions = {},
    secret?: string,
  ): Promise<NWCClient> {
    secret = secret || bytesToHex(generateSecretKey());

    // here we assume an browser context and window/document is available
    // we set the location.host as a default name if none is given
    if (!options.name) {
      options.name = document.location.host;
    }
    const url = this.getAuthorizationUrl(
      authorizationBasePath,
      options,
      getPublicKey(hexToBytes(secret)),
    );
    const height = 600;
    const width = 400;
    const top = window.outerHeight / 2 + window.screenY - height / 2;
    const left = window.outerWidth / 2 + window.screenX - width / 2;

    return new Promise((resolve, reject) => {
      const popup = window.open(
        url.toString(),
        `${document.title} - Wallet Connect`,
        `height=${height},width=${width},top=${top},left=${left}`,
      );
      if (!popup) {
        reject(new Error("failed to execute window.open"));
        return;
      }

      const checkForPopup = () => {
        if (popup && popup.closed) {
          clearInterval(popupChecker);
          window.removeEventListener("message", onMessage);
          reject(new Error("Popup closed"));
        }
      };

      const onMessage = (message: {
        data?: {
          type: "nwc:success" | unknown;
          relayUrls?: string[];
          relayUrl?: string;
          walletPubkey?: string;
          lud16?: string;
        };
        origin: string;
      }) => {
        const data = message.data;
        if (
          data &&
          data.type === "nwc:success" &&
          message.origin === `${url.protocol}//${url.host}`
        ) {
          if (!data.relayUrls && data.relayUrl) {
            data.relayUrls = [data.relayUrl];
          }
          if (!data.relayUrls) {
            reject(new Error("no relayUrls or relayUrl in response"));
            return;
          }

          if (!data.walletPubkey) {
            reject(new Error("no walletPubkey in response"));
            return;
          }
          resolve(
            new NWCClient({
              relayUrls: data.relayUrls,
              walletPubkey: data.walletPubkey,
              secret,
              lud16: data.lud16,
            }),
          );
          clearInterval(popupChecker);
          window.removeEventListener("message", onMessage);
          if (popup) {
            popup.close(); // close the popup
          }
        }
      };
      const popupChecker = setInterval(checkForPopup, 500);
      window.addEventListener("message", onMessage);
    });
  }

  async getWalletServiceInfo(): Promise<{
    encryptions: string[];
    capabilities: Nip47Capability[];
    notifications: Nip47NotificationType[];
  }> {
    await this._checkConnected();
    const events = await new Promise<Event[]>((resolve, reject) => {
      const events: Event[] = [];
      const sub = this.pool.subscribe(
        this.relayUrls,
        {
          kinds: [13194],
          limit: 1,
          authors: [this.walletPubkey],
        },
        {
          eoseTimeout: 10000,
          onevent: (event) => {
            events.push(event);
          },
          oneose: () => {
            sub.close();
            resolve(events);
          },
        },
      );
    });

    if (!events.length) {
      throw new Error("no info event (kind 13194) returned from relay");
    }
    const content = events[0].content;
    const notificationsTag = events[0].tags.find(
      (t) => t[0] === "notifications",
    );
    // TODO: Remove version tag after 01-06-2025
    const versionsTag = events[0].tags.find((t) => t[0] === "v");
    const encryptionTag = events[0].tags.find((t) => t[0] === "encryption");

    let encryptions: string[] = ["nip04" satisfies Nip47EncryptionType];
    // TODO: Remove version tag after 01-06-2025
    if (versionsTag && versionsTag[1].includes("1.0")) {
      encryptions.push("nip44_v2" satisfies Nip47EncryptionType);
    }
    if (encryptionTag) {
      encryptions = encryptionTag[1].split(" ") as Nip47EncryptionType[];
    }
    return {
      encryptions,
      // delimiter is " " per spec, but Alby NWC originally returned ","
      capabilities: content.split(/[ |,]/g) as Nip47Method[],
      notifications: (notificationsTag?.[1]?.split(" ") ||
        []) as Nip47NotificationType[],
    };
  }

  async getInfo(): Promise<Nip47GetInfoResponse> {
    try {
      const result = await this.executeNip47Request<Nip47GetInfoResponse>(
        "get_info",
        {},
        (result) => !!result.methods,
        { replyTimeout: 10000 },
      );
      return result;
    } catch (error) {
      console.error("Failed to request get_info", error);
      throw error;
    }
  }

  async getBudget(): Promise<Nip47GetBudgetResponse> {
    try {
      const result = await this.executeNip47Request<Nip47GetBudgetResponse>(
        "get_budget",
        {},
        (result) => result !== undefined,
        { replyTimeout: 10000 },
      );
      return result;
    } catch (error) {
      console.error("Failed to request get_budget", error);
      throw error;
    }
  }

  async getBalance(): Promise<Nip47GetBalanceResponse> {
    try {
      const result = await this.executeNip47Request<Nip47GetBalanceResponse>(
        "get_balance",
        {},
        (result) => result.balance !== undefined,
        { replyTimeout: 10000 },
      );
      return result;
    } catch (error) {
      console.error("Failed to request get_balance", error);
      throw error;
    }
  }

  async payInvoice(request: Nip47PayInvoiceRequest): Promise<Nip47PayResponse> {
    try {
      const result = await this.executeNip47Request<Nip47PayResponse>(
        "pay_invoice",
        request,
        (result) => !!result,
      );
      return result;
    } catch (error) {
      console.error("Failed to request pay_invoice", error);
      throw error;
    }
  }

  async payKeysend(request: Nip47PayKeysendRequest): Promise<Nip47PayResponse> {
    try {
      const result = await this.executeNip47Request<Nip47PayResponse>(
        "pay_keysend",
        request,
        (result) => !!result.preimage,
      );

      return result;
    } catch (error) {
      console.error("Failed to request pay_keysend", error);
      throw error;
    }
  }

  async signMessage(
    request: Nip47SignMessageRequest,
  ): Promise<Nip47SignMessageResponse> {
    try {
      const result = await this.executeNip47Request<Nip47SignMessageResponse>(
        "sign_message",
        request,
        (result) => result.message === request.message && !!result.signature,
      );

      return result;
    } catch (error) {
      console.error("Failed to request sign_message", error);
      throw error;
    }
  }

  async createConnection(
    request: Nip47CreateConnectionRequest,
  ): Promise<Nip47CreateConnectionResponse> {
    try {
      const result =
        await this.executeNip47Request<Nip47CreateConnectionResponse>(
          "create_connection",
          request,
          (result) => !!result.wallet_pubkey,
        );

      return result;
    } catch (error) {
      console.error("Failed to request create_connection", error);
      throw error;
    }
  }

  async multiPayInvoice(
    request: Nip47MultiPayInvoiceRequest,
  ): Promise<Nip47MultiPayInvoiceResponse> {
    try {
      const results = await this.executeMultiNip47Request<
        { invoice: Nip47PayInvoiceRequest } & Nip47PayResponse
      >(
        "multi_pay_invoice",
        request,
        request.invoices.length,
        (result) => !!result.preimage,
      );

      return {
        invoices: results,
        // TODO: error handling
        errors: [],
      };
    } catch (error) {
      console.error("Failed to request multi_pay_invoice", error);
      throw error;
    }
  }

  async multiPayKeysend(
    request: Nip47MultiPayKeysendRequest,
  ): Promise<Nip47MultiPayKeysendResponse> {
    try {
      const results = await this.executeMultiNip47Request<
        { keysend: Nip47PayKeysendRequest } & Nip47PayResponse
      >(
        "multi_pay_keysend",
        request,
        request.keysends.length,
        (result) => !!result.preimage,
      );

      return {
        keysends: results,
        // TODO: error handling
        errors: [],
      };
    } catch (error) {
      console.error("Failed to request multi_pay_keysend", error);
      throw error;
    }
  }

  async makeInvoice(
    request: Nip47MakeInvoiceRequest,
  ): Promise<Nip47Transaction> {
    try {
      if (!request.amount) {
        throw new Error("No amount specified");
      }

      const result = await this.executeNip47Request<Nip47Transaction>(
        "make_invoice",
        request,
        (result) => !!result.invoice,
      );

      return result;
    } catch (error) {
      console.error("Failed to request make_invoice", error);
      throw error;
    }
  }

  async makeHoldInvoice(
    request: Nip47MakeHoldInvoiceRequest,
  ): Promise<Nip47Transaction> {
    try {
      if (!request.amount) {
        throw new Error("No amount specified");
      }
      if (!request.payment_hash) {
        throw new Error("No payment hash specified");
      }

      const result = await this.executeNip47Request<Nip47Transaction>(
        "make_hold_invoice",
        request,
        (result) => !!result.invoice,
      );

      return result;
    } catch (error) {
      console.error("Failed to request make_hold_invoice", error);
      throw error;
    }
  }

  async settleHoldInvoice(
    request: Nip47SettleHoldInvoiceRequest,
  ): Promise<Nip47SettleHoldInvoiceResponse> {
    try {
      const result = await this.executeNip47Request<Nip47Transaction>(
        "settle_hold_invoice",
        request,
        (result) => !!result,
      );

      return result;
    } catch (error) {
      console.error("Failed to request settle_hold_invoice", error);
      throw error;
    }
  }

  async cancelHoldInvoice(
    request: Nip47CancelHoldInvoiceRequest,
  ): Promise<Nip47CancelHoldInvoiceResponse> {
    try {
      const result = await this.executeNip47Request<Nip47Transaction>(
        "cancel_hold_invoice",
        request,
        (result) => !!result,
      );

      return result;
    } catch (error) {
      console.error("Failed to request cancel_hold_invoice", error);
      throw error;
    }
  }

  async lookupInvoice(
    request: Nip47LookupInvoiceRequest,
  ): Promise<Nip47Transaction> {
    try {
      const result = await this.executeNip47Request<Nip47Transaction>(
        "lookup_invoice",
        request,
        (result) => !!result.invoice,
      );

      return result;
    } catch (error) {
      console.error("Failed to request lookup_invoice", error);
      throw error;
    }
  }

  async listTransactions(
    request: Nip47ListTransactionsRequest,
  ): Promise<Nip47ListTransactionsResponse> {
    try {
      // maybe we can tailor the response to our needs
      const result =
        await this.executeNip47Request<Nip47ListTransactionsResponse>(
          "list_transactions",
          request,
          (response) => !!response.transactions,
          { replyTimeout: 10000 },
        );

      return result;
    } catch (error) {
      console.error("Failed to request list_transactions", error);
      throw error;
    }
  }

  async subscribeNotifications(
    onNotification: (notification: Nip47Notification) => void,
    notificationTypes?: Nip47NotificationType[],
  ): Promise<() => void> {
    let subscribed = true;
    let endPromise: (() => void) | undefined;
    let sub: SubCloser | undefined;
    (async () => {
      while (subscribed) {
        try {
          await this._checkConnected();
          await this._selectEncryptionType();
          console.info("subscribing to relays");
          sub = this.pool.subscribe(
            this.relayUrls,
            {
              kinds: [...(this.encryptionType === "nip04" ? [23196] : [23197])],
              authors: [this.walletPubkey],
              "#p": [this.publicKey],
            },
            {
              onevent: async (event) => {
                let decryptedContent;
                try {
                  decryptedContent = await this.decrypt(
                    this.walletPubkey,
                    event.content,
                  );
                } catch (error) {
                  console.error(
                    "failed to decrypt request event content",
                    error,
                  );
                  return;
                }
                let notification;
                try {
                  notification = JSON.parse(
                    decryptedContent,
                  ) as Nip47Notification;
                } catch (e) {
                  console.error("Failed to parse decrypted event content", e);
                  return;
                }
                if (notification.notification) {
                  if (
                    !notificationTypes ||
                    notificationTypes.indexOf(notification.notification_type) >
                      -1
                  ) {
                    onNotification(notification);
                  }
                } else {
                  console.error("No notification in response", notification);
                }
              },
              onclose: (reasons) => {
                // NOTE: this fires when all relays were closed once. There is no reconnect logic in nostr-tools
                // See https://github.com/nbd-wtf/nostr-tools/issues/513
                console.info("relay connection closed", reasons);
                endPromise?.();
              },
            },
          );
          console.info("subscribed to relays");

          await new Promise<void>((resolve) => {
            endPromise = () => {
              resolve();
            };
          });
        } catch (error) {
          console.error(
            "error subscribing to notifications",
            error || "unknown relay error",
          );
        }
        if (subscribed) {
          // wait a second and try re-connecting
          // any notifications during this period will be lost
          // unless using a relay that keeps events until client reconnect
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    })();

    return () => {
      subscribed = false;
      endPromise?.();
      sub?.close();
    };
  }

  private async executeNip47Request<T>(
    nip47Method: Nip47SingleMethod,
    params: unknown,
    resultValidator: (result: T) => boolean,
    timeoutValues?: Nip47TimeoutValues,
  ): Promise<T> {
    await this._checkConnected();
    await this._selectEncryptionType();

    return new Promise<T>((resolve, reject) => {
      (async () => {
        const command = {
          method: nip47Method,
          params,
        };
        const encryptedCommand = await this.encrypt(
          this.walletPubkey,
          JSON.stringify(command),
        );
        const eventTemplate: EventTemplate = {
          kind: 23194,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["p", this.walletPubkey],
            // TODO: Remove version tag after 01-06-2025
            ["v", this.encryptionType === "nip44_v2" ? "1.0" : "0.0"],
            ["encryption", this.encryptionType],
          ],
          content: encryptedCommand,
        };

        const event = await this.signEvent(eventTemplate);
        // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
        // that reference the request event (NIP_47_REQUEST_KIND)
        const sub = this.pool.subscribe(
          this.relayUrls,
          {
            kinds: [23195],
            authors: [this.walletPubkey],
            "#e": [event.id],
          },
          {
            onevent: async (event) => {
              // console.log(`Received reply event: `, event);
              clearTimeout(replyTimeoutCheck);
              sub.close();
              const decryptedContent = await this.decrypt(
                this.walletPubkey,
                event.content,
              );
              // console.log(`Decrypted content: `, decryptedContent);
              let response;
              try {
                response = JSON.parse(decryptedContent);
              } catch (e) {
                clearTimeout(replyTimeoutCheck);
                sub.close();
                reject(
                  new Nip47ResponseDecodingError(
                    "failed to deserialize response",
                    "INTERNAL",
                  ),
                );
                return;
              }
              if (response.result) {
                // console.info("NIP-47 result", response.result);
                if (resultValidator(response.result)) {
                  resolve(response.result);
                } else {
                  clearTimeout(replyTimeoutCheck);
                  sub.close();
                  reject(
                    new Nip47ResponseValidationError(
                      "response from NWC failed validation: " +
                        JSON.stringify(response.result),
                      "INTERNAL",
                    ),
                  );
                }
              } else {
                clearTimeout(replyTimeoutCheck);
                sub.close();
                // console.error("Wallet error", response.error);
                reject(
                  new Nip47WalletError(
                    response.error?.message || "unknown Error",
                    response.error?.code || "INTERNAL",
                  ),
                );
              }
            },
          },
        );

        function replyTimeout() {
          sub.close();
          //console.error(`Reply timeout: event ${event.id} `);
          reject(
            new Nip47ReplyTimeoutError(
              `reply timeout: event ${event.id}`,
              "INTERNAL",
            ),
          );
        }

        const replyTimeoutCheck = setTimeout(
          replyTimeout,
          timeoutValues?.replyTimeout || 60000,
        );

        function publishTimeout() {
          sub.close();
          //console.error(`Publish timeout: event ${event.id}`);
          reject(
            new Nip47PublishTimeoutError(
              `publish timeout: ${event.id}`,
              "INTERNAL",
            ),
          );
        }
        const publishTimeoutCheck = setTimeout(
          publishTimeout,
          timeoutValues?.publishTimeout || 5000,
        );

        try {
          await Promise.any(this.pool.publish(this.relayUrls, event));
          clearTimeout(publishTimeoutCheck);
          //console.debug(`Event ${event.id} for ${invoice} published`);
        } catch (error) {
          //console.error(`Failed to publish to ${this.relay.url}`, error);
          clearTimeout(publishTimeoutCheck);
          reject(
            new Nip47PublishError(`failed to publish: ${error}`, "INTERNAL"),
          );
        }
      })();
    });
  }

  // TODO: this method currently fails if any payment fails.
  // this could be improved in the future.
  // TODO: reduce duplication between executeNip47Request and executeMultiNip47Request
  private async executeMultiNip47Request<T>(
    nip47Method: Nip47MultiMethod,
    params: unknown,
    numPayments: number,
    resultValidator: (result: T) => boolean,
    timeoutValues?: Nip47TimeoutValues,
  ): Promise<(T & { dTag: string })[]> {
    await this._checkConnected();
    await this._selectEncryptionType();
    const results: (T & { dTag: string })[] = [];
    return new Promise<(T & { dTag: string })[]>((resolve, reject) => {
      (async () => {
        const command = {
          method: nip47Method,
          params,
        };
        const encryptedCommand = await this.encrypt(
          this.walletPubkey,
          JSON.stringify(command),
        );
        const eventTemplate: EventTemplate = {
          kind: 23194,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["p", this.walletPubkey],
            // TODO: Remove version tag after 01-06-2025
            ["v", this.encryptionType === "nip44_v2" ? "1.0" : "0.0"],
            ["encryption", this.encryptionType],
          ],
          content: encryptedCommand,
        };

        const event = await this.signEvent(eventTemplate);
        // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
        // that reference the request event (NIP_47_REQUEST_KIND)
        const sub = this.pool.subscribe(
          this.relayUrls,
          {
            kinds: [23195],
            authors: [this.walletPubkey],
            "#e": [event.id],
          },
          {
            onevent: async (event) => {
              // console.log(`Received reply event: `, event);

              const decryptedContent = await this.decrypt(
                this.walletPubkey,
                event.content,
              );
              // console.log(`Decrypted content: `, decryptedContent);
              let response;
              try {
                response = JSON.parse(decryptedContent);
              } catch (e) {
                // console.error(e);
                clearTimeout(replyTimeoutCheck);
                sub.close();
                reject(
                  new Nip47ResponseDecodingError(
                    "failed to deserialize response",
                    "INTERNAL",
                  ),
                );
              }
              if (response.result) {
                // console.info("NIP-47 result", response.result);
                if (!resultValidator(response.result)) {
                  clearTimeout(replyTimeoutCheck);
                  sub.close();
                  reject(
                    new Nip47ResponseValidationError(
                      "Response from NWC failed validation: " +
                        JSON.stringify(response.result),
                      "INTERNAL",
                    ),
                  );
                  return;
                }
                const dTag = event.tags.find((tag) => tag[0] === "d")?.[1];
                if (dTag === undefined) {
                  clearTimeout(replyTimeoutCheck);
                  sub.close();
                  reject(
                    new Nip47ResponseValidationError(
                      "No d tag found in response event",
                      "INTERNAL",
                    ),
                  );
                  return;
                }
                results.push({
                  ...response.result,
                  dTag,
                });
                if (results.length === numPayments) {
                  clearTimeout(replyTimeoutCheck);
                  sub.close();
                  //console.log("Received results", results);
                  resolve(results);
                }
              } else {
                clearTimeout(replyTimeoutCheck);
                sub.close();
                reject(
                  new Nip47UnexpectedResponseError(
                    response.error?.message,
                    response.error?.code,
                  ),
                );
              }
            },
          },
        );

        function replyTimeout() {
          sub.close();
          //console.error(`Reply timeout: event ${event.id} `);
          reject(
            new Nip47ReplyTimeoutError(
              `reply timeout: event ${event.id}`,
              "INTERNAL",
            ),
          );
        }

        const replyTimeoutCheck = setTimeout(
          replyTimeout,
          timeoutValues?.replyTimeout || 60000,
        );

        function publishTimeout() {
          sub.close();
          //console.error(`Publish timeout: event ${event.id}`);
          reject(
            new Nip47PublishTimeoutError(
              `Publish timeout: ${event.id}`,
              "INTERNAL",
            ),
          );
        }
        const publishTimeoutCheck = setTimeout(
          publishTimeout,
          timeoutValues?.publishTimeout || 5000,
        );

        try {
          await Promise.any(this.pool.publish(this.relayUrls, event));
          clearTimeout(publishTimeoutCheck);
          //console.debug(`Event ${event.id} for ${invoice} published`);
        } catch (error) {
          //console.error(`Failed to publish to ${this.relay.url}`, error);
          clearTimeout(publishTimeoutCheck);
          reject(
            new Nip47PublishError(`Failed to publish: ${error}`, "INTERNAL"),
          );
        }
      })();
    });
  }

  private async _checkConnected() {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }
    if (!this.relayUrls) {
      throw new Error("Missing relay url");
    }
    try {
      await Promise.any(
        this.relayUrls.map((relayUrl) => this.pool.ensureRelay(relayUrl)),
      );
    } catch (error) {
      console.error("failed to connect to any relay", error);
      throw new Nip47NetworkError(
        "Failed to connect to " + this.relayUrls.join(","),
        "OTHER",
      );
    }
  }

  private async _selectEncryptionType() {
    if (!this._encryptionType) {
      const walletServiceInfo = await this.getWalletServiceInfo();
      const encryptionType = this._findPreferredEncryptionType(
        walletServiceInfo.encryptions,
      );
      if (!encryptionType) {
        throw new Nip47UnsupportedEncryptionError(
          `no compatible encryption or version found between wallet and client`,
          "UNSUPPORTED_ENCRYPTION",
        );
      }
      if (encryptionType === "nip04") {
        console.warn(
          "NIP-04 encryption is about to be deprecated. Please upgrade your wallet service to use NIP-44 instead.",
        );
      }
      this._encryptionType = encryptionType;
    }
  }

  private _findPreferredEncryptionType(
    encryptions: string[],
  ): Nip47EncryptionType | null {
    if (encryptions.includes("nip44_v2")) {
      return "nip44_v2";
    }
    if (encryptions.includes("nip04")) {
      return "nip04";
    }
    return null;
  }
}
