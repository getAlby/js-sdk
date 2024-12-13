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

// from https://stackoverflow.com/a/50868276
const toHexString = (bytes) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

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
  sender_name: "Satoshi Nakamoto",
  message: "Go podcasting!",
};

const response = await client.payKeysend({
  amount: 1000, // millisats
  pubkey: "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
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
});

console.info(response);

client.close();
