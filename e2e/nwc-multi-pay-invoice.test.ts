import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E test for multi_pay_invoice using the NWC faucet.
 * Requires network access.
 */
describe("NWC multi_pay_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  let sender: { nwcUrl: string };
  let receiver: { nwcUrl: string };

  beforeAll(async () => {
    receiver = await createTestWallet(BALANCE_SATS);
    sender = await createTestWallet(BALANCE_SATS);
  }, 60_000);

  test(
    "pays multiple invoices when supported, otherwise returns NOT_IMPLEMENTED",
    async () => {
      const receiverClient = new NWCClient({
        nostrWalletConnectUrl: receiver.nwcUrl,
      });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      try {
        const senderInfo = await senderClient.getInfo();

        if (!senderInfo.methods.includes("multi_pay_invoice")) {
          await expect(
            senderClient.multiPayInvoice({
              invoices: [{ invoice: "lnbc1invalidinvoice" }],
            }),
          ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
          return;
        }

        const firstInvoice = await receiverClient.makeInvoice({
          amount: AMOUNT_MSATS,
          description: "E2E multi_pay_invoice #1",
        });
        const secondInvoice = await receiverClient.makeInvoice({
          amount: AMOUNT_MSATS,
          description: "E2E multi_pay_invoice #2",
        });

        const multiPayResult = await senderClient.multiPayInvoice({
          invoices: [
            { invoice: firstInvoice.invoice },
            { invoice: secondInvoice.invoice },
          ],
        });

        expect(Array.isArray(multiPayResult.invoices)).toBe(true);
        expect(multiPayResult.invoices.length).toBe(2);
        expect(multiPayResult.errors).toEqual([]);
        expect(multiPayResult.invoices[0].preimage).toBeDefined();
        expect(multiPayResult.invoices[1].preimage).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Nip47WalletError);
        expect((error as Nip47WalletError).code).toBe("NOT_IMPLEMENTED");
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    90_000,
  );
});
