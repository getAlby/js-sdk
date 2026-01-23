import crypto from "crypto";
// from https://stackoverflow.com/a/50868276
const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

async function generatePreimageAndPaymentHash(): Promise<{
  preimage: string;
  paymentHash: string;
}> {
  const preimageBytes = crypto.randomBytes(32);
  const preimage = toHexString(preimageBytes);

  const hashBuffer = crypto.createHash("sha256").update(preimageBytes).digest();
  const paymentHash = toHexString(hashBuffer);

  return { preimage, paymentHash };
}


export {
  toHexString,
  generatePreimageAndPaymentHash,
};
