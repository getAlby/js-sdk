import { fiat } from "@getalby/lightning-tools";
import {
  NewNWCClientOptions,
  Nip47MakeInvoiceRequest,
  Nip47Notification,
  Nip47PayInvoiceRequest,
  Nip47Transaction,
  NWCClient,
} from "./NWCClient";

type LNClientCredentials = string | NWCClient | NewNWCClientOptions;
type FiatAmount = { amount: number; currency: string };

/**
 * An amount in satoshis, or an amount in a fiat currency
 */
type Amount = number | FiatAmount;

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

  pay(invoice: string, args?: Omit<Nip47PayInvoiceRequest, "invoice">) {
    return this.nwcClient.payInvoice({
      invoice,
      ...(args || {}),
    });
  }

  async receive(
    amount: Amount,
    args?: Omit<Nip47MakeInvoiceRequest, "amount">,
  ) {
    let parsedAmount = 0;
    if (typeof amount === "number") {
      parsedAmount = amount;
    } else {
      parsedAmount = await fiat.getSatoshiValue({
        amount: amount.amount,
        currency: amount.currency,
      });
    }

    const transaction = await this.nwcClient.makeInvoice({
      amount: parsedAmount * 1000 /* as millisats */,
      ...(args || {}),
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
