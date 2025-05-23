import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));

const amount =
  parseInt((await rl.question("Amount in sats (default 1 sat): ")) || "1") *
  1000;

rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

const toHexString = (bytes) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

const preimageBytes = crypto.getRandomValues(new Uint8Array(32));
const preimage = toHexString(preimageBytes);

const hashBuffer = await crypto.subtle.digest("SHA-256", preimageBytes);
const paymentHashBytes = new Uint8Array(hashBuffer);
const paymentHash = toHexString(paymentHashBytes);

const response = await client.makeHoldInvoice({
  amount, // in millisats
  description: "NWC HODL invoice example",
  payment_hash: paymentHash,
  // or set a 256-bit description hash:
  //description_hash: "a40f2b27a4414044995b26b73eb5aa66688b5f18d6a8a2513827d9a116ad95f1",
});

console.info(response.invoice);

const onNotification = async (notification) => {
  if (notification.notification.payment_hash !== paymentHash) {
    console.info("Skipping unrelated notification", notification);
    return;
  }
  console.info(
    "HOLD invoice accepted! It can be settled or canceled before block " +
      notification.notification.settle_deadline,
  );

  const rl = readline.createInterface({ input, output });

  const action = await rl.question("Type settle or cancel: ");

  rl.close();
  if (action === "settle") {
    console.info("Chose to settle invoice");
    await client.settleHoldInvoice({ preimage });
  } else {
    console.info("Chose to cancel invoice");
    await client.cancelHoldInvoice({ payment_hash: paymentHash });
  }
  process.exit();
};

const unsub = await client.subscribeNotifications(onNotification, [
  "hold_invoice_accepted",
]);

console.info("Waiting for payment to be made...");
process.on("SIGINT", function () {
  console.info("Caught interrupt signal");

  unsub();
  client.close();

  process.exit();
});
