import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { Nip47Notification, NWCClient } from "@getalby/sdk/nwc";
import { Invoice } from "@getalby/lightning-tools";

console.warn(
  "Alby Hub WARNING: This currently only works with Alby Hub LND backend or self payments between sub-wallets\n",
);

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));

const upstreamInvoice = await rl.question("Upstream Invoice: ");

const paymentHash = new Invoice({ pr: upstreamInvoice.trim() }).paymentHash;
console.info("Payment hash:", paymentHash);

const amount =
  parseInt(
    (await rl.question("Extra amount in sats (default 1 sat): ")) || "1",
  ) * 1000;

rl.close();

const client = new NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

const response = await client.makeHoldInvoice({
  amount, // in millisats
  description: "NWC HODL invoice example",
  payment_hash: paymentHash,
  // or set a 256-bit description hash:
  //description_hash: "a40f2b27a4414044995b26b73eb5aa66688b5f18d6a8a2513827d9a116ad95f1",
});

console.info(response.invoice);

const onNotification = async (notification: Nip47Notification) => {
  if (notification.notification.payment_hash !== paymentHash) {
    console.info("Skipping unrelated notification", notification);
    return;
  }
  console.info(
    "HOLD invoice accepted! It can be settled or canceled before block " +
      notification.notification.settle_deadline,
  );

  console.info("Paying upstream invoice", upstreamInvoice);

  const { preimage } = await client.payInvoice({
    invoice: upstreamInvoice,
  });

  console.info("Paid upstream invoice", preimage);

  //lnbcrt10u1p5cauyapp5mdxq8a3fwjnq77cyfzrq9sj0988n9z6x2ehkwathlrqj92ey08kqdqqcqzzsxqyz5vqsp5qzl9g4qxkm3cnfqu28j2fcelgfqg33pex6gstkf5h7t4sfdfsu4s9qyyssqzqm4w9xp2sntujxeplyw0uprzc7kwlfc0039gwfe7nl008zzvc249y3hhv7ssl9mw7elq29qw67zwe26kfru6gw9wqjadxr3qduzq7cqpxcamz

  await client.settleHoldInvoice({ preimage });

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
