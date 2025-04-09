import { Invoice } from "@getalby/lightning-tools";
import { Nip47Notification, Nip47Transaction, NWCClient } from "../nwc";

/**
 * A lightning invoice to be received by your wallet, along with utility functions,
 * such as checking if the invoice was paid and acting upon it.
 */
export class ReceiveInvoice {
  readonly transaction: Nip47Transaction;
  readonly invoice: Invoice;
  private _nwcClient: NWCClient;
  private _unsubscribeFunc?: () => void;
  private _timeoutFunc?: () => void;
  private _timeoutId?: number | NodeJS.Timeout;

  constructor(nwcClient: NWCClient, transaction: Nip47Transaction) {
    this.transaction = transaction;
    this.invoice = new Invoice({ pr: transaction.invoice });
    this._nwcClient = nwcClient;
  }

  /**
   * Setup an action once the invoice has been paid.
   *
   * @param callback this method will be fired once we register the invoice was paid, with information of the received payment.
   * @returns the current instance for method chaining e.g. add optional timeout
   */
  onPaid(
    callback: (receivedPayment: Nip47Transaction) => void,
  ): ReceiveInvoice {
    (async () => {
      let supportsNotifications;
      try {
        // TODO: is there a better way than calling getInfo here?
        const info = await this._nwcClient.getInfo();
        supportsNotifications =
          info.notifications?.includes("payment_received");
      } catch (error) {
        console.error("failed to fetch info, falling back to polling");
      }

      const callbackWrapper = (receivedPayment: Nip47Transaction) => {
        this._unsubscribeFunc?.();
        callback(receivedPayment);
      };

      const unsubscribeWrapper = (unsubscribe: () => void) => {
        return () => {
          // cancel the timeout method and
          this._timeoutFunc = undefined;
          clearTimeout(this._timeoutId);
          unsubscribe();
        };
      };

      if (!supportsNotifications) {
        console.warn(
          "current connection does not support notifications, falling back to polling",
        );
        this._unsubscribeFunc = unsubscribeWrapper(
          this._onPaidPollingFallback(callbackWrapper),
        );
      } else {
        const onNotification = (notification: Nip47Notification) => {
          if (
            notification.notification.payment_hash ===
            this.transaction.payment_hash
          ) {
            callbackWrapper(notification.notification);
          }
        };

        this._unsubscribeFunc = unsubscribeWrapper(
          await this._nwcClient.subscribeNotifications(onNotification, [
            "payment_received",
          ]),
        );
      }
    })();

    return this;
  }

  /**
   * Setup an action that happens if the invoice is not paid after a certain amount of time.
   *
   * @param seconds the number of seconds to wait for a payment
   * @param callback this method will be called once the timeout is elapsed.
   * @returns the current instance for method
   */
  onTimeout(seconds: number, callback: () => void): ReceiveInvoice {
    this._timeoutFunc = () => {
      this._unsubscribeFunc?.();
      callback();
    };
    this._timeoutId = setTimeout(() => {
      this._timeoutFunc?.();
    }, seconds * 1000);

    return this;
  }

  /**
   * Manually unsubscribe if you no longer expect the user to pay.
   *
   * This is only needed if no payment was received and no timeout was configured.
   */
  unsubscribe() {
    this._unsubscribeFunc?.();
  }

  private _onPaidPollingFallback(
    callback: (receivedPayment: Nip47Transaction) => void,
  ) {
    let subscribed = true;
    const unsubscribeFunc = () => {
      subscribed = false;
    };
    (async () => {
      while (subscribed) {
        const transaction = await this._nwcClient.lookupInvoice({
          payment_hash: this.transaction.payment_hash,
        });
        if (transaction.settled_at && transaction.preimage) {
          callback(transaction);
          subscribed = false;
          break;
        }
        // sleep for 3 seconds per lookup attempt
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    })();

    return unsubscribeFunc;
  }
}
