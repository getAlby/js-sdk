import * as crypto from "node:crypto"; // required in node.js
global.crypto = crypto; // required in node.js
import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
const destination =
  (await rl.question("Enter destination pubkey: ")) ||
  "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3";
const amount = await rl.question("Enter amount: ");
rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();
const response = await webln.keysend({
  amount,
  destination,
  customRecords: {
    696969: "1KOZHzhLs2U7JIx3BmEY",
  },
});

console.info(response);

webln.close();
