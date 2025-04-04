// from https://stackoverflow.com/a/50868276
export const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
