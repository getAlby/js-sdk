import "websocket-polyfill";
import { NWCClient } from "../NWCClient";

// this has no funds on it, I think ;-)
const exampleNwcUrl =
  "nostr+walletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://relay.getalby.com/v1&secret=e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b";

describe("parseWalletConnectUrl", () => {
  test("standard protocol", () => {
    const parsed = NWCClient.parseWalletConnectUrl(exampleNwcUrl);
    expect(parsed.walletPubkey).toBe(
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
    );
    expect(parsed.secret).toBe(
      "e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b",
    );
    expect(parsed.relayUrl).toBe("wss://relay.getalby.com/v1");
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
    expect(parsed.relayUrl).toBe("wss://relay.getalby.com/v1");
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
    expect(parsed.relayUrl).toBe("wss://relay.getalby.com/v1");
  });
});
