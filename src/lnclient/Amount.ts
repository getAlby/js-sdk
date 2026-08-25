import { assertPositiveIntegerAmount, satoshiToMillisat } from "../utils";

// TODO: move to lightning tools
/**
 * An amount in satoshis
 */
export type Amount = { satoshi: number } | { satoshi: Promise<number> };

export const SATS: (amount: number) => Amount = (amount) => ({
  satoshi: assertPositiveIntegerAmount(amount),
});

export async function resolveAmount(
  amount: Amount,
): Promise<{ satoshi: number; millisat: number }> {
  const satoshi = assertPositiveIntegerAmount(
    await Promise.resolve(amount.satoshi),
  );

  return {
    satoshi,
    millisat: satoshiToMillisat(satoshi),
  };
}
