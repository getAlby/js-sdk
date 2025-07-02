import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "@getalby/sdk";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
const response = await webln.listTransactions({
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

webln.close();
