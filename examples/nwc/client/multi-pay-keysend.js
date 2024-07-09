import "../../crypto-polyfill.js";
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

// Data from https://podcastindex.org/podcast/920666
const boost = {
  action: "boost",
  value_msat: 1000,
  value_msat_total: 1000,
  app_name: "⚡ WebLN Demo",
  app_version: "1.0",
  feedID: "https://feeds.podcastindex.org/pc20.xml",
  podcast: "Podcasting 2.0",
  episode: "Episode 104: A New Dump",
  ts: 21,
  name: "⚡ WebLN Demo",
  sender_name: "Sathoshi Nakamoto",
  message: "Go podcasting!",
};

// from https://stackoverflow.com/a/50868276
const toHexString = (bytes) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

const keysends = [
  {
    pubkey:
      "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
    amount: 1000, // millisats
    tlv_records: [
      {
        type: 696969,
        value: toHexString(new TextEncoder().encode("017rsl75kNnSke4mMHYE")), // hello@getalby.com
      },
      {
        type: 7629169,
        value: toHexString(new TextEncoder().encode(JSON.stringify(boost))),
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
        value: toHexString(new TextEncoder().encode("1KOZHzhLs2U7JIx3BmEY")), // another Alby account
      },
      {
        type: 7629169,
        value: toHexString(new TextEncoder().encode(JSON.stringify(boost))),
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
