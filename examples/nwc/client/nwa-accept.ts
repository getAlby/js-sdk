import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { NWAClient, NWCClient } from "@getalby/sdk/nwc";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question(
    "Nostr Wallet Connect URL (nostr+walletconnect://...) with create_connection method: ",
  ));

const client = new NWCClient({
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

const nwaOptions = NWAClient.parseWalletAuthUrl(nwaUrl);

// (here the user would choose to accept the connection)

const createAppResponse = await client.createConnection({
  pubkey: nwaOptions.appPubkey,
  name: nwaOptions.name || "NWA test " + new Date().toISOString(),
  request_methods: nwaOptions.requestMethods,
  notification_types: nwaOptions.notificationTypes,
  max_amount: nwaOptions.maxAmount,
  budget_renewal: nwaOptions.budgetRenewal,
  expires_at: nwaOptions.expiresAt,
  isolated: nwaOptions.isolated,
  metadata: nwaOptions.metadata,
});

console.info(createAppResponse);

rl.close();
client.close();
