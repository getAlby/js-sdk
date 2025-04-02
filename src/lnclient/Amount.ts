// TODO: move to lightning tools
/**
 * An amount in satoshis
 */
export interface Amount {
  satoshi: { satoshi: number } | Promise<{ satoshi: number }>;
}

export async function resolveAmount(
  amount: Amount,
): Promise<{ satoshi: number; millisat: number }> {
  const satoshi = await Promise.resolve(amount.satoshi);

  return {
    satoshi: satoshi.satoshi,
    millisat: satoshi.satoshi * 1000,
  };
}
