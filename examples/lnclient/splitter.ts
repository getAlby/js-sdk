import "websocket-polyfill"; // Required for WebSocket support in Node.js
import qrcode from "qrcode-terminal";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// Import runtime JS and type separately
import { LN, SATS, USD } from "../../dist/index.module.js";
import type { LNClient } from "../../dist/index"; // no `.d.ts` needed here

async function main() {
  const rl = readline.createInterface({ input, output });

  const nwcUrl =
    process.env.NWC_URL ||
    (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...)"));
  rl.close();

  const amount = USD(1.0);
  const recipients = ["rolznz@getalby.com", "hello@getalby.com"];
  const forwardPercentage = 50;

  // Instantiate client
  const client = new LN(nwcUrl) as unknown as LNClient;

  // Request a lightning invoice
  const request = await client.requestPayment(amount, {
    description: "prism payment",
  });

  // Display the invoice to the user
  qrcode.generate(request.invoice.paymentRequest, { small: true });
  console.info(request.invoice.paymentRequest);
  console.info("Please pay the above invoice within 60 seconds.");
  console.info("Waiting for payment...");

  // Handle payment
  request
    .onPaid(async () => {
      const satsReceived = request.invoice.satoshi;
      const satsToForward = Math.floor(
        (satsReceived * forwardPercentage) / 100 / recipients.length,
      );

      console.info(
        `Received ${satsReceived} sats! Forwarding ${satsToForward} sats to: ${recipients.join(", ")}`,
      );

      await Promise.all(
        recipients.map(async (recipient) => {
          const response = await client.pay(recipient, SATS(satsToForward), {
            metadata: {
              comment: "Splitter Payment Payment from JS SDK",
              payer_data: { name: "Bob" },
            },
          });
          console.info(
            `Forwarded ${satsToForward} sats to ${recipient} (preimage: ${response.preimage})`,
          );
        }),
      );

      client.close(); // Close after forwarding
    })
    .onTimeout(60, () => {
      console.info("Didn't receive payment in time.");
      client.close();
    });

  // Graceful shutdown on Ctrl+C
  process.on("SIGINT", () => {
    console.info("Caught interrupt signal");
    client.close();
    process.exit();
  });
}

main().catch((error) => {
  console.error("Error occurred:", error);
  process.exit(1);
});
