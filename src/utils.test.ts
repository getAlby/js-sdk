import { assertPositiveIntegerAmount, satoshiToMillisat } from "./utils";

describe("assertPositiveIntegerAmount", () => {
  test("accepts valid amounts", () => {
    expect(assertPositiveIntegerAmount(1)).toBe(1);
    expect(assertPositiveIntegerAmount(1000)).toBe(1000);
    expect(assertPositiveIntegerAmount(Number.MAX_SAFE_INTEGER)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  test("returns the same number when valid", () => {
    const amount = 42_000;
    expect(assertPositiveIntegerAmount(amount)).toBe(amount);
  });

  test("uses custom label in error messages", () => {
    expect(() => assertPositiveIntegerAmount(undefined, "tip")).toThrow(
      "No tip specified",
    );
    expect(() => assertPositiveIntegerAmount(0, "tip")).toThrow(
      "Invalid tip: must be at least 1",
    );
  });

  test.each([
    [undefined, "No amount specified"],
    [null, "No amount specified"],
    [0, "Invalid amount: must be at least 1"],
    [-1, "Invalid amount: must be at least 1"],
    [1.5, "Invalid amount: must be an integer"],
    [NaN, "Invalid amount: must be a finite number"],
    [Infinity, "Invalid amount: must be a finite number"],
    [-Infinity, "Invalid amount: must be a finite number"],
    [
      Number.MAX_SAFE_INTEGER + 1,
      "Invalid amount: exceeds maximum allowed value",
    ],
  ])("rejects %s", (amount, message) => {
    expect(() => assertPositiveIntegerAmount(amount)).toThrow(message);
  });

  test("rejects non-number types", () => {
    expect(() => assertPositiveIntegerAmount("1000")).toThrow(
      "Invalid amount: must be a finite number",
    );
    expect(() => assertPositiveIntegerAmount(true)).toThrow(
      "Invalid amount: must be a finite number",
    );
  });
});

describe("satoshiToMillisat", () => {
  test("converts satoshis to millisats", () => {
    expect(satoshiToMillisat(1)).toBe(1_000);
    expect(satoshiToMillisat(10)).toBe(10_000);
    expect(satoshiToMillisat(21)).toBe(21_000);
  });

  test("converts max safe satoshi value", () => {
    const maxSatoshi = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
    expect(satoshiToMillisat(maxSatoshi)).toBe(maxSatoshi * 1000);
  });

  test("rejects invalid satoshi values", () => {
    expect(() => satoshiToMillisat(0)).toThrow(/Invalid amount/);
    expect(() => satoshiToMillisat(-1)).toThrow(/Invalid amount/);
  });

  test("rejects values that overflow millisat representation", () => {
    const maxSatoshi = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
    expect(() => satoshiToMillisat(maxSatoshi + 1)).toThrow(
      /exceeds maximum allowed value after conversion to millisats/,
    );
  });
});
