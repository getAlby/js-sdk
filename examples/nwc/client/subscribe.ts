import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index"; // Importing types for better type checking

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
}) as NWC.NWCClient;

const onNotification = (notification) =>
  console.info("Got notification", notification);

const unsub = await client.subscribeNotifications(onNotification);

console.info("Waiting for notifications...");
process.on("SIGINT", function () {
  console.info("Caught interrupt signal");

  unsub();
  client.close();

  process.exit();
});
