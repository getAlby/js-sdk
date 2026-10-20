import { assertValidAmount } from "./amount";

describe("assertValidAmount", () => {
  test.each([1, 1000, Number.MAX_SAFE_INTEGER])("accepts %s", (amount) => {
    expect(assertValidAmount(amount)).toBe(amount);
  });

  test.each([
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    undefined,
    "1000",
  ])("rejects %s", (amount) => {
    expect(() => assertValidAmount(amount as number)).toThrow(/Invalid amount/);
  });
});
