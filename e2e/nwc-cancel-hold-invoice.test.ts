import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { generatePreimageAndPaymentHash } from "../src/utils";
import { createTestWallet } from "./helpers";

/**
 * E2E test for cancel_hold_invoice using the NWC faucet.
 * Requires network access.
 *
 * Another wallet must start paying the hold before cancel is valid (same idea
 * as settle_hold_invoice). After cancel, pay_invoice rejects — that rejection
 * must be observed synchronously on the promise, otherwise Node/Jest treat it
 * as an unhandled rejection before the next await runs.
 */
describe("NWC cancel_hold_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  test(
    "cancels hold invoice and pay_invoice fails afterward",
    async () => {
      const receiver = await createTestWallet(BALANCE_SATS);
      const sender = await createTestWallet(BALANCE_SATS);

      const receiverClient = new NWCClient({
        nostrWalletConnectUrl: receiver.nwcUrl,
      });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      const { paymentHash } = await generatePreimageAndPaymentHash();

      let payPromise: Promise<unknown> | undefined;
      let payRejectionDrained: Promise<unknown> | undefined;

      try {
        const holdInvoiceResult = await receiverClient.makeHoldInvoice({
          amount: AMOUNT_MSATS,
          payment_hash: paymentHash,
          description: "E2E cancel_hold_invoice test",
        });
        expect(holdInvoiceResult.invoice).toMatch(/^ln/);
        expect(holdInvoiceResult.payment_hash).toBe(paymentHash);

        payPromise = senderClient.payInvoice({
          invoice: holdInvoiceResult.invoice,
        });
        // Register rejection handler synchronously so cancel does not surface as
        // an unhandled rejection before the next await runs.
        payRejectionDrained = payPromise.catch(() => {});

        // Pay must reach an in-flight hold before cancel is valid; shared infra
        // timing varies, so retry cancel until success or a definitive error.
        const cancelDeadlineMs = Date.now() + 25_000;
        const cancelPollMs = 500;
        for (;;) {
          try {
            const cancelResult = await receiverClient.cancelHoldInvoice({
              payment_hash: paymentHash,
            });
            expect(cancelResult).toEqual({});
            break;
          } catch (error) {
            if (error instanceof Nip47WalletError) {
              if (
                error.code === "NOT_IMPLEMENTED" ||
                error.code === "RESTRICTED"
              ) {
                throw error;
              }
            } else {
              throw error;
            }
            if (Date.now() >= cancelDeadlineMs) {
              throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, cancelPollMs));
          }
        }

        const payError = await payPromise.catch((e) => e);
        expect(payError).toBeInstanceOf(Nip47WalletError);
        expect((payError as Nip47WalletError).message).toMatch(
          /hold|canceled|cancel/i,
        );
      } finally {
        if (payPromise !== undefined) {
          await payPromise.catch(() => {});
        }
        if (payRejectionDrained !== undefined) {
          await payRejectionDrained;
        }
        receiverClient.close();
        senderClient.close();
      }
    },
    90_000,
  );
});
