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

const amount = USD(1.0);
const recipients = ["rolznz@getalby.com", "hello@getalby.com"];
const forwardPercentage = 50;

const client = new LN(nwcUrl);

// request an lightning invoice
const request = await client.receive(amount, { description: "prism payment" });

// prompt the user to pay the invoice
qrcode.generate(request.invoice.paymentRequest, { small: true });
console.info(request.invoice.paymentRequest);
console.info("Waiting for payment...");

// once the invoice got paid by the user run this callback
const unsub = await request.onPaid(async () => {
  // we take the sats amount from theinvocie and calculate the amount we want to forward
  const satsReceived = request.invoice.satoshi;
  const satsToForward = Math.floor(
    (satsReceived * forwardPercentage) / 100 / recipients.length,
  );
  console.info(
    `Received ${satsReceived} sats! Forwarding ${satsToForward} to the ${recipients.join(", ")}`,
  );

  // iterate over all recipients and pay them the amount
  await Promise.all(
    recipients.map(async (r) => {
      const response = await client.pay(r, satsToForward, "splitter");
      console.info(
        `Forwarded ${satsToForward} sats to ${r} (preimage: ${response.preimage})`,
      );
    }),
  );
  client.close();
});

process.on("SIGINT", function () {
  console.info("Caught interrupt signal");

  unsub();
  client.close();

  process.exit();
});
