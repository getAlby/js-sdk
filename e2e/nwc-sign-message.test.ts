import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for sign_message using the NWC faucet.
 * Requires network access.
 *
 * Faucet connections may list the method but lack the scope.
 */
describe("NWC sign_message", () => {
  const BALANCE_SATS = 10_000;

  test(
    "returns RESTRICTED when connection lacks sign_message scope",
    async () => {
      const { nwcUrl } = await createTestWallet(BALANCE_SATS);
      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

      try {
        await expect(
          nwc.signMessage({ message: "e2e sign_message" }),
        ).rejects.toMatchObject({
          code: "RESTRICTED",
        });
      } finally {
        nwc.close();
      }
    },
    60_000,
  );
});
