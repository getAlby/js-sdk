import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for lookup_invoice using the NWC faucet.
 * Requires network access.
 */
describe("NWC lookup_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  let sender: { nwcUrl: string };
  let receiver: { nwcUrl: string };

  beforeAll(async () => {
    receiver = await createTestWallet(BALANCE_SATS);
    sender = await createTestWallet(BALANCE_SATS);
  }, 60_000);

  test(
    "finds paid invoice by invoice string",
    async () => {
      const receiverClient = new NWCClient({ nostrWalletConnectUrl: receiver.nwcUrl });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      try {
        const invoiceResult = await receiverClient.makeInvoice({
          amount: AMOUNT_MSATS,
          description: "E2E lookup test",
        });
        expect(invoiceResult.invoice).toBeDefined();

        await senderClient.payInvoice({ invoice: invoiceResult.invoice });

        const lookupResult = await receiverClient.lookupInvoice({
          invoice: invoiceResult.invoice,
        });
        expect(lookupResult.payment_hash).toBeDefined();
        expect(lookupResult.invoice).toBe(invoiceResult.invoice);
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    60_000,
  );
});
