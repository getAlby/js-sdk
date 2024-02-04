import {
  nip04,
  relayInit,
  getEventHash,
  nip19,
  generatePrivateKey,
  getPublicKey,
  Relay,
  Event,
  UnsignedEvent,
  finishEvent,
} from "nostr-tools";
import { NWCAuthorizationUrlOptions } from "./types";

type WithDTag = {
  dTag: string;
};

type WithOptionalId = {
  id?: string;
};

type Nip47SingleMethod =
  | "get_info"
  | "get_balance"
  | "make_invoice"
  | "pay_invoice"
  | "pay_keysend"
  | "lookup_invoice"
  | "list_transactions";

type Nip47MultiMethod = "multi_pay_invoice" | "multi_pay_keysend";

export type Nip47Method = Nip47SingleMethod | Nip47MultiMethod;

export type Nip47GetInfoResponse = {
  alias: string;
  color: string;
  pubkey: string;
  network: string;
  block_height: number;
  block_hash: string;
  methods: string[];
};

export type Nip47GetBalanceResponse = {
  balance: number; // msats
};

export type Nip47PayResponse = {
  preimage: string;
};

export type Nip47MultiPayInvoiceRequest = {
  invoices: (Nip47PayInvoiceRequest & WithOptionalId)[];
};

export type Nip47MultiPayKeysendRequest = {
  keysends: (Nip47PayKeysendRequest & WithOptionalId)[];
};

export type Nip47MultiPayInvoiceResponse = {
  invoices: ({ invoice: Nip47PayInvoiceRequest } & Nip47PayResponse &
    WithDTag)[];
  errors: []; // TODO: add error handling
};
export type Nip47MultiPayKeysendResponse = {
  keysends: ({ keysend: Nip47PayKeysendRequest } & Nip47PayResponse &
    WithDTag)[];
  errors: []; // TODO: add error handling
};

export interface Nip47ListTransactionsArgs {
  from?: number;
  until?: number;
  limit?: number;
  offset?: number;
  unpaid?: boolean;
  type?: "incoming" | "outgoing";
}

export type Nip47ListTransactionsResponse = {
  transactions: Nip47Transaction[];
};

export type Nip47Transaction = {
  type: string;
  invoice: string;
  description: string;
  description_hash: string;
  preimage: string;
  payment_hash: string;
  amount: number;
  fees_paid: number;
  settled_at: number;
  created_at: number;
  expires_at: number;
  metadata?: Record<string, unknown>;
};

export type Nip47PayInvoiceRequest = {
  invoice: string;
  amount?: number; // msats
};

export type Nip47PayKeysendRequest = {
  amount: number; //msat
  pubkey: string;
  preimage?: string;
  tlv_records?: { type: number; value: string }[];
};

export type Nip47MakeInvoiceRequest = {
  amount: number; //msat
  description?: string;
  description_hash?: string;
  expiry?: number; // in seconds
};

export type Nip47LookupInvoiceRequest = {
  payment_hash?: string;
  invoice?: string;
};

export interface NWCOptions {
  authorizationUrl?: string; // the URL to the NWC interface for the user to confirm the session
  relayUrl: string;
  walletPubkey: string;
  secret?: string;
}

export const NWCs: Record<string, NWCOptions> = {
  alby: {
    authorizationUrl: "https://nwc.getalby.com/apps/new",
    relayUrl: "wss://relay.getalby.com/v1",
    walletPubkey:
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
  },
};

export type NewNWCClientOptions = {
  providerName?: string;
  authorizationUrl?: string;
  relayUrl?: string;
  secret?: string;
  walletPubkey?: string;
  nostrWalletConnectUrl?: string;
};

export class NWCClient {
  relay: Relay;
  relayUrl: string;
  secret: string | undefined;
  walletPubkey: string;
  options: NWCOptions;

  static parseWalletConnectUrl(walletConnectUrl: string): NWCOptions {
    walletConnectUrl = walletConnectUrl
      .replace("nostrwalletconnect://", "http://")
      .replace("nostr+walletconnect://", "http://"); // makes it possible to parse with URL in the different environments (browser/node/...)
    const url = new URL(walletConnectUrl);
    const relayUrl = url.searchParams.get("relay");
    if (!relayUrl) {
      throw new Error("No relay URL found in connection string");
    }

    const options: NWCOptions = {
      walletPubkey: url.host,
      relayUrl,
    };
    const secret = url.searchParams.get("secret");
    if (secret) {
      options.secret = secret;
    }
    return options;
  }

  static withNewSecret(options?: ConstructorParameters<typeof NWCClient>[0]) {
    options = options || {};
    options.secret = generatePrivateKey();
    return new NWCClient(options);
  }

  constructor(options?: NewNWCClientOptions) {
    if (options && options.nostrWalletConnectUrl) {
      options = {
        ...NWCClient.parseWalletConnectUrl(options.nostrWalletConnectUrl),
        ...options,
      };
    }
    const providerOptions = NWCs[options?.providerName || "alby"] as NWCOptions;
    this.options = {
      ...providerOptions,
      ...(options || {}),
    } as NWCOptions;

    this.relayUrl = this.options.relayUrl;
    this.relay = relayInit(this.relayUrl);
    if (this.options.secret) {
      this.secret = (
        this.options.secret.toLowerCase().startsWith("nsec")
          ? nip19.decode(this.options.secret).data
          : this.options.secret
      ) as string;
    }
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
    let url = `nostr+walletconnect://${this.walletPubkey}?relay=${this.relayUrl}&pubkey=${this.publicKey}`;
    if (includeSecret) {
      url = `${url}&secret=${this.secret}`;
    }
    return url;
  }

  get connected() {
    return this.relay.status === 1;
  }

  get publicKey() {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }
    return getPublicKey(this.secret);
  }

  getPublicKey(): Promise<string> {
    return Promise.resolve(this.publicKey);
  }

  signEvent(event: UnsignedEvent): Promise<Event> {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }

    return Promise.resolve(finishEvent(event, this.secret));
  }

  getEventHash(event: Event) {
    return getEventHash(event);
  }

  close() {
    return this.relay.close();
  }

  async encrypt(pubkey: string, content: string) {
    if (!this.secret) {
      throw new Error("Missing secret");
    }
    const encrypted = await nip04.encrypt(this.secret, pubkey, content);
    return encrypted;
  }

  async decrypt(pubkey: string, content: string) {
    if (!this.secret) {
      throw new Error("Missing secret");
    }
    const decrypted = await nip04.decrypt(this.secret, pubkey, content);
    return decrypted;
  }

  getAuthorizationUrl(options?: NWCAuthorizationUrlOptions): URL {
    if (!this.options.authorizationUrl) {
      throw new Error("Missing authorizationUrl option");
    }
    const url = new URL(this.options.authorizationUrl);
    if (options?.name) {
      url.searchParams.set("name", options?.name);
    }
    url.searchParams.set("pubkey", this.publicKey);
    if (options?.returnTo) {
      url.searchParams.set("return_to", options.returnTo);
    }

    if (options?.budgetRenewal) {
      url.searchParams.set("budget_renewal", options.budgetRenewal);
    }
    if (options?.expiresAt) {
      url.searchParams.set(
        "expires_at",
        Math.floor(options.expiresAt.getTime() / 1000).toString(),
      );
    }
    if (options?.maxAmount) {
      url.searchParams.set("max_amount", options.maxAmount.toString());
    }
    if (options?.editable !== undefined) {
      url.searchParams.set("editable", options.editable.toString());
    }

    if (options?.requestMethods) {
      url.searchParams.set("request_methods", options.requestMethods.join(" "));
    }

    return url;
  }

  initNWC(options: NWCAuthorizationUrlOptions = {}) {
    // here we assume an browser context and window/document is available
    // we set the location.host as a default name if none is given
    if (!options.name) {
      options.name = document.location.host;
    }
    const url = this.getAuthorizationUrl(options);
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
        reject();
        return;
      } // only for TS?

      const checkForPopup = () => {
        if (popup && popup.closed) {
          reject();
          clearInterval(popupChecker);
          window.removeEventListener("message", onMessage);
        }
      };

      const onMessage = (message: {
        data?: { type: "nwc:success" | unknown };
        origin: string;
      }) => {
        const data = message.data;
        if (
          data &&
          data.type === "nwc:success" &&
          message.origin === `${url.protocol}//${url.host}`
        ) {
          resolve(data);
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

  async getInfo(): Promise<Nip47GetInfoResponse> {
    try {
      const result = await this.executeNip47Request<Nip47GetInfoResponse>(
        "get_info",
        undefined,
        (result) => !!result.methods,
      );
      return result;
    } catch (error) {
      console.error("Failed to request get_info", error);
      throw error;
    }
  }

  async getBalance(): Promise<Nip47GetBalanceResponse> {
    try {
      const result = await this.executeNip47Request<Nip47GetBalanceResponse>(
        "get_balance",
        undefined,
        (result) => result.balance !== undefined,
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
        (result) => !!result.preimage,
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
      console.error("Failed to request multi_pay_keysend", error);
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
    args: Nip47ListTransactionsArgs,
  ): Promise<Nip47ListTransactionsResponse> {
    try {
      // maybe we can tailor the response to our needs
      const result =
        await this.executeNip47Request<Nip47ListTransactionsResponse>(
          "list_transactions",
          args,
          (response) => !!response.transactions,
        );

      return result;
    } catch (error) {
      console.error("Failed to request list_transactions", error);
      throw error;
    }
  }

  private async executeNip47Request<T>(
    nip47Method: Nip47SingleMethod,
    params: unknown,
    resultValidator: (result: T) => boolean,
  ): Promise<T> {
    await this._checkConnected();
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
        const unsignedEvent: UnsignedEvent = {
          kind: 23194,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["p", this.walletPubkey]],
          content: encryptedCommand,
          pubkey: this.publicKey,
        };

        const event = await this.signEvent(unsignedEvent);
        // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
        // that reference the request event (NIP_47_REQUEST_KIND)
        const sub = this.relay.sub([
          {
            kinds: [23195],
            authors: [this.walletPubkey],
            "#e": [event.id],
          },
        ]);

        function replyTimeout() {
          sub.unsub();
          //console.error(`Reply timeout: event ${event.id} `);
          reject({
            error: `reply timeout: event ${event.id}`,
            code: "INTERNAL",
          });
        }

        const replyTimeoutCheck = setTimeout(replyTimeout, 60000);

        sub.on("event", async (event) => {
          // console.log(`Received reply event: `, event);
          clearTimeout(replyTimeoutCheck);
          sub.unsub();
          const decryptedContent = await this.decrypt(
            this.walletPubkey,
            event.content,
          );
          // console.log(`Decrypted content: `, decryptedContent);
          let response;
          try {
            response = JSON.parse(decryptedContent);
          } catch (e) {
            reject({ error: "invalid response", code: "INTERNAL" });
            return;
          }
          if (event.kind == 23195 && response.result) {
            // console.info("NIP-47 result", response.result);
            if (resultValidator(response.result)) {
              resolve(response.result);
            } else {
              reject({
                error:
                  "Response from NWC failed validation: " +
                  JSON.stringify(response.result),
                code: "INTERNAL",
              });
            }
          } else {
            reject({
              error: response.error?.message,
              code: response.error?.code,
            });
          }
        });

        function publishTimeout() {
          //console.error(`Publish timeout: event ${event.id}`);
          reject({ error: `Publish timeout: event ${event.id}` });
        }
        const publishTimeoutCheck = setTimeout(publishTimeout, 5000);

        try {
          await this.relay.publish(event);
          clearTimeout(publishTimeoutCheck);
          //console.debug(`Event ${event.id} for ${invoice} published`);
        } catch (error) {
          //console.error(`Failed to publish to ${this.relay.url}`, error);
          clearTimeout(publishTimeoutCheck);
          reject({ error: `Failed to publish request: ${error}` });
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
  ): Promise<(T & { dTag: string })[]> {
    await this._checkConnected();
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
        const unsignedEvent: UnsignedEvent = {
          kind: 23194,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["p", this.walletPubkey]],
          content: encryptedCommand,
          pubkey: this.publicKey,
        };

        const event = await this.signEvent(unsignedEvent);
        // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
        // that reference the request event (NIP_47_REQUEST_KIND)
        const sub = this.relay.sub([
          {
            kinds: [23195],
            authors: [this.walletPubkey],
            "#e": [event.id],
          },
        ]);

        function replyTimeout() {
          sub.unsub();
          //console.error(`Reply timeout: event ${event.id} `);
          reject({
            error: `reply timeout: event ${event.id}`,
            code: "INTERNAL",
          });
        }

        const replyTimeoutCheck = setTimeout(replyTimeout, 60000);

        sub.on("event", async (event) => {
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
            console.error(e);
            clearTimeout(replyTimeoutCheck);
            sub.unsub();
            reject({ error: "invalid response", code: "INTERNAL" });
            return;
          }
          if (event.kind == 23195 && response.result) {
            // console.info("NIP-47 result", response.result);
            try {
              if (!resultValidator(response.result)) {
                throw new Error(
                  "Response from NWC failed validation: " +
                    JSON.stringify(response.result),
                );
              }
              const dTag = event.tags.find((tag) => tag[0] === "d")?.[1];
              if (dTag === undefined) {
                throw new Error("No d tag found in response event");
              }
              results.push({
                ...response.result,
                dTag,
              });
              if (results.length === numPayments) {
                clearTimeout(replyTimeoutCheck);
                sub.unsub();
                //console.log("Received results", results);
                resolve(results);
              }
            } catch (error) {
              console.error(error);
              clearTimeout(replyTimeoutCheck);
              sub.unsub();
              reject({
                error: (error as Error).message,
                code: "INTERNAL",
              });
            }
          } else {
            clearTimeout(replyTimeoutCheck);
            sub.unsub();
            reject({
              error: response.error?.message,
              code: response.error?.code,
            });
          }
        });

        function publishTimeout() {
          //console.error(`Publish timeout: event ${event.id}`);
          reject({ error: `Publish timeout: event ${event.id}` });
        }
        const publishTimeoutCheck = setTimeout(publishTimeout, 5000);

        try {
          await this.relay.publish(event);
          clearTimeout(publishTimeoutCheck);
          //console.debug(`Event ${event.id} for ${invoice} published`);
        } catch (error) {
          //console.error(`Failed to publish to ${this.relay.url}`, error);
          clearTimeout(publishTimeoutCheck);
          reject({ error: `Failed to publish request: ${error}` });
        }
      })();
    });
  }
  private async _checkConnected() {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }
    await this.relay.connect();
  }
}
