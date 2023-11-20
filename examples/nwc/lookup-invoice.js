import * as crypto from "node:crypto"; // required in node.js
global.crypto = crypto; // required in node.js
import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl = await rl.question(
  "Nostr Wallet Connect URL (nostr+walletconnect://...): ",
);
rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();
const response = await webln.lookupInvoice({
  // provide one of the below
  //invoice: 'lnbc10n1pjwxschpp5hg0pw234n9ww9q4uy25pnvu8y4jzpznysasyf7m9fka36t7fahysdqufet5xgzhv43ycn3qv4uxzmtsd3jscqzzsxqyz5vqsp5uw023qhxuxqfj69rvj9yns5gufczad5gqw4uer5cgqhw90slkavs9qyyssqvv2tw6c30ssgtpejc3zk7ns0svuj8547d8wxj0e36hltljx5a8x4qj59mk2y7qlt6qazf2j38fzc8uag3887nslxz6fe3vnyvg0f2xqqnlvcu2',
  payment_hash:
    "ba1e172a35995ce282bc22a819b3872564208a64876044fb654dbb1d2fc9edc9",
});

console.info(response);

webln.close();
