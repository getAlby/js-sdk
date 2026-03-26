import { createHash, randomBytes } from "crypto";
import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E test for cancel_hold_invoice using the NWC faucet.
 * Requires network access.
 */
describe("NWC cancel_hold_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  test(
    "cancels hold invoice when supported, otherwise returns NOT_IMPLEMENTED",
    async () => {
      const { nwcUrl } = await createTestWallet(BALANCE_SATS);
      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
      const preimageHex = randomBytes(32).toString("hex");
      const paymentHash = createHash("sha256")
        .update(Buffer.from(preimageHex, "hex"))
        .digest("hex");

      try {
        const infoResult = await nwc.getInfo();
        const hasHoldMethods =
          infoResult.methods.includes("make_hold_invoice") &&
          infoResult.methods.includes("cancel_hold_invoice");

        if (!hasHoldMethods) {
          await expect(
            nwc.cancelHoldInvoice({ payment_hash: paymentHash }),
          ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
          return;
        }

        const holdInvoiceResult = await nwc.makeHoldInvoice({
          amount: AMOUNT_MSATS,
          payment_hash: paymentHash,
          description: "E2E cancel_hold_invoice test",
        });
        expect(holdInvoiceResult.invoice).toMatch(/^ln/);

        const cancelResult = await nwc.cancelHoldInvoice({
          payment_hash: holdInvoiceResult.payment_hash,
        });
        expect(cancelResult).toEqual({});
      } catch (error) {
        expect(error).toBeInstanceOf(Nip47WalletError);
        expect(["NOT_IMPLEMENTED", "NOT_FOUND"]).toContain(
          (error as Nip47WalletError).code,
        );
      } finally {
        nwc.close();
      }
    },
    60_000,
  );
});
