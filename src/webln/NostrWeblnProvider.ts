import { generatePrivateKey, Relay, Event, UnsignedEvent } from "nostr-tools";
import {
  GetBalanceResponse,
  KeysendArgs,
  RequestInvoiceArgs,
  SendPaymentResponse,
  SignMessageResponse,
  WebLNNode,
  WebLNProvider,
  WebLNRequestMethod,
  LookupInvoiceArgs,
  LookupInvoiceResponse,
  WebLNMethod,
  MakeInvoiceResponse,
} from "@webbtc/webln-types";
import { GetInfoResponse } from "@webbtc/webln-types";
import { NWCAuthorizationUrlOptions } from "../types";
import {
  NWCClient,
  NWCOptions,
  NewNWCClientOptions,
  Nip47Method,
  Nip47PayKeysendRequest,
  Nip47Transaction,
} from "../NWCClient";

// TODO: review fields (replace with camelCase)
// TODO: consider move to webln-types package
export type Transaction = Nip47Transaction;

// TODO: consider moving to webln-types package
export type ListTransactionsResponse = {
  transactions: Transaction[];
};

// TODO: consider moving to webln-types package
export type ListTransactionsArgs = {
  from?: number;
  until?: number;
  limit?: number;
  offset?: number;
  unpaid?: boolean;
  type?: "incoming" | "outgoing";
};

// TODO: consider moving to webln-types package
export type SendMultiPaymentResponse = {
  payments: ({ paymentRequest: string } & SendPaymentResponse)[];
  errors: { paymentRequest: string; message: string }[];
};

// TODO: consider moving to webln-types package
export type MultiKeysendResponse = {
  keysends: ({ keysend: KeysendArgs } & SendPaymentResponse)[];
  errors: { keysend: KeysendArgs; message: string }[];
};

type NostrWebLNOptions = NWCOptions;

type Nip07Provider = {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<Event>;
};

const nip47ToWeblnRequestMap: Record<Nip47Method, WebLNMethod> = {
  get_info: "getInfo",
  get_balance: "getBalance",
  make_invoice: "makeInvoice",
  pay_invoice: "sendPayment",
  pay_keysend: "payKeysend",
  lookup_invoice: "lookupInvoice",
  list_transactions: "listTransactions",
  multi_pay_invoice: "sendMultiPayment",
  multi_pay_keysend: "multiKeysend",
  sign_message: "signMessage",
  notifications: "notifications",
};

export class NostrWebLNProvider implements WebLNProvider, Nip07Provider {
  private _enabled = false;
  readonly client: NWCClient;
  readonly subscribers: Record<string, (payload: unknown) => void>;

  /**
   * @deprecated please use client.relay. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  get relay(): Relay {
    console.warn("relay is deprecated. Please use client.relay instead.");
    return this.client.relay;
  }
  /**
   * @deprecated please use client.relayUrl. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  get relayUrl(): string {
    console.warn("relayUrl is deprecated. Please use client.relayUrl instead.");
    return this.client.relayUrl;
  }
  /**
   * @deprecated please use client.walletPubkey. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  get walletPubkey(): string {
    console.warn(
      "walletPubkey is deprecated. Please use client.walletPubkey instead.",
    );
    return this.client.walletPubkey;
  }
  get options(): NostrWebLNOptions {
    return this.client.options;
  }
  /**
   * @deprecated please use client.secret. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  get secret(): string | undefined {
    console.warn("secret is deprecated. Please use client.secret instead.");
    return this.client.secret;
  }

  static withNewSecret(
    options?: ConstructorParameters<typeof NostrWebLNProvider>[0],
  ) {
    options = options || {};
    options.secret = generatePrivateKey();
    return new NostrWebLNProvider(options);
  }

  constructor(options?: NewNWCClientOptions) {
    this.client = new NWCClient(options);

    this.subscribers = {};
  }

  on(name: string, callback: () => void) {
    this.subscribers[name] = callback;
  }

  notify(name: WebLNMethod, payload?: unknown) {
    const callback = this.subscribers[name];
    if (callback) {
      callback(payload);
    }
  }

  /**
   * @deprecated please use client.getNostrWalletConnectUrl. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  getNostrWalletConnectUrl(includeSecret = true) {
    console.warn(
      "getNostrWalletConnectUrl is deprecated. Please use client.getNostrWalletConnectUrl instead.",
    );
    return this.client.getNostrWalletConnectUrl(includeSecret);
  }

  /**
   * @deprecated please use client.nostrWalletConnectUrl. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  get nostrWalletConnectUrl() {
    console.warn(
      "nostrWalletConnectUrl is deprecated. Please use client.nostrWalletConnectUrl instead.",
    );
    return this.client.nostrWalletConnectUrl;
  }

  /**
   * @deprecated please use client.connected. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  get connected() {
    console.warn(
      "connected is deprecated. Please use client.connected instead.",
    );
    return this.client.connected;
  }

  /**
   * @deprecated please use getPublicKey(). Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  get publicKey() {
    console.warn(
      "publicKey is deprecated. Please use client.publicKey instead.",
    );
    return this.client.publicKey;
  }

  getPublicKey(): Promise<string> {
    return this.client.getPublicKey();
  }

  signEvent(event: UnsignedEvent): Promise<Event> {
    return this.client.signEvent(event);
  }

  /**
   * @deprecated please use client.getEventHash. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  getEventHash(event: Event) {
    console.warn(
      "getEventHash is deprecated. Please use client.getEventHash instead.",
    );
    return this.client.getEventHash(event);
  }

  async enable() {
    this._enabled = true;
  }

  close() {
    return this.client.close();
  }

  /**
   * @deprecated please use client.encrypt. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  async encrypt(pubkey: string, content: string) {
    console.warn("encrypt is deprecated. Please use client.encrypt instead.");
    return this.client.encrypt(pubkey, content);
  }

  /**
   * @deprecated please use client.decrypt. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  async decrypt(pubkey: string, content: string) {
    console.warn("decrypt is deprecated. Please use client.decrypt instead.");
    return this.client.decrypt(pubkey, content);
  }

  /**
   * @deprecated please use client.getAuthorizationUrl. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  getAuthorizationUrl(options?: NWCAuthorizationUrlOptions) {
    console.warn(
      "getAuthorizationUrl is deprecated. Please use client.getAuthorizationUrl instead.",
    );
    return this.client.getAuthorizationUrl(options);
  }

  /**
   * @deprecated please use client.initNWC. Deprecated since v3.2.3. Will be removed in v4.0.0.
   */
  initNWC(options: NWCAuthorizationUrlOptions = {}) {
    console.warn("initNWC is deprecated. Please use client.initNWC instead.");
    return this.client.initNWC(options);
  }

  async getInfo(): Promise<GetInfoResponse> {
    await this.checkEnabled();

    const supports = ["lightning", "nostr"];
    const version = "Alby JS SDK";

    try {
      const nip47Result = await this.client.getInfo();

      const result = {
        methods: nip47Result.methods.map(
          (key) =>
            nip47ToWeblnRequestMap[key as keyof typeof nip47ToWeblnRequestMap],
        ),
        node: {
          alias: nip47Result.alias,
          pubkey: nip47Result.pubkey,
          color: nip47Result.color,
        } as WebLNNode,
        supports,
        version,
      };

      this.notify("getInfo", result);
      return result;
    } catch (error) {
      console.error("Using minimal getInfo", error);
      return {
        methods: ["sendPayment"],
        node: {} as WebLNNode,
        supports,
        version,
      };
    }
  }

  async getBalance(): Promise<GetBalanceResponse> {
    await this.checkEnabled();
    const nip47Result = await this.client.getBalance();

    const result = {
      // NWC uses msats - convert to sats for webln
      balance: Math.floor(nip47Result.balance / 1000),
      currency: "sats",
    };
    this.notify("getBalance", result);
    return result;
  }

  async sendPayment(invoice: string): Promise<SendPaymentResponse> {
    await this.checkEnabled();

    const nip47Result = await this.client.payInvoice({ invoice });

    const result: SendPaymentResponse = { preimage: nip47Result.preimage };
    this.notify("sendPayment", result);

    return result;
  }

  async sendPaymentAsync(invoice: string): Promise<Record<string, never>> {
    await this.checkEnabled();

    // don't wait for the response'
    this.client.payInvoice({ invoice });

    this.notify("sendPaymentAsync", {});

    return {};
  }

  async keysend(args: KeysendArgs): Promise<SendPaymentResponse> {
    await this.checkEnabled();

    const nip47Result: SendPaymentResponse = await this.client.payKeysend(
      mapKeysendToNip47Keysend(args),
    );

    const result: SendPaymentResponse = { preimage: nip47Result.preimage };
    this.notify("keysend", result);

    return result;
  }

  async signMessage(message: string): Promise<SignMessageResponse> {
    await this.checkEnabled();

    const nip47Result = await this.client.signMessage({
      message,
    });

    const result: SignMessageResponse = {
      message: nip47Result.message,
      signature: nip47Result.signature,
    };
    this.notify("keysend", result);

    return result;
  }

  async makeInvoice(
    args: string | number | RequestInvoiceArgs,
  ): Promise<MakeInvoiceResponse> {
    await this.checkEnabled();

    const requestInvoiceArgs: RequestInvoiceArgs | undefined =
      typeof args === "object" ? (args as RequestInvoiceArgs) : undefined;
    const amount = +(requestInvoiceArgs?.amount ?? (args as string | number));

    if (!amount) {
      throw new Error("No amount specified");
    }

    const nip47Result = await this.client.makeInvoice({
      amount: amount * 1000, // NIP-47 uses msat
      description: requestInvoiceArgs?.defaultMemo,
      // TODO: support additional fields below
      //expiry: 86500,
      //description_hash: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
    });

    const result: MakeInvoiceResponse = { paymentRequest: nip47Result.invoice };

    this.notify("makeInvoice", result);

    return result;
  }

  async lookupInvoice(args: LookupInvoiceArgs): Promise<LookupInvoiceResponse> {
    await this.checkEnabled();

    const nip47Result = await this.client.lookupInvoice({
      invoice: args.paymentRequest,
      payment_hash: args.paymentHash,
    });

    const result: LookupInvoiceResponse = {
      preimage: nip47Result.preimage,
      paymentRequest: nip47Result.invoice,
      paid: !!nip47Result.settled_at,
    };

    this.notify("lookupInvoice", result);

    return result;
  }

  async listTransactions(
    args: ListTransactionsArgs,
  ): Promise<ListTransactionsResponse> {
    await this.checkEnabled();

    const nip47Result = await this.client.listTransactions(args);

    const result: ListTransactionsResponse = {
      transactions: nip47Result.transactions.map(
        mapNip47TransactionToTransaction,
      ),
    };

    this.notify("listTransactions", result);

    return result;
  }

  // NOTE: this method may change - it has not been proposed to be added to the WebLN spec yet.
  async sendMultiPayment(
    paymentRequests: string[],
  ): Promise<SendMultiPaymentResponse> {
    await this.checkEnabled();

    const nip47Result = await this.client.multiPayInvoice({
      invoices: paymentRequests.map((paymentRequest, index) => ({
        invoice: paymentRequest,
        id: index.toString(),
      })),
    });

    const result = {
      payments: nip47Result.invoices.map((invoice) => {
        const paymentRequest = paymentRequests[parseInt(invoice.dTag)];
        if (!paymentRequest) {
          throw new Error(
            "Could not find paymentRequest matching response d tag",
          );
        }
        return {
          paymentRequest,
          preimage: invoice.preimage,
        };
      }),
      // TODO: error handling
      errors: [],
    };
    this.notify("sendMultiPayment", result);
    return result;
  }

  // NOTE: this method may change - it has not been proposed to be added to the WebLN spec yet.
  async multiKeysend(keysends: KeysendArgs[]): Promise<MultiKeysendResponse> {
    await this.checkEnabled();

    const nip47Result = await this.client.multiPayKeysend({
      keysends: keysends.map((keysend, index) => ({
        ...mapKeysendToNip47Keysend(keysend),
        id: index.toString(),
      })),
    });

    const result: MultiKeysendResponse = {
      keysends: nip47Result.keysends.map((result) => {
        const keysend = keysends[parseInt(result.dTag)];
        if (!keysend) {
          throw new Error("Could not find keysend matching response d tag");
        }
        return {
          keysend,
          preimage: result.preimage,
        };
      }),
      // TODO: error handling
      errors: [],
    };

    this.notify("multiKeysend", result);
    return result;
  }

  // not-yet implemented WebLN interface methods
  lnurl(
    lnurl: string,
  ): Promise<{ status: "OK" } | { status: "ERROR"; reason: string }> {
    throw new Error("Method not implemented.");
  }

  request(method: WebLNRequestMethod, args?: unknown): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
  verifyMessage(signature: string, message: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private async checkEnabled() {
    if (!this._enabled) {
      throw new Error(
        "please call enable() and await the promise before calling this function",
      );
    }
  }
}
function mapNip47TransactionToTransaction(
  transaction: Nip47Transaction,
): Transaction {
  return {
    ...transaction,
    // NWC uses msats - convert to sats for webln
    amount: Math.floor(transaction.amount / 1000),
    fees_paid: transaction.fees_paid
      ? Math.floor(transaction.fees_paid / 1000)
      : 0,
  };
}

function mapKeysendToNip47Keysend(args: KeysendArgs): Nip47PayKeysendRequest {
  return {
    amount: +args.amount * 1000, // NIP-47 uses msat
    pubkey: args.destination,
    tlv_records: args.customRecords
      ? Object.entries(args.customRecords).map((v) => ({
          type: parseInt(v[0]),
          value: v[1],
        }))
      : [],
    // TODO: support optional preimage
    // preimage?: "123",
  };
}

export const NWC = NostrWebLNProvider;
