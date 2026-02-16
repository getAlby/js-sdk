import { test, expect } from "@playwright/test";

const ALBY_API = /api\.getalby\.com\/.*/;

const mockBalanceResponse = {
  balance: 21_000,
  currency: "BTC",
  unit: "sats",
};

const mockAccountInfoResponse = {
  identifier: "test-user-123",
  email: "test@example.com",
  name: "Test User",
  keysend_custom_key: "test-key",
};

test.describe("oauth", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(ALBY_API, (route) => {
      const url = route.request().url();

      if (url.includes("/balance")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockBalanceResponse),
        });
      }

      if (url.includes("/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockAccountInfoResponse),
        });
      }

      route.continue();
    });

    await page.goto("/e2e/fixtures/oauth.html");
    await page.waitForSelector("#app:has-text('Ready')", { timeout: 10000 });
  });

  test("Client can be instantiated with bearer token string", async ({
    page,
  }) => {
    const clientCreated = await page.evaluate(async () => {
      const { Client } = await import("/dist/esm/oauth.js");
      const client = new Client("test-token");
      return !!client.auth;
    });

    expect(clientCreated).toBe(true);
  });

  test("accountBalance returns mocked balance", async ({ page }) => {
    const balance = await page.evaluate(async () => {
      const { Client } = await import("/dist/esm/oauth.js");
      const client = new Client("test-token");
      return await client.accountBalance({});
    });

    expect(balance).toEqual(mockBalanceResponse);
  });

  test("accountInformation returns mocked user info", async ({ page }) => {
    const accountInfo = await page.evaluate(async () => {
      const { Client } = await import("/dist/esm/oauth.js");
      const client = new Client("test-token");
      return await client.accountInformation({});
    });

    expect(accountInfo).toEqual(mockAccountInfoResponse);
  });

  test("Client can be instantiated with OAuth2Bearer", async ({ page }) => {
    const balance = await page.evaluate(async () => {
      const { Client, OAuth2Bearer } = await import("/dist/esm/oauth.js");
      const auth = new OAuth2Bearer("custom-token");
      const client = new Client(auth);
      return await client.accountBalance({});
    });

    expect(balance).toEqual(mockBalanceResponse);
  });

  test("OAuth functions work via fixture", async ({ page }) => {
    const results = await page.evaluate(() => {
      return (
        window as unknown as { __runOAuthTests__: () => Promise<unknown> }
      ).__runOAuthTests__();
    });

    expect(results).toMatchObject({
      balance: mockBalanceResponse,
      accountInfo: mockAccountInfoResponse,
    });
  });
});
