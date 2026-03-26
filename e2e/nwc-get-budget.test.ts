import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E test for get_budget using the NWC faucet.
 * Requires network access.
 */
describe("NWC get_budget", () => {
  const BALANCE_SATS = 10_000;

  test(
    "returns budget details or reports unsupported method",
    async () => {
      const { nwcUrl } = await createTestWallet(BALANCE_SATS);
      const nwc = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

      try {
        const budgetResult = await nwc.getBudget();
        const hasBudgetFields =
          "used_budget" in budgetResult &&
          "total_budget" in budgetResult &&
          "renewal_period" in budgetResult;

        if (hasBudgetFields) {
          expect(typeof budgetResult.used_budget).toBe("number");
          expect(typeof budgetResult.total_budget).toBe("number");
          expect(typeof budgetResult.renewal_period).toBe("string");
          return;
        }

        expect(budgetResult).toEqual({});
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
