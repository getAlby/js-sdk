import "websocket-polyfill"; // required in node.js
import qrcode from "qrcode-terminal";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { LN, USD, SATS, nwc } from "@getalby/sdk";

/*  
 * This example shows how to use the Alby SDK to create a split payment
 * where a user pays an invoice and the payment is split between multiple
 * recipients. The user pays a single invoice, and the server forwards the
 * payment to multiple recipients based on a specified percentage. 

*/

async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  const nwcUrl =
    process.env.NWC_URL ||
    (await rl.question(
      "Nostr Wallet Connect URL (nostr+walletconnect://...): ",
    ));
  rl.close();

  const amount = USD(1.0);
  const recipients = ["rolznz@getalby.com", "hello@getalby.com"];
  const forwardPercentage = 50;

  const client = new LN(nwcUrl);

  // request an lightning invoice
  const request = await client.requestPayment(amount, {
    description: "[TEST] Split Payment Example",
  });

  // prompt the user to pay the invoice
  qrcode.generate(request.invoice.paymentRequest, { small: true });
  console.info(request.invoice.paymentRequest);
  console.info("Please pay the above invoice within 60 seconds.");
  console.info("Waiting for payment...");

  //the feilds here are optional, but can be used to store metadata about the payment
  const payArgs = (r: string): nwc.Nip47TransactionMetadata => {
    return {
      comment: "[TEST] Payment from Alby SDK Split Payment Example",
      payer_data: {
        email: "dunsin@getalby.com",
        name: "Dunsin (Test User)",
        pubkey:
          "npub183zjuwwlud4tyvntp76zugkg4vlewuwcutcle05w6ysm77jast2sqyxqgv",
      },
      recipient_data: {
        identifier: r,
      },
      nostr: {
        pubkey: "npub1yyy...",
        tags: [["p", "npub1zzz..."]],
      },
    };
  };

  // once the invoice got paid by the user run this callback
  request
    .onPaid(async () => {
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
          const response = await client.pay(r, SATS(satsToForward), {
            metadata: payArgs(r),
          });
          console.info(
            `Forwarded ${satsToForward} sats to ${r} (preimage: ${response.preimage})`,
          );
        }),
      );
      client.close(); // when done and no longer needed close the wallet connection
      process.exit();
    })
    .onTimeout(60, () => {
      console.info("didn't receive payment in time.");
      client.close(); // when done and no longer needed close the wallet connection
      process.exit();
    });

  process.on("SIGINT", function () {
    console.info("Caught interrupt signal");
    process.exit();
  });
}

main().catch((err) => {
  console.error("Unexpected error:", err);
});
