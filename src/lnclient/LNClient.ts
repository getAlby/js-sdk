import { fiat, LightningAddress } from "@getalby/lightning-tools";
import { Nip47MakeInvoiceRequest, Nip47PayInvoiceRequest } from "../nwc/types";
import { NewNWCClientOptions, NWCClient } from "../nwc/NWCClient";
import { ReceiveInvoice } from "./ReceiveInvoice";

type LNClientCredentials = string | NWCClient | NewNWCClientOptions;
type FiatAmount = { amount: number; currency: string };

/**
 * An amount in satoshis, or an amount in a fiat currency
 */
type Amount = { satoshi: number } | FiatAmount;

// Most popular fiat currencies
export const USD = (amount: number) =>
  ({ amount, currency: "USD" }) satisfies FiatAmount;
export const EUR = (amount: number) =>
  ({ amount, currency: "EUR" }) satisfies FiatAmount;
export const JPY = (amount: number) =>
  ({ amount, currency: "JPY" }) satisfies FiatAmount;
export const GBP = (amount: number) =>
  ({ amount, currency: "GBP" }) satisfies FiatAmount;
export const CHF = (amount: number) =>
  ({ amount, currency: "CHF" }) satisfies FiatAmount;

export class LNClient {
  readonly nwcClient: NWCClient;

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

  async pay(
    recipient: string,
    amount?: Amount,
    args?: Omit<Nip47PayInvoiceRequest, "invoice" | "amount">,
  ) {
    let invoice = recipient;
    const parsedAmount = amount ? await parseAmount(amount) : undefined;
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
      });
      invoice = invoiceObj.paymentRequest;
    }

    return this.nwcClient.payInvoice({
      ...(args || {}),
      invoice,
      amount: parsedAmount?.millisat,
    });
  }

  async receive(
    amount: Amount,
    args?: Omit<Nip47MakeInvoiceRequest, "amount">,
  ) {
    const parsedAmount = await parseAmount(amount);
    const transaction = await this.nwcClient.makeInvoice({
      ...(args || {}),
      amount: parsedAmount.millisat,
    });

    return new ReceiveInvoice(this.nwcClient, transaction);
  }

  close() {
    this.nwcClient.close();
  }

  // TODO: proxy everything from NWCClient
}

export { LNClient as LN };

async function parseAmount(amount: Amount) {
  let parsedAmount = 0;
  if ("satoshi" in amount) {
    parsedAmount = amount.satoshi;
  } else {
    parsedAmount = await fiat.getSatoshiValue({
      amount: amount.amount,
      currency: amount.currency,
    });
  }
  return { satoshi: parsedAmount, millisat: parsedAmount * 1000 };
}
