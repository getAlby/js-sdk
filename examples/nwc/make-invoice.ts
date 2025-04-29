import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "../../dist/index.module.js";
import type { webln as WebLN } from "../../dist/index";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
}) as unknown as WebLN.NostrWebLNProvider;


await webln.enable();
const response = await webln.makeInvoice({
  amount: 1, // in sats
  defaultMemo: "NWC WebLN example",
});

console.info(response);

webln.close();
