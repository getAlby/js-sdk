import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index"; 


const rl = readline.createInterface({ input, output });

const nwcUrl: string =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));

const invoiceOrPaymentHash = await rl.question("Invoice or payment hash: ");
rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
}) as NWC.NWCClient;

const response = await client.lookupInvoice({
  // provide one of the below
  invoice: invoiceOrPaymentHash.startsWith("ln")
    ? invoiceOrPaymentHash
    : undefined,
  payment_hash: !invoiceOrPaymentHash.startsWith("ln")
    ? invoiceOrPaymentHash
    : undefined,
});

console.info(response);

client.close();
