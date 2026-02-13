
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { NWCClient } from "@getalby/sdk/nwc";
import { generateSecretKey, getPublicKey } from "nostr-tools";

import { bytesToHex } from "@noble/hashes/utils";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

const secretKey = generateSecretKey();
const pubkey = getPublicKey(secretKey);

const response = await client.createConnection({
  pubkey,
  name: "Test created app from JS SDK " + new Date().toISOString(),
  request_methods: [
    "get_info",
    "get_balance",
    "get_budget",
    "make_invoice",
    "pay_invoice",
    "lookup_invoice",
    "list_transactions",
    "sign_message",
  ],
});

console.info(response);

client.close();

const childClient = new NWCClient({
  relayUrl: client.relayUrl,
  secret: bytesToHex(secretKey),
  walletPubkey: response.wallet_pubkey,
});

const info = await childClient.getInfo();
console.info("Got info from created app", info);

childClient.close();
