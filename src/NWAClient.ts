import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { generateSecretKey, getPublicKey, Relay } from "nostr-tools";
import {
  BudgetRenewalPeriod,
  Nip47Method,
  Nip47NetworkError,
  Nip47NotificationType,
  NWCClient,
} from "./NWCClient";

export type NWAOptions = {
  relayUrl: string;
  appSecretKey?: string;
  appPubkey: string;
  requestMethods: Nip47Method[];
  notificationTypes?: Nip47NotificationType[];
  maxAmount?: number;
  budgetRenewal?: BudgetRenewalPeriod;
  expiresAt?: number;
  isolated?: boolean;
  metadata?: unknown;
};

export type NewNWAClientOptions = {
  relayUrl: string;
  appSecretKey?: string;
  requestMethods: Nip47Method[];
  notificationTypes?: Nip47NotificationType[];
  maxAmount?: number;
  renewalPeriod?: BudgetRenewalPeriod;
  expiresAt?: number;
  isolated?: boolean;
  metadata?: unknown;
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
      requestMethods: options.requestMethods,
      notificationTypes: options.notificationTypes,
      maxAmount: options.maxAmount,
      expiresAt: options.expiresAt,
      budgetRenewal: options.renewalPeriod,
      isolated: options.isolated,
      metadata: options.metadata,
    };

    if (!this.options.relayUrl) {
      throw new Error("Missing relay url");
    }
    if (!this.options.requestMethods) {
      throw new Error("Missing request methods");
    }
    this.relay = new Relay(this.options.relayUrl);

    if (globalThis.WebSocket === undefined) {
      console.error(
        "WebSocket is undefined. Make sure to `import websocket-polyfill` for nodejs environments",
      );
    }
  }

  /**
   * returns the NWA connection URI which should be given to the wallet
   */
  get connectionUri() {
    const searchParams = new URLSearchParams({
      relay: this.options.relayUrl,
      request_methods: this.options.requestMethods.join(" "),

      ...(this.options.notificationTypes
        ? {
            notification_types: this.options.notificationTypes.join(" "),
          }
        : {}),
      ...(this.options.maxAmount
        ? { max_amount: this.options.maxAmount.toString() }
        : {}),
      ...(this.options.budgetRenewal
        ? { budget_renewal: this.options.budgetRenewal }
        : {}),
      ...(this.options.expiresAt
        ? { expires_at: this.options.expiresAt.toString() }
        : {}),
      ...(this.options.isolated
        ? { isolated: this.options.isolated.toString() }
        : {}),
      ...(this.options.metadata
        ? { metadata: JSON.stringify(this.options.metadata) }
        : {}),
    });

    return `nostr+walletauth://${this.options.appPubkey}?${searchParams
      .toString()
      .replace(/\+/g, "%20")}`;
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
      throw new Error("Incorrect app pubkey found in auth string");
    }

    const relayUrl = url.searchParams.get("relay");
    if (!relayUrl) {
      throw new Error("No relay URL found in auth string");
    }
    const requestMethods = url.searchParams
      .get("request_methods")
      ?.split(" ") as Nip47Method[] | undefined;
    if (!requestMethods?.length) {
      throw new Error("No request methods found in auth string");
    }

    const notificationTypes = url.searchParams
      .get("notification_types")
      ?.split(" ") as Nip47NotificationType[] | undefined;

    const maxAmountString = url.searchParams.get("max_amount");
    const expiresAtString = url.searchParams.get("expires_at");
    const metadataString = url.searchParams.get("metadata");

    return {
      relayUrl,
      appPubkey,
      requestMethods,
      notificationTypes,
      budgetRenewal: url.searchParams.get("budget_renewal") as
        | BudgetRenewalPeriod
        | undefined,
      expiresAt: expiresAtString ? parseInt(expiresAtString) : undefined,
      maxAmount: maxAmountString ? parseInt(maxAmountString) : undefined,
      isolated: url.searchParams.get("isolated") === "true",
      metadata: metadataString ? JSON.parse(metadataString) : undefined,
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
