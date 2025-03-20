import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { LNClient, USD } from "../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new LNClient(nwcUrl);
const response = await client.pay("rolznz@getalby.com", USD(1.0));
console.info("Paid successfully", response);
client.close();
