import "websocket-polyfill";
import { NWCClient } from "./NWCClient";

// this has no funds on it, I think ;-)
const exampleNwcUrl =
  "nostr+walletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://relay.getalby.com/v1&secret=e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b&lud16=hello@getalby.com";

describe("parseWalletConnectUrl", () => {
  test("standard protocol", () => {
    const parsed = NWCClient.parseWalletConnectUrl(exampleNwcUrl);
    expect(parsed.walletPubkey).toBe(
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
    );
    expect(parsed.secret).toBe(
      "e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b",
    );
    expect(parsed.relayUrls).toEqual(["wss://relay.getalby.com/v1"]);
    expect(parsed.lud16).toBe("hello@getalby.com");
  });
  test("protocol without double slash", () => {
    const parsed = NWCClient.parseWalletConnectUrl(
      exampleNwcUrl.replace("nostr+walletconnect://", "nostr+walletconnect:"),
    );
    expect(parsed.walletPubkey).toBe(
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
    );
    expect(parsed.secret).toBe(
      "e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b",
    );
    expect(parsed.relayUrls).toEqual(["wss://relay.getalby.com/v1"]);
  });
  test("legacy protocol without double slash", () => {
    const parsed = NWCClient.parseWalletConnectUrl(
      exampleNwcUrl.replace("nostr+walletconnect://", "nostrwalletconnect:"),
    );
    expect(parsed.walletPubkey).toBe(
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
    );
    expect(parsed.secret).toBe(
      "e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b",
    );
    expect(parsed.relayUrls).toEqual(["wss://relay.getalby.com/v1"]);
  });
  // TODO: add tests for multiple relays
});

describe("NWCClient", () => {
  test("standard protocol", () => {
    const nwcClient = new NWCClient({ nostrWalletConnectUrl: exampleNwcUrl });
    expect(nwcClient.walletPubkey).toBe(
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
    );
    expect(nwcClient.secret).toBe(
      "e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b",
    );
    expect(nwcClient.lud16).toBe("hello@getalby.com");
    expect(nwcClient.options.lud16).toBe("hello@getalby.com");
  });
});

describe("getAuthorizationUrl", () => {
  test("standard url", () => {
    const pubkey =
      "c5dc47856f533dad6c016b979ee3b21f83f88ae0f0058001b67a4b348339fe94";

    expect(
      NWCClient.getAuthorizationUrl(
        "https://nwc.getalby.com/apps/new",
        {
          budgetRenewal: "weekly",
          expiresAt: new Date("2023-07-21"),
          maxAmount: 100,
          name: "TestApp",
          returnTo: "https://example.com",
          requestMethods: ["pay_invoice", "get_balance"],
          notificationTypes: ["payment_received", "payment_sent"],
          isolated: true,
          metadata: { message: "hello world" },
        },
        pubkey,
      ).toString(),
    ).toEqual(
      `https://nwc.getalby.com/apps/new?name=TestApp&pubkey=${pubkey}&return_to=https%3A%2F%2Fexample.com&budget_renewal=weekly&expires_at=1689897600&max_amount=100&request_methods=pay_invoice+get_balance&notification_types=payment_received+payment_sent&isolated=true&metadata=%7B%22message%22%3A%22hello+world%22%7D`,
    );
  });

  test("hash router url is not supported", () => {
    const pubkey =
      "c5dc47856f533dad6c016b979ee3b21f83f88ae0f0058001b67a4b348339fe94";

    try {
      NWCClient.getAuthorizationUrl(
        "https://my.albyhub.com/#/apps/new",
        {},
        pubkey,
      );
      fail("error should have been thrown");
    } catch (error) {
      expect("" + error).toEqual("Error: hash router paths not supported");
    }
  });
});
