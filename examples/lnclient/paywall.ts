import "websocket-polyfill"; // required in node.js
import qrcode from "qrcode-terminal";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { LN, USD } from "../../dist/index.module.js";
import type {LNClient} from "../../dist/index.d.ts";


const rl = readline.createInterface({ input, output });

async function main(): Promise<void> {
  const nwcUrl: string =
    process.env.NWC_URL ||
    (await rl.question(
      "Nostr Wallet Connect URL (nostr+walletconnect://...): ",
    ));
  rl.close();

  const client = new LN(nwcUrl) as LNClient;

  // request a lightning invoice that we show the user to pay
  const request = await client.requestPayment(USD(1.0), {
    description: "best content",
  });

  qrcode.generate(request.invoice.paymentRequest, { small: true });
  console.info(request.invoice.paymentRequest);
  console.info("Please pay the above invoice within 60 seconds.");
  console.info("Waiting for payment...");

  // once the invoice got paid by the user run this callback
  request
    .onPaid(() => {
      console.info("received payment!");
      client.close(); // when done and no longer needed close the wallet connection
    })
    .onTimeout(60, () => {
      console.info("didn't receive payment in time.");
      client.close(); // when done and no longer needed close the wallet connection
    });

  process.on("SIGINT", function () {
    console.info("Caught interrupt signal");
    process.exit();
  });
}

main().catch(console.error);