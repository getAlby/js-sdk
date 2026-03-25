import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for make_invoice and pay_invoice using the NWC faucet.
 * Requires network access.
 */
describe("NWC make_invoice and pay_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  let sender: { nwcUrl: string };
  let receiver: { nwcUrl: string };

  beforeAll(async () => {
    receiver = await createTestWallet(BALANCE_SATS);
    sender = await createTestWallet(BALANCE_SATS);
  }, 60_000);

  test(
    "receiver creates invoice, sender pays it",
    async () => {
      const receiverClient = new NWCClient({ nostrWalletConnectUrl: receiver.nwcUrl });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      try {
        const invoiceResult = await receiverClient.makeInvoice({
          amount: AMOUNT_MSATS,
          description: "E2E test invoice",
        });
        expect(invoiceResult.invoice).toBeDefined();
        expect(invoiceResult.invoice).toMatch(/^ln/);

        const payResult = await senderClient.payInvoice({
          invoice: invoiceResult.invoice,
        });
        expect(payResult.preimage).toBeDefined();
        expect(typeof payResult.preimage).toBe("string");
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    60_000,
  );
});
