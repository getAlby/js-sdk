import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { NWCClient } from "@getalby/sdk/nwc";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));

const amount =
  parseInt((await rl.question("Amount in sats (default 1 sat): ")) || "1") *
  1000;

rl.close();

const client = new NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

const response = await client.receive({
  amount, // in millisats; omit for a variable amount (if supported by the wallet)
  description: "NWC Client example",
});

console.info(response);

client.close();
