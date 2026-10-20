import { assertValidAmount } from "../nwc/amount";

// TODO: move to lightning tools
/**
 * An amount in satoshis
 */
export type Amount = { satoshi: number } | { satoshi: Promise<number> };

export const SATS: (amount: number) => Amount = (amount) => ({
  satoshi: amount,
});

export async function resolveAmount(
  amount: Amount,
): Promise<{ satoshi: number; millisat: number }> {
  const satoshi = assertValidAmount(await amount.satoshi);

  return {
    satoshi,
    millisat: satoshi * 1000,
  };
}
