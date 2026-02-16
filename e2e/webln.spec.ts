import { test, expect } from "@playwright/test";

const ALBY_API = /api\.getalby\.com\/.*/;

const mockSendPaymentResponse = {
  payment_hash: "test-hash",
  payment_preimage: "test-preimage",
};

const mockKeysendResponse = {
  payment_hash: "test-keysend-hash",
  payment_preimage: "test-keysend-preimage",
};

const mockCreateInvoiceResponse = {
  payment_request: "lnbc100n1test-invoice",
  payment_hash: "invoice-hash",
};

test.describe("webln", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(ALBY_API, (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes("/payments/bolt11") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockSendPaymentResponse),
        });
      }

      if (url.includes("/payments/keysend") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockKeysendResponse),
        });
      }

      if (url.includes("/invoices") && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockCreateInvoiceResponse),
        });
      }

      route.continue();
    });

    await page.goto("/e2e/fixtures/webln.html");
    await page.waitForSelector("#app:has-text('Ready')", { timeout: 10000 });
  });

  test("OauthWeblnProvider can be instantiated with mock auth", async ({
    page,
  }) => {
    const created = await page.evaluate(async () => {
      const { OauthWeblnProvider } = await import("/dist/esm/webln.js");
      const mockAuth = {
        token: { access_token: "x" },
        getAuthHeader: () => ({ Authorization: "Bearer x" }),
      };
      const provider = new OauthWeblnProvider({ auth: mockAuth });
      return !!provider && provider.oauth === true;
    });

    expect(created).toBe(true);
  });

  test("OauthWeblnProvider enable returns when token exists", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { OauthWeblnProvider } = await import("/dist/esm/webln.js");
      const mockAuth = {
        token: { access_token: "x" },
        getAuthHeader: () => ({ Authorization: "Bearer x" }),
      };
      const provider = new OauthWeblnProvider({ auth: mockAuth });
      return await provider.enable();
    });

    expect(result).toEqual({ enabled: true });
  });

  test("OauthWeblnProvider getInfo returns Alby alias", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { OauthWeblnProvider } = await import("/dist/esm/webln.js");
      const mockAuth = {
        token: { access_token: "x" },
        getAuthHeader: () => ({ Authorization: "Bearer x" }),
      };
      const provider = new OauthWeblnProvider({ auth: mockAuth });
      await provider.enable();
      return await provider.getInfo();
    });

    expect(result).toEqual({ alias: "Alby" });
  });

  test("OauthWeblnProvider sendPayment returns preimage", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { OauthWeblnProvider } = await import("/dist/esm/webln.js");
      const mockAuth = {
        token: { access_token: "x" },
        getAuthHeader: () => ({ Authorization: "Bearer x" }),
      };
      const provider = new OauthWeblnProvider({ auth: mockAuth });
      await provider.enable();
      return await provider.sendPayment("lnbc100n1test-invoice");
    });

    expect(result).toEqual({ preimage: "test-preimage" });
  });

  test("OauthWeblnProvider keysend returns preimage", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { OauthWeblnProvider } = await import("/dist/esm/webln.js");
      const mockAuth = {
        token: { access_token: "x" },
        getAuthHeader: () => ({ Authorization: "Bearer x" }),
      };
      const provider = new OauthWeblnProvider({ auth: mockAuth });
      await provider.enable();
      return await provider.keysend({
        destination: "test-pubkey",
        amount: 100,
      });
    });

    expect(result).toEqual({ preimage: "test-keysend-preimage" });
  });

  test("OauthWeblnProvider makeInvoice returns payment request", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const { OauthWeblnProvider } = await import("/dist/esm/webln.js");
      const mockAuth = {
        token: { access_token: "x" },
        getAuthHeader: () => ({ Authorization: "Bearer x" }),
      };
      const provider = new OauthWeblnProvider({ auth: mockAuth });
      await provider.enable();
      return await provider.makeInvoice({
        amount: 100,
        defaultMemo: "Test",
      });
    });

    expect(result).toEqual({
      paymentRequest: "lnbc100n1test-invoice",
    });
  });

  test("WebLN functions work via fixture", async ({ page }) => {
    const results = await page.evaluate(() => {
      return (
        window as unknown as { __runWeblnTests__: () => Promise<unknown> }
      ).__runWeblnTests__();
    });

    expect(results).toMatchObject({
      enableResult: { enabled: true },
      getInfoResult: { alias: "Alby" },
      makeInvoiceResult: { paymentRequest: "lnbc100n1test-invoice" },
    });
  });
});
