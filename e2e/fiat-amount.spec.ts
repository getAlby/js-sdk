import { test, expect } from "@playwright/test";

const RATES_API = /getalby\.com\/api\/rates\/.*\.json/;

const mockRatesResponse = {
  code: "USD",
  symbol: "$",
  rate: "100000.00",
  rate_float: 100_000,
  rate_cents: 10_000_000,
};

test.describe("lnclient/FiatAmount", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(RATES_API, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRatesResponse),
      });
    });

    await page.goto("/e2e/fixtures/fiat-amount.html");
    await page.waitForSelector("#app:has-text('Ready')", { timeout: 10000 });
  });

  test("USD converts to satoshis via resolveAmount", async ({ page }) => {
    const resolved = await page.evaluate(async () => {
      const { USD, resolveAmount } = await import("/dist/esm/lnclient.js");
      const fiatAmount = USD(1);
      return await resolveAmount(fiatAmount);
    });

    expect(resolved.satoshi).toBeGreaterThan(0);
    expect(resolved.millisat).toBe(resolved.satoshi * 1000);
  });

  test("FiatAmount is interoperable with Amount", async ({ page }) => {
    const resolved = await page.evaluate(async () => {
      const { USD, resolveAmount } = await import("/dist/esm/lnclient.js");
      const fiatAmount = USD(1);
      return await resolveAmount(fiatAmount);
    });

    expect(resolved).toMatchObject({
      satoshi: expect.any(Number),
      millisat: expect.any(Number),
    });
    expect(resolved.satoshi).toBe(1000);
  });

  test("EUR converts to satoshis", async ({ page }) => {
    const resolved = await page.evaluate(async () => {
      const { EUR, resolveAmount } = await import("/dist/esm/lnclient.js");
      const fiatAmount = EUR(10);
      return await resolveAmount(fiatAmount);
    });

    expect(resolved.satoshi).toBe(10_000);
    expect(resolved.millisat).toBe(10_000_000);
  });

  test("FiatAmount functions work via fixture", async ({ page }) => {
    const results = await page.evaluate(() => {
      return (
        window as unknown as { __runFiatAmountTests__: () => Promise<unknown> }
      ).__runFiatAmountTests__();
    });

    expect(results).toMatchObject({
      usdResolved: { satoshi: 1000, millisat: 1_000_000 },
      eurResolved: { satoshi: 10_000, millisat: 10_000_000 },
    });
  });
});
