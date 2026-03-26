import { createHash, randomBytes } from "crypto";
import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E test for settle_hold_invoice using the NWC faucet.
 * Requires network access.
 */
describe("NWC settle_hold_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  test(
    "settles hold invoice flow when supported, otherwise returns NOT_IMPLEMENTED",
    async () => {
      const receiver = await createTestWallet(BALANCE_SATS);
      const sender = await createTestWallet(BALANCE_SATS);

      const receiverClient = new NWCClient({
        nostrWalletConnectUrl: receiver.nwcUrl,
      });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      const preimageHex = randomBytes(32).toString("hex");
      const paymentHash = createHash("sha256")
        .update(Buffer.from(preimageHex, "hex"))
        .digest("hex");

      try {
        const receiverInfo = await receiverClient.getInfo();
        const hasHoldMethods =
          receiverInfo.methods.includes("make_hold_invoice") &&
          receiverInfo.methods.includes("settle_hold_invoice");

        if (!hasHoldMethods) {
          await expect(
            receiverClient.settleHoldInvoice({ preimage: preimageHex }),
          ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
          return;
        }

        const holdInvoice = await receiverClient.makeHoldInvoice({
          amount: AMOUNT_MSATS,
          payment_hash: paymentHash,
          description: "E2E settle_hold_invoice test",
        });
        expect(holdInvoice.invoice).toMatch(/^ln/);

        const payPromise = senderClient.payInvoice({ invoice: holdInvoice.invoice });
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const settleResult = await receiverClient.settleHoldInvoice({
          preimage: preimageHex,
        });
        expect(settleResult).toEqual({});

        const payResult = await payPromise;
        expect(payResult.preimage).toBe(preimageHex);
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
