import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const walletServiceSecretKey = bytesToHex(generateSecretKey());
const walletServicePubkey = getPublicKey(hexToBytes(walletServiceSecretKey));

const clientSecretKey = bytesToHex(generateSecretKey());
const clientPubkey = getPublicKey(hexToBytes(clientSecretKey));

const DEFAULT_RELAY_URLs = "wss://relay.getalby.com/v1";

const rl = readline.createInterface({ input, output });

const relayUrls = (
  (await rl.question(
    `Relay URLs, comma separated (${DEFAULT_RELAY_URLs}): `,
  )) || DEFAULT_RELAY_URLs
).split(",");
rl.close();

const nwcUrl = `nostr+walletconnect://${walletServicePubkey}?relay=${relayUrls.join("&relay=")}&secret=${clientSecretKey}`;

console.info("enter this NWC URL in a client: ", nwcUrl);

import { NWCWalletService, NWCWalletServiceKeyPair } from "@getalby/sdk/nwc";

const walletService = new NWCWalletService({
  relayUrls,
});

await walletService.publishWalletServiceInfoEvent(
  walletServiceSecretKey,
  ["get_info"],
  [],
);

const keypair = new NWCWalletServiceKeyPair(
  walletServiceSecretKey,
  clientPubkey,
);

const unsub = await walletService.subscribe(keypair, {
  getInfo: () => {
    return Promise.resolve({
      result: {
        methods: ["get_info"],
        alias: "Alby Hub",
        color: "#EFA911",
        pubkey: walletServicePubkey,
        network: "mainnet",
        block_height: 800000,
        block_hash: "0000...0000",
      },
      error: undefined,
    });
  },
  // ... handle other NIP-47 methods here
});

console.info("Waiting for events...");
process.on("SIGINT", function () {
  console.info("Caught interrupt signal");

  unsub();
  walletService.close();

  process.exit();
});
