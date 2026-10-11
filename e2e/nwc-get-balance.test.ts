import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for get_balance using the NWC faucet.
 * Requires network access.
 */
describe("NWC get_balance", () => {
  const BALANCE_SATS = 10_000;
  const BALANCE_MSATS = BALANCE_SATS * 1000;

  test(
    "returns wallet balance in msats",
    async () => {
      const { nwcUrl } = await createTestWallet(BALANCE_SATS);
      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

      try {
        const balanceResult = await nwc.getBalance();

        expect(balanceResult.balance).toBeDefined();
        expect(typeof balanceResult.balance).toBe("number");
        expect(balanceResult.balance).toBe(BALANCE_MSATS);
      } finally {
        nwc.close();
      }
    },
    60_000,
  );
});
