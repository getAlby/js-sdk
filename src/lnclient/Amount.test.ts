import { resolveAmount, SATS } from "./Amount";

describe("Amount", () => {
  test("SATS", async () => {
    const amount = SATS(10);
    expect(amount.satoshi).toBe(10);
  });

  test("resolveAmount", async () => {
    const resolved = await resolveAmount({ satoshi: 10 });
    expect(resolved.satoshi).toBe(10);
    expect(resolved.millisat).toBe(10_000);
  });

  test("resolveAmount async", async () => {
    const resolved = await resolveAmount({
      satoshi: new Promise((resolve) => setTimeout(() => resolve(10), 300)),
    });
    expect(resolved.satoshi).toBe(10);
    expect(resolved.millisat).toBe(10_000);
  });

  test("resolveAmount converts large valid amounts", async () => {
    const resolved = await resolveAmount({ satoshi: 1_000_000 });
    expect(resolved.satoshi).toBe(1_000_000);
    expect(resolved.millisat).toBe(1_000_000_000);
  });

  test.each([0, -1, 1.5, NaN, Infinity])(
    "SATS rejects invalid amount %s",
    (amount) => {
      expect(() => SATS(amount)).toThrow(/Invalid amount/);
    },
  );

  test.each([0, -1, 1.5, NaN, Infinity])(
    "resolveAmount rejects invalid amount %s",
    async (amount) => {
      await expect(resolveAmount({ satoshi: amount })).rejects.toThrow(
        /Invalid amount/,
      );
    },
  );
});
