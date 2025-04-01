import { Nip47Notification, Nip47Transaction, NWCClient } from "../nwc";

export class ReceiveInvoice {
  transaction: Nip47Transaction;
  private _nwcClient: NWCClient;

  constructor(nwcClient: NWCClient, transaction: Nip47Transaction) {
    this.transaction = transaction;
    this._nwcClient = nwcClient;
  }

  get invoice(): string {
    return this.transaction.invoice;
  }

  async onPaid(callback: (receivedPayment: Nip47Transaction) => void) {
    // TODO: is there a better way than calling getInfo here?
    const info = await this._nwcClient.getInfo();

    if (!info.notifications?.includes("payment_received")) {
      console.warn(
        "current connection does not support notifications, falling back to polling",
      );
      return this._onPaidPollingFallback(callback);
    }

    let unsubscribeFunc = () => {};
    const onNotification = (notification: Nip47Notification) => {
      if (
        notification.notification.payment_hash === this.transaction.payment_hash
      ) {
        unsubscribeFunc();
        callback(notification.notification);
      }
    };

    unsubscribeFunc = await this._nwcClient.subscribeNotifications(
      onNotification,
      ["payment_received"],
    );
    return unsubscribeFunc;
  }

  private async _onPaidPollingFallback(
    callback: (receivedPayment: Nip47Transaction) => void,
  ) {
    let subscribed = true;
    const unsubscribeFunc = () => {
      subscribed = false;
    };
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

    return unsubscribeFunc;
  }
}
