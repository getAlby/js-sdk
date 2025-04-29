import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index"; 

const rl = readline.createInterface({ input, output });

const nwcUrl: string =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
const invoice = await rl.question("Lightning invoice: ");
rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
}) as NWC.NWCClient;

const response = await client.payInvoice({ invoice });

console.info(response);

client.close();
