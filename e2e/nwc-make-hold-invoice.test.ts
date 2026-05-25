import { createHash, randomBytes } from "crypto";
import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E test for make_hold_invoice using the NWC faucet.
 * Requires network access.
 */
describe("NWC make_hold_invoice", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  test(
    "creates hold invoice when supported, otherwise returns NOT_IMPLEMENTED",
    async () => {
      const { nwcUrl } = await createTestWallet(BALANCE_SATS);
      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
      const preimageHex = randomBytes(32).toString("hex");
      const paymentHash = createHash("sha256")
        .update(Buffer.from(preimageHex, "hex"))
        .digest("hex");

      try {
        const infoResult = await nwc.getInfo();

        if (!infoResult.methods.includes("make_hold_invoice")) {
          await expect(
            nwc.makeHoldInvoice({
              amount: AMOUNT_MSATS,
              payment_hash: paymentHash,
              description: "E2E make_hold_invoice unsupported-path check",
            }),
          ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
          return;
        }

        const holdInvoiceResult = await nwc.makeHoldInvoice({
          amount: AMOUNT_MSATS,
          payment_hash: paymentHash,
          description: "E2E make_hold_invoice test",
        });

        expect(holdInvoiceResult.invoice).toBeDefined();
        expect(holdInvoiceResult.invoice).toMatch(/^ln/);
        expect(holdInvoiceResult.payment_hash).toBe(paymentHash);
      } catch (error) {
        expect(error).toBeInstanceOf(Nip47WalletError);
        expect((error as Nip47WalletError).code).toBe("NOT_IMPLEMENTED");
      } finally {
        nwc.close();
      }
    },
    60_000,
  );
});
