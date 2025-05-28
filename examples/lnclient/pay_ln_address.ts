import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { LN, USD } from "@getalby/sdk";

async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  const nwcUrl =
    process.env.NWC_URL ||
    (await rl.question(
      "Nostr Wallet Connect URL (nostr+walletconnect://...): ",
    ));
  rl.close();

  const client = new LN(nwcUrl);
  console.info("Paying $1");
  try {
    const response = await client.pay("hello@getalby.com", USD(1.0), {
      metadata: {
        comment: "Payment from TypeScript SDK",
        payer_data: { name: "Bob" },
      },
    });

    console.info("Paid successfully:", response);
  } catch (error) {
    console.error("Payment failed:", error);
  } finally {
    client.close(); 
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
});
