import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { generateSecretKey, getPublicKey, Relay } from "nostr-tools";
import { Nip47NetworkError, NWCClient } from "./NWCClient";

export type NWAOptions = {
  relayUrl: string;
  appSecretKey?: string;
  appPubkey: string;
};

export type NewNWAClientOptions = {
  relayUrl: string;
  appSecretKey?: string;
};

export class NWAClient {
  options: NWAOptions;
  relay: Relay;

  constructor(options: NewNWAClientOptions) {
    const appSecretKey =
      options.appSecretKey || bytesToHex(generateSecretKey());
    this.options = {
      relayUrl: options.relayUrl,
      appSecretKey,
      appPubkey: getPublicKey(hexToBytes(appSecretKey)),
    };

    if (!this.options.relayUrl) {
      throw new Error("Missing relay url");
    }
    this.relay = new Relay(this.options.relayUrl);

    if (globalThis.WebSocket === undefined) {
      console.error(
        "WebSocket is undefined. Make sure to `import websocket-polyfill` for nodejs environments",
      );
    }
  }

  // TODO: add commands, budget, etc.
  // TODO: construct a proper url and then replace the scheme
  // TODO: add tests
  /**
   * returns the NWA connection URI which should be given to the wallet
   */
  get connectionUri() {
    return `nostr+walletauth://${this.options.appPubkey}?relay=${encodeURIComponent(this.options.relayUrl)}`;
  }

  static parseWalletAuthUrl(walletAuthUrl: string): NWAOptions {
    // makes it possible to parse with URL in the different environments (browser/node/...)
    // parses with or without "//"
    walletAuthUrl = walletAuthUrl
      .replace("nostr+walletconnect://", "http://")
      .replace("nostr+walletconnect:", "http://");
    const url = new URL(walletAuthUrl);

    const appPubkey = url.host;
    if (appPubkey?.length !== 64) {
      throw new Error("Incorrect app pubkey found in connection string");
    }

    const relayUrl = url.searchParams.get("relay");
    if (!relayUrl) {
      throw new Error("No relay URL found in connection string");
    }

    // TODO: support other params (commands/methods, budgets, limits etc.)

    return {
      relayUrl,
      appPubkey,
    };
  }

  /**
   * Waits for a new app connection to be created via NWA (https://github.com/nostr-protocol/nips/pull/851)
   *
   * @returns a new NWCClient
   */
  async subscribe(args: {
    onSuccess: (nwcClient: NWCClient) => void;
  }): Promise<{
    unsub: () => void;
  }> {
    await this._checkConnected();

    const sub = this.relay.subscribe(
      [
        {
          kinds: [13194], // NIP-47 info event
          "#p": [this.options.appPubkey],
        },
      ],
      {
        // eoseTimeout: 10000,
      },
    );

    const unsub = () => {
      sub.close();
      this.relay.close();
    };

    sub.onevent = async (event) => {
      try {
        const lud16 = event.tags.find((t) => t[0] === "lud16")?.[1];
        args.onSuccess(
          new NWCClient({
            relayUrl: this.options.relayUrl,
            secret: this.options.appSecretKey,
            walletPubkey: event.pubkey,
            lud16,
          }),
        );
        unsub();
      } catch (error) {
        console.error("failed to handle NWA event", error);
      }
    };

    return {
      unsub,
    };
  }

  private async _checkConnected() {
    if (!this.options.appSecretKey) {
      throw new Error("Missing secret key");
    }
    if (!this.options.relayUrl) {
      throw new Error("Missing relay url");
    }
    try {
      if (!this.relay.connected) {
        await this.relay.connect();
      }
    } catch (_ /* error is always undefined */) {
      console.error("failed to connect to relay", this.options.relayUrl);
      throw new Nip47NetworkError(
        "Failed to connect to " + this.options.relayUrl,
        "OTHER",
      );
    }
  }
}
