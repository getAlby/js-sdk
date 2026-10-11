import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for get_info using the NWC faucet.
 * Requires network access.
 */
describe("NWC get_info", () => {
  const BALANCE_SATS = 10_000;

  test(
    "returns wallet metadata and supported methods",
    async () => {
      const { nwcUrl } = await createTestWallet(BALANCE_SATS);
      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

      try {
        const info = await nwc.getInfo();

        expect(typeof info.network).toBe("string");
        expect(info.network.length).toBeGreaterThan(0);
        expect(typeof info.block_height).toBe("number");
        expect(info.block_height).toBeGreaterThanOrEqual(0);
        expect(typeof info.block_hash).toBe("string");
        expect(info.block_hash.length).toBeGreaterThan(0);

        expect(Array.isArray(info.methods)).toBe(true);
        expect(info.methods.length).toBeGreaterThan(0);
        expect(info.methods).toContain("get_info");
        expect(info.methods).toContain("get_balance");
      } finally {
        nwc.close();
      }
    },
    60_000,
  );
});
