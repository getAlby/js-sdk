import * as crypto from "node:crypto"; // required in node.js
global.crypto = crypto; // required in node.js
import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl = await rl.question(
  "Nostr Wallet Connect URL (nostrwalletconnect://...): ",
);
const invoice = await rl.question("Lightning invoice: ");
rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();
const sendPaymentResponse = await webln.sendPayment(invoice);
console.log(sendPaymentResponse);

const getBalanceResponse = await webln.getBalance();
console.log(getBalanceResponse);

webln.close();
