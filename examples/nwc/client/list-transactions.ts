import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index"; 


const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
}) as NWC.NWCClient;

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
const response = await client.listTransactions({
  from: Math.floor(new Date().getTime() / 1000 - ONE_WEEK_IN_SECONDS),
  until: Math.ceil(new Date().getTime() / 1000),
  limit: 30,
  // type: "incoming",
  // unpaid: true,
});

console.info(
  response.transactions.length + " transactions, ",
  response.transactions.filter((t) => t.type === "incoming").length +
    " incoming",
  response,
);

client.close();
