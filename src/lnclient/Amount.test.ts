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
});
