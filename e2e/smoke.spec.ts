import { test, expect } from "@playwright/test";

/**
 * Minimal smoke test: verifies the bundled SDK loads and runs in a browser.
 * Catches bundle/build issues that Jest (Node) cannot detect.
 */
test("bundled SDK loads and runs in browser", async ({ page }) => {
  await page.goto("/e2e/fixtures/smoke.html");
  await page.waitForSelector("#status:has-text('ok')", { timeout: 10000 });

  const result = await page.evaluate(() => {
    return (window as { __sdkReady?: boolean }).__sdkReady;
  });

  expect(result).toBe(true);
});
