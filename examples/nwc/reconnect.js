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
rl.close();
rl.removeAllListeners();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();
const response = await webln.getBalance();

console.info(response);

const rl2 = readline.createInterface({ input, output });
await rl2.question("Disconnect from the internet and then press enter");
rl2.close();
rl2.removeAllListeners();
console.info("Next request should fail. Please wait...");
let erroredWhileDisconnected = false;
try {
  await webln.getBalance();
} catch (error) {
  erroredWhileDisconnected = true;
  console.info("✅");
}
if (!erroredWhileDisconnected) {
  console.error("There was no error. Did you disconnect from the internet?");
  return;
}
const rl3 = readline.createInterface({ input, output });
await rl3.question(
  "Reconnect to the internet (and possibly choose a different WIFI network) and then press enter",
);
rl3.close();
rl3.removeAllListeners();

const response2 = await webln.getBalance();
console.info(response2);

webln.close();
