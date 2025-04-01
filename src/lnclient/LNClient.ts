import { fiat, LightningAddress } from "@getalby/lightning-tools";
import {
  Nip47MakeInvoiceRequest,
  Nip47Notification,
  Nip47PayInvoiceRequest,
  Nip47Transaction,
} from "../nwc/types";
import { NewNWCClientOptions, NWCClient } from "../nwc/NWCClient";

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

export type LN = LNClient;

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

    return {
      transaction,
      invoice: transaction.invoice,
      onPaid: async (callback: (receivedPayment: Nip47Transaction) => void) => {
        let unsubscribeFunc = () => {};
        const onNotification = (notification: Nip47Notification) => {
          if (
            notification.notification.payment_hash === transaction.payment_hash
          ) {
            unsubscribeFunc();
            callback(notification.notification);
          }
        };

        unsubscribeFunc = await this.nwcClient.subscribeNotifications(
          onNotification,
          ["payment_received"],
        );
        return unsubscribeFunc;
      },
    };
  }

  close() {
    this.nwcClient.close();
  }

  // TODO: proxy everything from NWCClient
}

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
