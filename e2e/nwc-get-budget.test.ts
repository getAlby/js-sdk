import { NWCClient } from "../src/nwc/NWCClient";

/**
 * E2E test for get_budget using a pre-configured NWC connection.
 * Requires network access.
 */
describe("NWC get_budget", () => {
  const budgetNwcUrl =
    "nostr+walletconnect://65609388dbda7d247a2735568582c18a20e2e9ceb12b59455bc1c0cc0d1067f9?relay=wss://relay.getalby.com&relay=wss://relay2.getalby.com&secret=f0e514c911ab2ce760c34ef802f339ca8db9f8eaa72b51db0882f25cc6f9ecf3&lud16=nwc1778830210362@getalby.com";

  test(
    "returns budget details",
    async () => {
      const nwc = new NWCClient({ nostrWalletConnectUrl: budgetNwcUrl });

      try {
        const budgetResult = await nwc.getBudget();
        if (
          !(
            "used_budget" in budgetResult &&
            "total_budget" in budgetResult &&
            "renewal_period" in budgetResult
          )
        ) {
          throw new Error("Expected get_budget to return budget details");
        }

        expect(typeof budgetResult.used_budget).toBe("number");
        expect(typeof budgetResult.total_budget).toBe("number");
        expect(typeof budgetResult.renewal_period).toBe("string");
      } finally {
        nwc.close();
      }
    },
    60_000,
  );
});
