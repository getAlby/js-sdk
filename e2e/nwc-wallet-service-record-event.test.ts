import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils.js";
import { NWCClient } from "../src/nwc/NWCClient";
import {
  NWCWalletService,
  NWCWalletServiceKeyPair,
} from "../src/nwc/NWCWalletService";
import { NWCWalletServiceRequestHandler } from "../src/nwc/NWCWalletServiceRequestHandler";
import { Nip47GetInfoResponse } from "../src/nwc/types";

/**
 * E2E test for NWCWalletService recordEvent over a real relay.
 * Requires network access.
 */
const RELAY_URL = "wss://relay.getalby.com/v1";

const getInfoResult: Nip47GetInfoResponse = {
  alias: "recordEvent e2e test",
  color: "",
  pubkey: "",
  network: "bitcoin",
  block_height: 0,
  block_hash: "",
  methods: ["get_info"],
  notifications: [],
};

async function setupWalletServiceAndClient(
  handler: NWCWalletServiceRequestHandler,
) {
  const walletSecret = bytesToHex(generateSecretKey());
  const clientSecret = generateSecretKey();
  const keypair = new NWCWalletServiceKeyPair(
    walletSecret,
    getPublicKey(clientSecret),
  );

  const service = new NWCWalletService({ relayUrls: [RELAY_URL] });
  // the client requires the info event to negotiate the encryption type
  await service.publishWalletServiceInfoEvent(walletSecret, ["get_info"], []);
  const unsubscribe = await service.subscribe(keypair, handler);

  const client = new NWCClient({
    nostrWalletConnectUrl: `nostr+walletconnect://${
      keypair.walletPubkey
    }?relay=${encodeURIComponent(RELAY_URL)}&secret=${bytesToHex(
      clientSecret,
    )}`,
  });

  return {
    client,
    cleanup: () => {
      client.close();
      unsubscribe();
      service.close();
    },
  };
}

describe("NWCWalletService recordEvent", () => {
  test("records the request event id and handles the request", async () => {
    const recordedIds: string[] = [];
    const { client, cleanup } = await setupWalletServiceAndClient({
      recordEvent: (eventId) => {
        recordedIds.push(eventId);
        return undefined;
      },
      getInfo: async () => ({ result: getInfoResult, error: undefined }),
    });

    try {
      const info = await client.getInfo();
      expect(info.alias).toBe(getInfoResult.alias);
      expect(recordedIds).toHaveLength(1);
      expect(recordedIds[0]).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      cleanup();
    }
  }, 30_000);

  test("does not handle requests recorded as already processed", async () => {
    const recordedIds: string[] = [];
    let getInfoCalls = 0;
    const { client, cleanup } = await setupWalletServiceAndClient({
      recordEvent: (eventId) => {
        recordedIds.push(eventId);
        return "ALREADY_PROCESSED";
      },
      getInfo: async () => {
        getInfoCalls++;
        return { result: getInfoResult, error: undefined };
      },
    });

    try {
      // the wallet service should skip the request without responding,
      // so the client's request should time out
      await expect(client.getInfo()).rejects.toThrow("reply timeout");
      expect(recordedIds).toHaveLength(1);
      expect(getInfoCalls).toBe(0);
    } finally {
      cleanup();
    }
  }, 30_000);
});
