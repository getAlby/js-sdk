import "websocket-polyfill";
import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E integration test using the NWC faucet.
 * Creates a wallet with 10_000 sats and verifies the balance via get_balance.
 * Requires network access.
 */
describe("NWC faucet integration", () => {
  const EXPECTED_BALANCE_SATS = 10_000;
  const EXPECTED_BALANCE_MSATS = EXPECTED_BALANCE_SATS * 1000;

  test(
    "creates wallet via faucet and balance is 10_000 sats",
    async () => {
      const { nwcUrl } = await createTestWallet(EXPECTED_BALANCE_SATS, 3);

      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
      const result = await nwc.getBalance();
      nwc.close();

      expect(result.balance).toBe(EXPECTED_BALANCE_MSATS);
    },
    60_000,
  );
});
