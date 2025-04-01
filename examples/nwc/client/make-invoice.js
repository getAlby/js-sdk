import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));

const amount =
  parseInt((await rl.question("Amount in sats (default 1 sat): ")) || "1") *
  1000;

rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

const response = await client.makeInvoice({
  amount, // in millisats
  description: "NWC Client example",
});

console.info(response);

client.close();
