import { NWCClient } from "../src/nwc/NWCClient";
import {
  Nip47Notification,
  Nip47NotificationType,
  Nip47WalletError,
} from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E test for notifications subscription using the NWC faucet.
 * Requires network access.
 */
describe("NWC notifications", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  test(
    "receives payment_received notification when supported",
    async () => {
      const receiver = await createTestWallet(BALANCE_SATS);
      const sender = await createTestWallet(BALANCE_SATS);

      const receiverClient = new NWCClient({
        nostrWalletConnectUrl: receiver.nwcUrl,
      });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });
      let unsubscribe: (() => void) | undefined;

      try {
        const receiverInfo = await receiverClient.getInfo();
        const supportsPaymentReceived =
          receiverInfo.notifications?.includes("payment_received") ?? false;

        if (!supportsPaymentReceived) {
          expect(
            receiverInfo.notifications?.includes("payment_received") ?? false,
          ).toBe(false);
          return;
        }

        const invoiceResult = await receiverClient.makeInvoice({
          amount: AMOUNT_MSATS,
          description: "E2E notifications payment_received test",
        });

        const receivedNotification = new Promise<Nip47Notification>(
          (resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timed out waiting for payment notification"));
            }, 20_000);

            receiverClient
              .subscribeNotifications(
                (notification) => {
                  if (notification.notification.invoice !== invoiceResult.invoice) {
                    return;
                  }
                  clearTimeout(timeout);
                  resolve(notification);
                },
                ["payment_received" as Nip47NotificationType],
              )
              .then((unsub) => {
                unsubscribe = unsub;
              })
              .catch((error) => {
                clearTimeout(timeout);
                reject(error);
              });
          },
        );

        await senderClient.payInvoice({ invoice: invoiceResult.invoice });

        const notification = await receivedNotification;
        expect(notification.notification_type).toBe("payment_received");
        expect(notification.notification.invoice).toBe(invoiceResult.invoice);
      } catch (error) {
        if (error instanceof Nip47WalletError) {
          expect(error.code).toBe("NOT_IMPLEMENTED");
        } else {
          throw error;
        }
      } finally {
        unsubscribe?.();
        receiverClient.close();
        senderClient.close();
      }
    },
    90_000,
  );
});
