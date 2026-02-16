import { test, expect } from "@playwright/test";

const exampleNwcUrl =
  "nostr+walletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://relay.getalby.com/v1&relay=wss://relay2.getalby.com/v1&secret=e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b&lud16=hello@getalby.com";

test.describe("nwc", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/e2e/fixtures/nwc.html");
    await page.waitForSelector("#app:has-text('Ready')", { timeout: 10000 });
  });

  test.describe("NWCClient.parseWalletConnectUrl", () => {
    test("parses standard protocol URL", async ({ page }) => {
      const parsed = await page.evaluate(async (url) => {
        const { NWCClient } = await import("/dist/esm/nwc.js");
        return NWCClient.parseWalletConnectUrl(url);
      }, exampleNwcUrl);

      expect(parsed).toMatchObject({
        walletPubkey:
          "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
        secret:
          "e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b",
        relayUrls: [
          "wss://relay.getalby.com/v1",
          "wss://relay2.getalby.com/v1",
        ],
        lud16: "hello@getalby.com",
      });
    });

    test("parses protocol without double slash", async ({ page }) => {
      const urlWithoutSlash = exampleNwcUrl.replace(
        "nostr+walletconnect://",
        "nostr+walletconnect:",
      );
      const parsed = await page.evaluate(async (url) => {
        const { NWCClient } = await import("/dist/esm/nwc.js");
        return NWCClient.parseWalletConnectUrl(url);
      }, urlWithoutSlash);

      expect(parsed.walletPubkey).toBe(
        "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
      );
    });
  });

  test.describe("NWCClient constructor", () => {
    test("creates client from nostrWalletConnectUrl", async ({ page }) => {
      const result = await page.evaluate(async (url) => {
        const { NWCClient } = await import("/dist/esm/nwc.js");
        const client = new NWCClient({ nostrWalletConnectUrl: url });
        return {
          walletPubkey: client.walletPubkey,
          lud16: client.lud16,
        };
      }, exampleNwcUrl);

      expect(result).toEqual({
        walletPubkey:
          "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
        lud16: "hello@getalby.com",
      });
    });

    test("getPublicKey returns hex pubkey", async ({ page }) => {
      const publicKey = await page.evaluate(async (url) => {
        const { NWCClient } = await import("/dist/esm/nwc.js");
        const client = new NWCClient({ nostrWalletConnectUrl: url });
        return await client.getPublicKey();
      }, exampleNwcUrl);

      expect(publicKey).toMatch(/^[a-f0-9]{64}$/);
    });

    test("getNostrWalletConnectUrl returns valid URL", async ({ page }) => {
      const nwcUrl = await page.evaluate(async (url) => {
        const { NWCClient } = await import("/dist/esm/nwc.js");
        const client = new NWCClient({ nostrWalletConnectUrl: url });
        return client.getNostrWalletConnectUrl();
      }, exampleNwcUrl);

      expect(nwcUrl).toMatch(/^nostr\+walletconnect:\/\//);
      expect(nwcUrl).toContain("relay=");
      expect(nwcUrl).toContain("secret=");
    });
  });

  test.describe("NWCClient.getAuthorizationUrl", () => {
    test("generates authorization URL with options", async ({ page }) => {
      const authUrl = await page.evaluate(async () => {
        const { NWCClient } = await import("/dist/esm/nwc.js");
        const pubkey =
          "c5dc47856f533dad6c016b979ee3b21f83f88ae0f0058001b67a4b348339fe94";
        const url = NWCClient.getAuthorizationUrl(
          "https://nwc.getalby.com/apps/new",
          {
            name: "TestApp",
            returnTo: "https://example.com",
          },
          pubkey,
        );
        return url.toString();
      });

      expect(authUrl).toContain("https://nwc.getalby.com/apps/new");
      expect(authUrl).toContain("name=TestApp");
      expect(authUrl).toContain("return_to=");
      expect(authUrl).toContain("pubkey=c5dc47856f533dad6c016b979ee3b21f83f88ae0f0058001b67a4b348339fe94");
    });

    test("throws for hash router paths", async ({ page }) => {
      const error = await page.evaluate(async () => {
        try {
          const { NWCClient } = await import("/dist/esm/nwc.js");
          const pubkey =
            "c5dc47856f533dad6c016b979ee3b21f83f88ae0f0058001b67a4b348339fe94";
          NWCClient.getAuthorizationUrl(
            "https://my.albyhub.com/#/apps/new",
            {},
            pubkey,
          );
          return null;
        } catch (e) {
          return (e as Error).message;
        }
      });

      expect(error).toBe("hash router paths not supported");
    });
  });

  test.describe("NWAClient", () => {
    test("creates client with options", async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { NWAClient } = await import("/dist/esm/nwc.js");
        const client = new NWAClient({
          relayUrls: ["wss://relay.getalby.com/v1"],
          requestMethods: ["pay_invoice", "get_balance"],
          name: "TestNWA",
        });
        return {
          hasAppPubkey: !!client.options.appPubkey,
          requestMethods: client.options.requestMethods,
          name: client.options.name,
        };
      });

      expect(result).toEqual({
        hasAppPubkey: true,
        requestMethods: ["pay_invoice", "get_balance"],
        name: "TestNWA",
      });
    });

    test("getConnectionUri returns valid NWA URI", async ({ page }) => {
      const uri = await page.evaluate(async () => {
        const { NWAClient } = await import("/dist/esm/nwc.js");
        const client = new NWAClient({
          relayUrls: ["wss://relay.getalby.com/v1"],
          requestMethods: ["pay_invoice"],
          name: "TestNWA",
        });
        return client.getConnectionUri();
      });

      expect(uri).toMatch(/^nostr\+walletauth/);
      expect(uri).toContain("relay=");
      expect(uri).toContain("request_methods=");
    });
  });

  test("NWC functions work via fixture", async ({ page }) => {
    const results = await page.evaluate(() => {
      return (
        window as unknown as { __runNwcTests__: () => Promise<unknown> }
      ).__runNwcTests__();
    });

    expect(results).toMatchObject({
      parsed: {
        walletPubkey:
          "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
        lud16: "hello@getalby.com",
      },
      walletPubkey:
        "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
      authUrl: expect.stringContaining("nwc.getalby.com"),
      connectionUri: expect.stringContaining("nostr+walletauth"),
    });
  });
});
