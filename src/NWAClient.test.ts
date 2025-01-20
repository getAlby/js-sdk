import "websocket-polyfill";
import { NWAClient } from "./NWAClient";

describe("NWA URI", () => {
  test("constructs correct connection URI", () => {
    const nwaClient = new NWAClient({
      relayUrl: "wss://relay.getalby.com/v1",
    });

    expect(nwaClient.connectionUri).toEqual(
      `nostr+walletauth://${nwaClient.options.appPubkey}?relay=${encodeURIComponent(nwaClient.options.relayUrl)}&secret=${nwaClient.options.nwaSecret}`,
    );
  });

  test("parses connection URI", () => {
    const nwaOptions = NWAClient.parseWalletAuthUrl(
      "nostr+walletauth://e73575d76c731102aefd4eb6fb0ddfaaf335eabe60255a22e6ca5e7074eb4992?relay=wss%3A%2F%2Frelay.getalby.com%2Fv1&secret=1d7d477e495e26851ec0a01d633ceb74fe3cee78a850186a3a978f0e63b285d4",
    );

    expect(nwaOptions.appPubkey).toEqual(
      "e73575d76c731102aefd4eb6fb0ddfaaf335eabe60255a22e6ca5e7074eb4992",
    );
    expect(nwaOptions.relayUrl).toEqual("wss://relay.getalby.com/v1");
    expect(nwaOptions.nwaSecret).toEqual(
      "1d7d477e495e26851ec0a01d633ceb74fe3cee78a850186a3a978f0e63b285d4",
    );
  });
});
