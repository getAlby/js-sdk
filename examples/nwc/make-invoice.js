import * as crypto from "node:crypto"; // required in node.js
global.crypto = crypto; // required in node.js
import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl = await rl.question(
  "Nostr Wallet Connect URL (nostrwalletconnect://...): ",
);
rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();
const response = await webln.makeInvoice({
  amount: 100,
  defaultMemo: "NWC WebLN example",
});

console.log(response);

webln.close();
