import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E negative test for pay_invoice using the NWC faucet.
 * Requires network access.
 */
describe("NWC pay_invoice insufficient funds", () => {
  const INVOICE_AMOUNT_MSATS = 1_000_000; // 1_000 sats
  const RECEIVER_BALANCE_SATS = 10_000;
  const SENDER_BALANCE_SATS = 50;

  let sender: { nwcUrl: string };
  let receiver: { nwcUrl: string };

  beforeAll(async () => {
    receiver = await createTestWallet(RECEIVER_BALANCE_SATS);
    sender = await createTestWallet(SENDER_BALANCE_SATS);
  }, 60_000);

  test(
    "fails with wallet error when invoice amount exceeds sender balance",
    async () => {
      const receiverClient = new NWCClient({
        nostrWalletConnectUrl: receiver.nwcUrl,
      });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      try {
        const invoiceResult = await receiverClient.makeInvoice({
          amount: INVOICE_AMOUNT_MSATS,
          description: "E2E insufficient funds test",
        });

        const payInvoicePromise = senderClient.payInvoice({
          invoice: invoiceResult.invoice,
        });
        await expect(payInvoicePromise).rejects.toBeInstanceOf(Nip47WalletError);
        await expect(payInvoicePromise).rejects.toMatchObject({
          code: "INSUFFICIENT_BALANCE",
        });
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    60_000,
  );
});
