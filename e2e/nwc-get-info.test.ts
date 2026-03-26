import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for get_info using the NWC faucet.
 * Requires network access.
 */
describe("NWC get_info", () => {
  const BALANCE_SATS = 10_000;

  test(
    "returns wallet pubkey and supported methods",
    async () => {
      const { nwcUrl } = await createTestWallet(BALANCE_SATS);
      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

      try {
        const infoResult = await nwc.getInfo();

        expect(infoResult.pubkey).toBeDefined();
        expect(typeof infoResult.pubkey).toBe("string");

        expect(Array.isArray(infoResult.methods)).toBe(true);
        expect(infoResult.methods.length).toBeGreaterThan(0);
      } finally {
        nwc.close();
      }
    },
    60_000,
  );
});
