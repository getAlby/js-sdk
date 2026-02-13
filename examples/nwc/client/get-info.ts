
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { NWCClient } from "@getalby/sdk/nwc";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});
const response = await client.getInfo();

console.info(response);

client.close();
