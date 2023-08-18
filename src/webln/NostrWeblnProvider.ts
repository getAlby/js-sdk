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
  Kind,
} from "nostr-tools";
import {
  KeysendArgs,
  RequestInvoiceArgs,
  RequestInvoiceResponse,
  RequestMethod,
  SendPaymentResponse,
  SignMessageResponse,
  WebLNNode,
  WebLNProvider,
} from "@webbtc/webln-types";
import { GetInfoResponse } from "@webbtc/webln-types";
import { GetNWCAuthorizationUrlOptions } from "../types";

const NWCs: Record<string, NostrWebLNOptions> = {
  alby: {
    authorizationUrl: "https://nwc.getalby.com/apps/new",
    relayUrl: "wss://relay.getalby.com/v1",
    walletPubkey:
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
  },
};

// TODO: fetch this from @webbtc/webln-types
interface GetBalanceResponse {
  balance: number;
  max_amount?: number;
  budget_renewal?: string;
}

interface NostrWebLNOptions {
  authorizationUrl?: string; // the URL to the NWC interface for the user to confirm the session
  relayUrl: string;
  walletPubkey: string;
  secret?: string;
}

type Nip07Provider = {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<Event>;
};

export class NostrWebLNProvider implements WebLNProvider, Nip07Provider {
  relay: Relay;
  relayUrl: string;
  secret: string | undefined;
  walletPubkey: string;
  options: NostrWebLNOptions;
  subscribers: Record<string, (payload: any) => void>;

  static parseWalletConnectUrl(walletConnectUrl: string) {
    walletConnectUrl = walletConnectUrl
      .replace("nostrwalletconnect://", "http://")
      .replace("nostr+walletconnect://", "http://"); // makes it possible to parse with URL in the different environments (browser/node/...)
    const url = new URL(walletConnectUrl);
    const options = {} as NostrWebLNOptions;
    options.walletPubkey = url.host;
    const secret = url.searchParams.get("secret");
    const relayUrl = url.searchParams.get("relay");
    if (secret) {
      options.secret = secret;
    }
    if (relayUrl) {
      options.relayUrl = relayUrl;
    }
    return options;
  }

  static withNewSecret(
    options?: ConstructorParameters<typeof NostrWebLNProvider>[0],
  ) {
    options = options || {};
    options.secret = generatePrivateKey();
    return new NostrWebLNProvider(options);
  }

  constructor(options?: {
    providerName?: string;
    authorizationUrl?: string;
    relayUrl?: string;
    secret?: string;
    walletPubkey?: string;
    nostrWalletConnectUrl?: string;
  }) {
    if (options && options.nostrWalletConnectUrl) {
      options = {
        ...NostrWebLNProvider.parseWalletConnectUrl(
          options.nostrWalletConnectUrl,
        ),
        ...options,
      };
    }
    const providerOptions = NWCs[
      options?.providerName || "alby"
    ] as NostrWebLNOptions;
    this.options = {
      ...providerOptions,
      ...(options || {}),
    } as NostrWebLNOptions;
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
    this.subscribers = {};

    // @ts-ignore
    if (globalThis.WebSocket === undefined) {
      console.error(
        "WebSocket is undefined. Make sure to `import websocket-polyfill` for nodejs environments",
      );
    }
  }

  on(name: string, callback: () => void) {
    this.subscribers[name] = callback;
  }

  notify(name: string, payload?: any) {
    const callback = this.subscribers[name];
    if (callback) {
      callback(payload);
    }
  }

  getNostrWalletConnectUrl(includeSecret = true) {
    let url = `nostr+walletconnect://${this.walletPubkey}?relay=${this.relayUrl}&pubkey=${this.publicKey}`;
    if (includeSecret) {
      url = `${url}&secret=${this.secret}`;
    }
    return url;
  }

  get nostrWalletConnectUrl() {
    return this.getNostrWalletConnectUrl();
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

  async enable() {
    if (this.connected) {
      return Promise.resolve();
    }
    await this.relay.connect();
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

  // WebLN compatible response
  // TODO: use NIP-47 get_info call
  async getInfo(): Promise<GetInfoResponse> {
    return {
      methods: ["getInfo", "sendPayment", "addinvoice", "getBalance"],
      node: {} as WebLNNode,
      supports: ["lightning"],
      version: "NWC",
    };
  }

  // TODO: refactor code in getBalance and sendPayment
  getBalance(): Promise<GetBalanceResponse> {
    this.checkConnected();

    // FIXME: add getBalance to webln-types
    return this.executeNip47Request(
      "get_balance",
      "getBalance" as RequestMethod,
      undefined,
      (result) => result.balance !== undefined,
      (result) => result,
    );
  }

  sendPayment(invoice: string) {
    this.checkConnected();

    return this.executeNip47Request<SendPaymentResponse>(
      "pay_invoice",
      "sendPayment",
      {
        invoice,
      },
      (result) => !!result.preimage,
      (result) => ({ preimage: result.preimage }),
    );
  }

  // not-yet implemented WebLN interface methods
  keysend(args: KeysendArgs): Promise<SendPaymentResponse> {
    throw new Error("Method not implemented.");
  }
  lnurl(
    lnurl: string,
  ): Promise<{ status: "OK" } | { status: "ERROR"; reason: string }> {
    throw new Error("Method not implemented.");
  }
  makeInvoice(args: string | number | RequestInvoiceArgs) {
    this.checkConnected();

    const requestInvoiceArgs: RequestInvoiceArgs | undefined =
      typeof args === "object" ? (args as RequestInvoiceArgs) : undefined;
    const amount =
      requestInvoiceArgs?.amount ??
      (typeof args === "string" ? parseInt(args) : (args as number));

    if (!amount) {
      throw new Error("No amount specified");
    }

    return this.executeNip47Request<RequestInvoiceResponse>(
      "make_invoice",
      "addinvoice",
      {
        amount,
        description: requestInvoiceArgs?.defaultMemo,
        // TODO: description hash and expiry?
      },
      (result) => !!result.invoice,
      (result) => ({ paymentRequest: result.invoice }),
    );
  }
  request(method: RequestMethod, args?: unknown): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
  signMessage(message: string): Promise<SignMessageResponse> {
    throw new Error("Method not implemented.");
  }
  verifyMessage(signature: string, message: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getAuthorizationUrl(options?: GetNWCAuthorizationUrlOptions) {
    if (!this.options.authorizationUrl) {
      throw new Error("Missing authorizationUrl option");
    }
    const url = new URL(this.options.authorizationUrl);
    if (options?.name) {
      url.searchParams.set("c", options?.name);
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

    return url;
  }

  initNWC(options: GetNWCAuthorizationUrlOptions = {}) {
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

      const onMessage = (message: { data: any; origin: string }) => {
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

  private checkConnected() {
    if (!this.connected) {
      throw new Error(
        "please call enable() and await the promise before calling this function",
      );
    }
  }

  private executeNip47Request<T>(
    method: string,
    weblnRequestMethod: RequestMethod,
    params: any,
    resultValidator: (result: any) => boolean,
    resultMapper: (result: any) => any,
  ) {
    return new Promise<T>(async (resolve, reject) => {
      const command = {
        method,
        params,
      };
      const encryptedCommand = await this.encrypt(
        this.walletPubkey,
        JSON.stringify(command),
      );
      const unsignedEvent: UnsignedEvent = {
        kind: 23194 as Kind,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", this.walletPubkey]],
        content: encryptedCommand,
        pubkey: this.publicKey,
      };

      const event = await this.signEvent(unsignedEvent);
      // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
      // that reference the request event (NIP_47_REQUEST_KIND)
      let sub = this.relay.sub([
        {
          kinds: [23195],
          authors: [this.walletPubkey],
          "#e": [event.id],
        },
      ]);

      function replyTimeout() {
        sub.unsub();
        //console.error(`Reply timeout: event ${event.id} `);
        reject({ error: `reply timeout: event ${event.id}`, code: "INTERNAL" });
      }

      let replyTimeoutCheck = setTimeout(replyTimeout, 60000);

      sub.on("event", async (event) => {
        //console.log(`Received reply event: `, event);
        clearTimeout(replyTimeoutCheck);
        sub.unsub();
        const decryptedContent = await this.decrypt(
          this.walletPubkey,
          event.content,
        );
        let response;
        try {
          response = JSON.parse(decryptedContent);
        } catch (e) {
          reject({ error: "invalid response", code: "INTERNAL" });
          return;
        }
        // @ts-ignore // event is still unknown in nostr-tools
        if (event.kind == 23195 && response.result) {
          if (resultValidator(response.result)) {
            resolve(resultMapper(response.result));
            this.notify(weblnRequestMethod, response.result);
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

      let pub = this.relay.publish(event);

      function publishTimeout() {
        //console.error(`Publish timeout: event ${event.id}`);
        reject({ error: `Publish timeout: event ${event.id}` });
      }
      let publishTimeoutCheck = setTimeout(publishTimeout, 5000);

      pub.on("failed", (reason: unknown) => {
        //console.debug(`failed to publish to ${this.relay.url}: ${reason}`)
        clearTimeout(publishTimeoutCheck);
        reject({ error: `Failed to publish request: ${reason}` });
      });

      pub.on("ok", () => {
        //console.debug(`Event ${event.id} for ${invoice} published`);
        clearTimeout(publishTimeoutCheck);
      });
    });
  }
}

export const NWC = NostrWebLNProvider;
