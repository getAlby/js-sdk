import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwa, nwc } from "../../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question(
    "Nostr Wallet Connect URL (nostr+walletconnect://...) with create_connection method: ",
  ));

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});
const infoResponse = await client.getInfo();

if (infoResponse.methods.indexOf("create_connection") < 0) {
  console.error("this connection does not support NWC create_connection");
  process.exit(1);
}

const nwaUrl = await rl.question(
  "Nostr Wallet Auth URL (nostr+walletauth://...): ",
);

const nwaOptions = nwa.NWAClient.parseWalletAuthUrl(nwaUrl);

// (here the user would choose to accept the connection)

const createAppResponse = await client.createConnection({
  pubkey: nwaOptions.appPubkey,
  // TODO: below should come from nwaOptions
  name: "NWA test " + new Date().toISOString(),
  methods: [
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

console.info(createAppResponse);

rl.close();
client.close();
