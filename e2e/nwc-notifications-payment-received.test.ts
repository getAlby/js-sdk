import { NWCClient } from "../src/nwc/NWCClient";
import {
  Nip47Notification,
  Nip47NotificationType,
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

        const notification = await new Promise<Nip47Notification>(
          (resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timed out waiting for payment notification"));
            }, 20_000);

            const subscribeAndPay = async () => {
              try {
                unsubscribe = await receiverClient.subscribeNotifications(
                  (n) => {
                    if (n.notification.invoice !== invoiceResult.invoice) {
                      return;
                    }
                    clearTimeout(timeout);
                    resolve(n);
                  },
                  ["payment_received" as Nip47NotificationType],
                );
                await senderClient.payInvoice({
                  invoice: invoiceResult.invoice,
                });
              } catch (error) {
                clearTimeout(timeout);
                reject(error);
              }
            };
            subscribeAndPay();
          },
        );
        expect(notification.notification_type).toBe("payment_received");
        expect(notification.notification.invoice).toBe(invoiceResult.invoice);
      } finally {
        unsubscribe?.();
        receiverClient.close();
        senderClient.close();
      }
    },
    90_000,
  );
});
