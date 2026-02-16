import { test, expect } from "@playwright/test";

test.describe("lnclient/Amount", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/e2e/fixtures/amount.html");
    await page.waitForSelector("#app:has-text('Ready')", { timeout: 10000 });
  });

  test("SATS returns amount with satoshi", async ({ page }) => {
    const satoshi = await page.evaluate(async () => {
      const { SATS } = await import("/dist/esm/lnclient.js");
      const amount = SATS(10);
      return amount.satoshi;
    });
    expect(satoshi).toBe(10);
  });

  test("resolveAmount resolves sync amount", async ({ page }) => {
    const resolved = await page.evaluate(async () => {
      const { resolveAmount } = await import("/dist/esm/lnclient.js");
      return await resolveAmount({ satoshi: 10 });
    });
    expect(resolved).toEqual({ satoshi: 10, millisat: 10_000 });
  });

  test("resolveAmount resolves async amount", async ({ page }) => {
    const resolved = await page.evaluate(async () => {
      const { resolveAmount } = await import("/dist/esm/lnclient.js");
      return await resolveAmount({
        satoshi: new Promise((r) => setTimeout(() => r(10), 50)),
      });
    });
    expect(resolved).toEqual({ satoshi: 10, millisat: 10_000 });
  });

  test("Amount functions work via fixture", async ({ page }) => {
    const results = await page.evaluate(() => {
      return (window as unknown as { __runAmountTests__: () => Promise<unknown> })
        .__runAmountTests__();
    });

    expect(results).toMatchObject({
      satoshi: 10,
      resolved: { satoshi: 10, millisat: 10_000 },
      resolvedAsync: { satoshi: 10, millisat: 10_000 },
    });
  });
});
