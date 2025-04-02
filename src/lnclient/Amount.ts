// TODO: move to lightning tools
/**
 * An amount in satoshis
 */
export type Amount = { satoshi: number } | { satoshi: Promise<number> };

export async function resolveAmount(
  amount: Amount,
): Promise<{ satoshi: number; millisat: number }> {
  if (typeof amount === "number") {
    return {
      satoshi: amount,
      millisat: amount * 1000,
    };
  }
  const satoshi = await Promise.resolve(amount.satoshi);

  return {
    satoshi: satoshi,
    millisat: satoshi * 1000,
  };
}
