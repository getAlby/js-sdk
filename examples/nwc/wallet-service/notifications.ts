import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const walletServiceSecretKey = bytesToHex(generateSecretKey());
const walletServicePubkey = getPublicKey(hexToBytes(walletServiceSecretKey));

const clientSecretKey = bytesToHex(generateSecretKey());
const clientPubkey = getPublicKey(hexToBytes(clientSecretKey));

const DEFAULT_RELAY_URLs = "wss://relay.getalby.com/v1";

const rl = readline.createInterface({ input, output });

const relayUrls = (
  (await rl.question(
    `Relay URLs, comma separated (${DEFAULT_RELAY_URLs}): `,
  )) || DEFAULT_RELAY_URLs
).split(",");
rl.close();

const nwcUrl = `nostr+walletconnect://${walletServicePubkey}?relay=${relayUrls.join("&relay=")}&secret=${clientSecretKey}`;

console.info("enter this NWC URL in a client: ", nwcUrl);
console.info(
  "This example does not send real payments. pay_invoice returns a dummy preimage/fee and publishes a payment_sent notification.",
);

import {
  NWCWalletService,
  NWCWalletServiceKeyPair,
  Nip47PayInvoiceRequest,
} from "@getalby/sdk/nwc";

const walletService = new NWCWalletService({
  relayUrls,
});

// This example only fakes payment_sent; do not advertise types you never publish.
await walletService.publishWalletServiceInfoEvent(
  walletServiceSecretKey,
  ["get_info", "pay_invoice"],
  ["payment_sent"],
);

const keypair = new NWCWalletServiceKeyPair(
  walletServiceSecretKey,
  clientPubkey,
);

const unsub = await walletService.subscribe(keypair, {
  getInfo: () => {
    return Promise.resolve({
      result: {
        methods: ["get_info", "pay_invoice"],
        notifications: ["payment_sent"],
        alias: "Alby Hub",
        color: "#EFA911",
        pubkey: walletServicePubkey,
        network: "mainnet",
        block_height: 800000,
        block_hash: "0000...0000",
      },
      error: undefined,
    });
  },
  payInvoice: async (request: Nip47PayInvoiceRequest) => {
    const now = Math.floor(Date.now() / 1000);
    // Dummy values only — no Lightning payment is made.
    const preimage = bytesToHex(generateSecretKey());
    const feesPaid = 1000; // 1 sat, example only
    const transaction = {
      type: "outgoing" as const,
      state: "settled" as const,
      invoice: request.invoice,
      description: "",
      description_hash: "",
      preimage,
      payment_hash: "00".repeat(32),
      amount: request.amount ?? 1000,
      fees_paid: feesPaid,
      settled_at: now,
      created_at: now,
      expires_at: now,
    };

    await walletService.publishNotification(keypair, {
      notification_type: "payment_sent",
      notification: transaction,
    });

    return {
      result: { preimage, fees_paid: feesPaid },
      error: undefined,
    };
  },
});

console.info("Waiting for events...");
process.on("SIGINT", function () {
  console.info("Caught interrupt signal");

  unsub();
  walletService.close();

  process.exit();
});
