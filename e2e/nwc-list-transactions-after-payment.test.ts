import "websocket-polyfill";
import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for list_transactions after a successful invoice payment.
 * Requires network access.
 */
describe("NWC list_transactions after pay_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  let sender: { nwcUrl: string };
  let receiver: { nwcUrl: string };

  beforeAll(async () => {
    receiver = await createTestWallet(BALANCE_SATS, 3);
    sender = await createTestWallet(BALANCE_SATS, 3);
  }, 60_000);

  test(
    "returns an outgoing settled transaction for the paid invoice",
    async () => {
      const receiverClient = new NWCClient({
        nostrWalletConnectUrl: receiver.nwcUrl,
      });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      try {
        const invoiceResult = await receiverClient.makeInvoice({
          amount: AMOUNT_MSATS,
          description: "E2E list_transactions after payment",
        });
        expect(invoiceResult.invoice).toBeDefined();

        await senderClient.payInvoice({ invoice: invoiceResult.invoice });

        const listResult = await senderClient.listTransactions({
          limit: 20,
          type: "outgoing",
        });

        expect(Array.isArray(listResult.transactions)).toBe(true);

        const matchingTx = listResult.transactions.find(
          (tx) => tx.invoice === invoiceResult.invoice,
        );

        expect(matchingTx).toBeDefined();
        expect(matchingTx?.type).toBe("outgoing");
        expect(matchingTx?.state).toBe("settled");
        expect(matchingTx?.amount).toBe(AMOUNT_MSATS);
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    60_000,
  );
});
