import { test, expect } from "@playwright/test";

test.describe("E2E setup", () => {
  test("placeholder - e2e environment is ready", async ({ page }) => {
    await page.goto("about:blank");
    expect(await page.evaluate(() => typeof window !== "undefined")).toBe(true);
  });
});
