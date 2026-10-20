export function assertValidAmount(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new Error(`Invalid amount: ${amount}. Must be a positive integer`);
  }
  return amount;
}
