import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils";

const rl = readline.createInterface({ input, output });

async function main(): Promise<void> {
  try {
    const nwcUrl: string =
      process.env.NWC_URL ||
      (await rl.question(
        "Nostr Wallet Connect URL (nostr+walletconnect://...): ",
      ));
    rl.close();

    // Initialize main client
    const client = new nwc.NWCClient({
      nostrWalletConnectUrl: nwcUrl,
    }) as NWC.NWCClient;

    const secretKey: Uint8Array = generateSecretKey();
    const pubkey: string = getPublicKey(secretKey);

    // Create connection
    const response = await client.createConnection({
      pubkey,
      name: `Test created app from JS SDK ${new Date().toISOString()}`,
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

    console.info("Connection created:", response);
    client.close();

    // Create child client using secret
    const childClient = new nwc.NWCClient({
      relayUrl: client.relayUrl,
      secret: bytesToHex(secretKey),
      walletPubkey: response.wallet_pubkey,
    }) as NWC.NWCClient;

    const info = await childClient.getInfo();
    console.info("Got info from created app:", info);

    childClient.close();
  } catch (error) {
    console.error("An error occurred:", error);
    rl.close();
    process.exit(1);
  }
}

main();
