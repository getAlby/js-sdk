import * as crypto from "node:crypto"; // required in node.js
global.crypto = crypto; // required in node.js
import "websocket-polyfill"; // required in node.js

import { LightningAddress } from "@getalby/lightning-tools";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const ln = new LightningAddress(process.env.LN_ADDRESS || "hello@getalby.com");
// fetch the LNURL data
await ln.fetch();

// generate 2 invoices to pay
const invoices = (
  await Promise.all(
    [1, 2].map((v) =>
      ln.requestInvoice({
        satoshi: 1,
        comment: `Multi-pay invoice #${v}`,
      }),
    ),
  )
).map((invoice) => invoice.paymentRequest);

console.info("Generated two invoices", invoices);

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

try {
  const response = await client.multiPayInvoice({
    invoices: invoices.map((invoice) => ({
      invoice,
    })),
  });
  console.info(response);
} catch (error) {
  console.error("multi_pay_invoice failed", error);
}

client.close();
