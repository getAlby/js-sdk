import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));

rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();
const response = await webln.keysend({
  amount: 1,
  destination:
    "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
  customRecords: {
    696969: "017rsl75kNnSke4mMHYE", // hello@getalby.com
    34349334: "example keysend message",
  },
});

console.info(response);

webln.close();
