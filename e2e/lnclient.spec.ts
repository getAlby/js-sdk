import { test, expect } from "@playwright/test";

const exampleNwcUrl =
  "nostr+walletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://relay.getalby.com/v1&relay=wss://relay2.getalby.com/v1&secret=e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b&lud16=hello@getalby.com";

test.describe("lnclient/LNClient", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/e2e/fixtures/lnclient.html");
    await page.waitForSelector("#app:has-text('Ready')", { timeout: 10000 });
  });

  test.describe("constructor", () => {
    test("creates LNClient from NWC URL string", async ({ page }) => {
      const result = await page.evaluate(async (url) => {
        const { LNClient } = await import("/dist/esm/lnclient.js");
        const client = new LNClient(url);
        const walletPubkey = client.nwcClient.walletPubkey;
        client.close();
        return { walletPubkey };
      }, exampleNwcUrl);

      expect(result.walletPubkey).toBe(
        "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
      );
    });

    test("creates LNClient from NWCClient instance", async ({ page }) => {
      const result = await page.evaluate(async (url) => {
        const { LNClient } = await import("/dist/esm/lnclient.js");
        const { NWCClient } = await import("/dist/esm/nwc.js");
        const nwcClient = new NWCClient({ nostrWalletConnectUrl: url });
        const client = new LNClient(nwcClient);
        const walletPubkey = client.nwcClient.walletPubkey;
        client.close();
        return { walletPubkey };
      }, exampleNwcUrl);

      expect(result.walletPubkey).toBe(
        "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
      );
    });

    test("creates LNClient from options object", async ({ page }) => {
      const result = await page.evaluate(async (url) => {
        const { LNClient } = await import("/dist/esm/lnclient.js");
        const client = new LNClient({ nostrWalletConnectUrl: url });
        const hasNwc = !!client.nwcClient;
        client.close();
        return { hasNwc };
      }, exampleNwcUrl);

      expect(result.hasNwc).toBe(true);
    });

    test("LN alias works same as LNClient", async ({ page }) => {
      const result = await page.evaluate(async (url) => {
        const { LN } = await import("/dist/esm/lnclient.js");
        const client = new LN(url);
        const walletPubkey = client.nwcClient.walletPubkey;
        client.close();
        return { walletPubkey };
      }, exampleNwcUrl);

      expect(result.walletPubkey).toBe(
        "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
      );
    });
  });

  test("close does not throw", async ({ page }) => {
    const closed = await page.evaluate(async (url) => {
      const { LNClient } = await import("/dist/esm/lnclient.js");
      const client = new LNClient(url);
      try {
        client.close();
        return true;
      } catch {
        return false;
      }
    }, exampleNwcUrl);

    expect(closed).toBe(true);
  });

  test("LNClient functions work via fixture", async ({ page }) => {
    const results = await page.evaluate(() => {
      return (
        window as unknown as { __runLnClientTests__: () => Promise<unknown> }
      ).__runLnClientTests__();
    });

    expect(results).toMatchObject({
      fromString: {
        hasNwcClient: true,
        walletPubkey:
          "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
      },
      fromNwc: {
        hasNwcClient: true,
        sameWalletPubkey: true,
      },
      fromOptions: {
        hasNwcClient: true,
      },
    });
  });
});
