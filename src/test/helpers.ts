/**
 * Test helpers for integration tests using the NWC faucet.
 * @see https://github.com/getAlby/cli/tree/master/src/test
 */

export interface TestWallet {
  nwcUrl: string;
  lightningAddress: string;
}

const FAUCET_URL = "https://faucet.nwc.dev";

/**
 * Creates a test wallet via the NWC faucet with the given balance in sats.
 * Retries on failure (faucet can be rate-limited or temporarily unavailable).
 */
export async function createTestWallet(
  balanceSats = 10_000,
  retries = 5,
): Promise<TestWallet> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${FAUCET_URL}?balance=${balanceSats}`, {
        method: "POST",
      });
      if (!response.ok) {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
          continue;
        }
        throw new Error(`Faucet request failed: ${response.status}`);
      }
      const nwcUrl = (await response.text()).trim();
      const lud16Match = nwcUrl.match(/lud16=([^&\s]+)/);
      if (!lud16Match) {
        throw new Error("No lud16 in NWC URL");
      }
      return {
        nwcUrl,
        lightningAddress: decodeURIComponent(lud16Match[1]),
      };
    } catch (error) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to create test wallet");
}
