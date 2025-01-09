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
    expect(parsed.relayUrl).toBe("wss://relay.getalby.com/v1");
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

describe("selectHighestCompatibleVersion", () => {
  let nwcClient: NWCClient;
  let selectVersion: (walletVersions: string[]) => string | null;
  const ORIGINAL_SUPPORTED_VERSIONS = NWCClient.SUPPORTED_VERSIONS;

  beforeEach(() => {
    nwcClient = new NWCClient();
    // Access the private method using type assertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectVersion = (nwcClient as any).selectHighestCompatibleVersion;
  });

  afterEach(() => {
    // Restore the original SUPPORTED_VERSIONS
    NWCClient.SUPPORTED_VERSIONS = [...ORIGINAL_SUPPORTED_VERSIONS];
  });

  test("both client and wallet support version 1.0", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0", "1.0"];
    const walletVersions = ["0.0", "1.0"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBe("1.0");
  });

  test("client supports version 1.0 but wallet does not", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0", "1.0"];
    const walletVersions = ["0.0"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBe("0.0");
  });

  test("wallet supports version 1.0 but client does not", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0"];
    const walletVersions = ["0.0", "1.0"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBe("0.0");
  });

  test("wallet and client do not have overlapping versions", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0"];
    const walletVersions = ["1.0"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBeNull();
  });

  // Tests for future
  test("client supports more versions than wallet", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0", "1.3"];
    const walletVersions = ["1.2"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBe("1.2");
  });

  test("wallet supports more versions than client", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0", "1.4"];
    const walletVersions = ["1.6"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBe("1.4");
  });

  test("wallet and client have no overlapping major versions", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0", "1.0"];
    const walletVersions = ["2.0"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBeNull();
  });

  test("both client and wallet support multiple versions with different majors", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0", "1.0", "2.4"];
    const walletVersions = ["1.0", "2.3"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBe("2.3");
  });

  test("wallet has duplicate versions", () => {
    NWCClient.SUPPORTED_VERSIONS = ["0.0", "1.2"];
    const walletVersions = ["1.1", "1.1"];
    const selected = selectVersion(walletVersions);
    expect(selected).toBe("1.1");
  });
});
