import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index"; 


const rl = readline.createInterface({ input, output });

const nwcUrl =
  process.env.NWC_URL ||
  (await rl.question("Nostr Wallet Connect URL (nostr+walletconnect://...): "));
rl.close();

const client = new nwc.NWCClient({
  nostrWalletConnectUrl: nwcUrl,
}) as NWC.NWCClient;

// ! Method getWalletServiceSupportedMethods does not exist in the NWCClient class
// TODO implement this method or remove this example
// const response = await client.getWalletServiceSupportedMethods();

// console.info(response);

client.close();
