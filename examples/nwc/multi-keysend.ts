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

const keysends = [
  {
    destination:
      "02947ea84b359c2e902c10e173aa209a36c2f92a6143c73170eb72b2077c592187",
    amount: 1,
  },
  {
    destination:
      "02947ea84b359c2e902c10e173aa209a36c2f92a6143c73170eb72b2077c592187",
    amount: 1,
    customRecords: {
      696969: "304", // keysend payment to example Alby Hub sub-wallet (app ID 304) or a custodial wallet account
    },
  },
];

try {
  const response = await webln.multiKeysend(keysends);
  console.info(JSON.stringify(response));
} catch (error) {
  console.error("multiKeysend failed", error);
}

webln.close();
