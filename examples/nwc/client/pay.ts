import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { NWCClient } from "@getalby/sdk/nwc";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
const payment = await rl.question(
  "BIP-321 payment URI (bitcoin:?lightning=lnbc...): ",
);
rl.close();

const client = new NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

const response = await client.pay({
  payment,
  // amount: 1000, // in millisats, required if the selected payment instruction has no amount
  // payer_note: "a message from the payer",
});

console.info(response);

client.close();
