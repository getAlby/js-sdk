import { Invoice, LightningAddress } from "@getalby/lightning-tools";
import { Nip47MakeInvoiceRequest, Nip47PayInvoiceRequest } from "../nwc/types";
import { NewNWCClientOptions, NWCClient } from "../nwc/NWCClient";
import { ReceiveInvoice } from "./ReceiveInvoice";
import { Amount, resolveAmount } from "./Amount";

export type LNClientCredentials = string | NWCClient | NewNWCClientOptions;

/**
 * A simple lightning network client to interact with your lightning wallet
 */
export class LNClient {
  readonly nwcClient: NWCClient;

  /**
   * Create a new LNClient
   * @param credentials credentials to connect to a NWC-based wallet. This can be a NWC connection string e.g. nostr+walletconnect://... or an existing NWC Client. Learn more at https://nwc.dev
   */
  constructor(credentials: LNClientCredentials) {
    if (typeof credentials === "string") {
      this.nwcClient = new NWCClient({
        nostrWalletConnectUrl: credentials,
      });
    } else if (credentials instanceof NWCClient) {
      this.nwcClient = credentials;
    } else {
      this.nwcClient = new NWCClient(credentials);
    }
  }

  /**
   * Make a payment
   * @param recipient a BOLT-11 invoice or lightning address
   * @param amount the amount to pay, only required if paying to a lightning address or the amount is not specified in the BOLT 11 invoice.
   * @param args additional options, e.g. to store metadata on the payment
   * @returns the receipt of the payment, and details of the paid invoice.
   */
  async pay(
    recipient: string,
    amount?: Amount,
    args?: Omit<Nip47PayInvoiceRequest, "invoice" | "amount">,
  ) {
    let invoice = recipient;
    const parsedAmount = amount ? await resolveAmount(amount) : undefined;
    if (invoice.indexOf("@") > -1) {
      if (!parsedAmount) {
        throw new Error(
          "Amount must be provided when paying to a lightning address",
        );
      }
      const ln = new LightningAddress(recipient);
      await ln.fetch();
      const invoiceObj = await ln.requestInvoice({
        satoshi: parsedAmount.satoshi,
        comment: args?.metadata?.comment,
        payerdata: args?.metadata?.payer_data,
      });
      invoice = invoiceObj.paymentRequest;
    }

    const result = await this.nwcClient.payInvoice({
      ...(args || {}),
      invoice,
      amount: parsedAmount?.millisat,
    });
    return {
      ...result,
      invoice: new Invoice({ pr: invoice }),
    };
  }

  /**
   * Request to receive a payment
   * @param amount the amount requested, either in sats (e.g. {satoshi: 21}) or fiat (e.g. new FiatAmount(21, "USD")).
   * @param args additional options, e.g. to set a description on the payment request, or store metadata for the received payment
   * @returns the invoice to be paid, along with methods to easily listen for a payment and act upon it.
   */
  async requestPayment(
    amount: Amount,
    args?: Omit<Nip47MakeInvoiceRequest, "amount">,
  ) {
    const parsedAmount = await resolveAmount(amount);
    const transaction = await this.nwcClient.makeInvoice({
      ...(args || {}),
      amount: parsedAmount.millisat,
    });

    return new ReceiveInvoice(this.nwcClient, transaction);
  }

  close() {
    this.nwcClient.close();
  }
}

export { LNClient as LN };
