// from https://stackoverflow.com/a/50868276
const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

async function generatePreimageAndPaymentHash() {
  const preimageBytes = crypto.getRandomValues(new Uint8Array(32));
  const preimage = toHexString(preimageBytes);

  const hashBuffer = await crypto.subtle.digest("SHA-256", preimageBytes);
  const paymentHash = toHexString(new Uint8Array(hashBuffer));

  return { preimage, paymentHash };
}


export {
  toHexString,
  generatePreimageAndPaymentHash,
};
