import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { generateSecretKey, getPublicKey, nip44, Relay } from "nostr-tools";
import { Nip47Method, Nip47NetworkError, NWCClient } from "./NWCClient";

export type NWAOptions = {
  relayUrl: string;
  appSecretKey: string;
  appPubkey: string;
  nwaSecret: string;
};

export type NewNWAClientOptions = {
  relayUrl: string;
  appSecretKey?: string;
};

export class NWAClient {
  private options: NWAOptions;
  private relay: Relay;

  constructor(options: NewNWAClientOptions) {
    const appSecretKey =
      options.appSecretKey || bytesToHex(generateSecretKey());
    this.options = {
      relayUrl: options.relayUrl,
      appSecretKey,
      appPubkey: getPublicKey(hexToBytes(appSecretKey)),
      nwaSecret: bytesToHex(generateSecretKey()),
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
  /**
   * returns the NWA connection URI which should be given to the wallet
   */
  get connectionUri() {
    return `nostr+walletauth://${this.options.appPubkey}?relay=${this.options.relayUrl}&secret=${this.options.nwaSecret}`;
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
          // kinds: [33194], // NIP-04
          kinds: [33195], // NIP-44
          "#d": [this.options.appPubkey],
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
        if (
          event.tags.find((t) => t[0] === "d")?.[1] !== this.options.appPubkey
        ) {
          throw new Error("Event with incorrect d tag");
        }

        const decryptedContent = await this.decrypt(
          this.options.appPubkey,
          event.content,
        );

        type NWAContent = {
          secret: string;
          commands: Nip47Method[];
          lud16: string;
        };

        const nwaContent = JSON.parse(decryptedContent) as NWAContent;
        if (nwaContent.secret !== this.options.nwaSecret) {
          throw new Error("Incorrect secret for this app");
        }
        args.onSuccess(
          new NWCClient({
            relayUrl: this.options.relayUrl,
            secret: this.options.appSecretKey,
            walletPubkey: event.pubkey,
            lud16: nwaContent.lud16,
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

  private decrypt(walletServicePubkey: string, content: string) {
    const key = nip44.getConversationKey(
      hexToBytes(this.options.appSecretKey),
      walletServicePubkey,
    );
    return nip44.decrypt(content, key);
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
