import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index"; 

const rl = readline.createInterface({ input, output });

const nwcUrl: string = process.env.NWC_URL || await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): ");
rl.close();

// Initialize NWC client
const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
}) as NWC.NWCClient;

// Fetch budget
const response = await client.getBudget();
console.info(response);

// Clean up
client.close();
