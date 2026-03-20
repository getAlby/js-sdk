import "websocket-polyfill";
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
    receiver = await createTestWallet(RECEIVER_BALANCE_SATS, 3);
    sender = await createTestWallet(SENDER_BALANCE_SATS, 3);
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

        await expect(
          senderClient.payInvoice({ invoice: invoiceResult.invoice }),
        ).rejects.toBeInstanceOf(Nip47WalletError);
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    60_000,
  );
});
