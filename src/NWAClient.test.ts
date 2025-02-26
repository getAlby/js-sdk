import "websocket-polyfill";
import { NWAClient } from "./NWAClient";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { Nip47Method, Nip47NotificationType } from "./NWCClient";

describe("NWA URI", () => {
  test("constructs correct connection URI with custom app secret key", () => {
    const appSecretKey = bytesToHex(generateSecretKey());
    const appPubkey = getPublicKey(hexToBytes(appSecretKey));

    const nwaClient = new NWAClient({
      relayUrl: "wss://relay.getalby.com/v1",
      appSecretKey,
      requestMethods: ["get_info"],
    });

    expect(nwaClient.connectionUri).toEqual(
      `nostr+walletauth://${appPubkey}?relay=${encodeURIComponent(nwaClient.options.relayUrl)}&request_methods=get_info`,
    );
  });
  test("constructs correct connection URI", () => {
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    const maxAmount = 1000_000; // 1000 sats
    const nwaClient = new NWAClient({
      name: "App Name",
      icon: "https://example.com/image.png",
      relayUrl: "wss://relay.getalby.com/v1",
      requestMethods: ["get_info", "pay_invoice"],
      notificationTypes: ["payment_received", "payment_sent"],
      expiresAt,
      budgetRenewal: "monthly",
      maxAmount,
      isolated: true,
      metadata: { message: "hello world" },
      returnTo: "https://example.com",
    });

    expect(nwaClient.connectionUri).toEqual(
      `nostr+walletauth://${nwaClient.options.appPubkey}?relay=wss%3A%2F%2Frelay.getalby.com%2Fv1&request_methods=get_info%20pay_invoice&name=App%20Name&icon=https%3A%2F%2Fexample.com%2Fimage.png&return_to=https%3A%2F%2Fexample.com&notification_types=payment_received%20payment_sent&max_amount=${maxAmount}&budget_renewal=monthly&expires_at=${expiresAt}&isolated=true&metadata=%7B%22message%22%3A%22hello%20world%22%7D`,
    );
  });

  test("constructs correct connection URI for specific app", () => {
    const nwaClient = new NWAClient({
      relayUrl: "wss://relay.getalby.com/v1",
      requestMethods: ["get_info"],
    });

    expect(nwaClient.getConnectionUri("alby")).toEqual(
      `nostr+walletauth+alby://${nwaClient.options.appPubkey}?relay=wss%3A%2F%2Frelay.getalby.com%2Fv1&request_methods=get_info`,
    );
  });

  test("parses connection URI for specific app", () => {
    const nwaOptions = NWAClient.parseWalletAuthUrl(
      `nostr+walletauth+alby://e73575d76c731102aefd4eb6fb0ddfaaf335eabe60255a22e6ca5e7074eb4992?relay=wss%3A%2F%2Frelay.getalby.com%2Fv1&request_methods=get_info`,
    );
    expect(nwaOptions.appPubkey).toEqual(
      "e73575d76c731102aefd4eb6fb0ddfaaf335eabe60255a22e6ca5e7074eb4992",
    );
    expect(nwaOptions.relayUrl).toEqual("wss://relay.getalby.com/v1");
    expect(nwaOptions.requestMethods).toEqual([
      "get_info",
    ] satisfies Nip47Method[]);
  });

  test("parses connection URI", () => {
    const nwaOptions = NWAClient.parseWalletAuthUrl(
      `nostr+walletauth://e73575d76c731102aefd4eb6fb0ddfaaf335eabe60255a22e6ca5e7074eb4992?relay=wss%3A%2F%2Frelay.getalby.com%2Fv1&request_methods=get_info%20pay_invoice&name=App%20Name&icon=https%3A%2F%2Fexample.com%2Fimage.png&return_to=https%3A%2F%2Fexample.com&notification_types=payment_received%20payment_sent&max_amount=1000000&budget_renewal=monthly&expires_at=1740470142968&isolated=true&metadata=%7B%22message%22%3A%22hello%20world%22%7D`,
    );

    expect(nwaOptions.appPubkey).toEqual(
      "e73575d76c731102aefd4eb6fb0ddfaaf335eabe60255a22e6ca5e7074eb4992",
    );
    expect(nwaOptions.relayUrl).toEqual("wss://relay.getalby.com/v1");
    expect(nwaOptions.requestMethods).toEqual([
      "get_info",
      "pay_invoice",
    ] satisfies Nip47Method[]);
    expect(nwaOptions.notificationTypes).toEqual([
      "payment_received",
      "payment_sent",
    ] satisfies Nip47NotificationType[]);
    expect(nwaOptions.expiresAt).toBe(1740470142968);
    expect(nwaOptions.maxAmount).toBe(1000_000);
    expect(nwaOptions.budgetRenewal).toBe("monthly");
    expect(nwaOptions.isolated).toBe(true);
    expect(nwaOptions.metadata).toEqual({ message: "hello world" });
    expect(nwaOptions.name).toBe("App Name");
    expect(nwaOptions.icon).toBe("https://example.com/image.png");
    expect(nwaOptions.returnTo).toBe("https://example.com");
  });
});
