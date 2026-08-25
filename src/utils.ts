// from https://stackoverflow.com/a/50868276
const toHexString = (bytes: Uint8Array<ArrayBuffer>) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

async function generatePreimageAndPaymentHash(): Promise<{
  preimage: string;
  paymentHash: string;
}> {
  const preimageBytes = crypto.getRandomValues(new Uint8Array(32));
  const preimage = toHexString(preimageBytes);

  const hashBuffer = await crypto.subtle.digest("SHA-256", preimageBytes);
  const paymentHash = toHexString(new Uint8Array(hashBuffer));

  return { preimage, paymentHash };
}

function assertPositiveIntegerAmount(
  amount: unknown,
  label = "amount",
): number {
  if (amount === undefined || amount === null) {
    throw new Error(`No ${label} specified`);
  }
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error(`Invalid ${label}: must be a finite number`);
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`Invalid ${label}: must be an integer`);
  }
  if (amount < 1) {
    throw new Error(`Invalid ${label}: must be at least 1`);
  }
  if (amount > Number.MAX_SAFE_INTEGER) {
    throw new Error(`Invalid ${label}: exceeds maximum allowed value`);
  }
  return amount;
}

function satoshiToMillisat(satoshi: number): number {
  const validSatoshi = assertPositiveIntegerAmount(satoshi, "amount");
  const millisat = validSatoshi * 1000;
  if (!Number.isSafeInteger(millisat)) {
    throw new Error(
      "Amount exceeds maximum allowed value after conversion to millisats",
    );
  }
  return millisat;
}

export {
  toHexString,
  generatePreimageAndPaymentHash,
  assertPositiveIntegerAmount,
  satoshiToMillisat,
};
