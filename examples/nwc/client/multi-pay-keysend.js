import * as crypto from "node:crypto"; // required in node.js
global.crypto = crypto; // required in node.js
import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
});

const keysends = [
  {
    pubkey:
      "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
    amount: 1000, // millisats
    tlv_records: [
      {
        type: 696969,
        value: "017rsl75kNnSke4mMHYE", // hello@getalby.com
      },
      {
        type: 34349334,
        value: "first keysend message",
      },
    ],
  },
  {
    pubkey:
      "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
    amount: 1000, // millisats
    tlv_records: [
      {
        type: 696969,
        value: "1KOZHzhLs2U7JIx3BmEY", // another Alby account
      },
      {
        type: 34349334,
        value: "second keysend message",
      },
    ],
  },
];

try {
  const response = await client.multiPayKeysend({ keysends });
  console.info(JSON.stringify(response));
} catch (error) {
  console.error("multi_pay_keysend failed", error);
}

client.close();
