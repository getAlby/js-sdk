import "../crypto-polyfill.js";
import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { webln as providers } from "../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));

const invoiceOrPaymentHash = await rl.question("Invoice or payment hash: ");
rl.close();

const webln = new providers.NostrWebLNProvider({
  nostrWalletConnectUrl: nwcUrl,
});
await webln.enable();
const response = await webln.lookupInvoice({
  // provide one of the below
  paymentRequest: invoiceOrPaymentHash.startsWith("ln")
    ? invoiceOrPaymentHash
    : undefined,
  paymentHash: !invoiceOrPaymentHash.startsWith("ln")
    ? invoiceOrPaymentHash
    : undefined,
});

console.info(response);

webln.close();
