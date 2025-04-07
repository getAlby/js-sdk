import "websocket-polyfill"; // required in node.js
import qrcode from "qrcode-terminal";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { LN, USD } from "../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new LN(nwcUrl);
// request a lightning invoice that we show the user to pay
const request = await client.receive(USD(1.0), { description: "best content" });

qrcode.generate(request.invoice.paymentRequest, { small: true });
console.info(request.invoice.paymentRequest);
console.info("Waiting for payment...");

// register the callback that will get executed once the user has paid the invoice
//   you can call unsub() if you no longer expect the user to pay
const unsub = await request.onPaid(() => {
  console.info("received payment!");
  client.close(); // when done and no longer needed close the wallet connection
});

process.on("SIGINT", function () {
  console.info("Caught interrupt signal");

  unsub();
  client.close();

  process.exit();
});
