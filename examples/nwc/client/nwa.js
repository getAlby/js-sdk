import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwa } from "../../../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const DEFAULT_RELAY_URL = "wss://relay.getalby.com/v1";

const relayUrl =
  (await rl.question(`Relay URL (${DEFAULT_RELAY_URL}): `)) ||
  DEFAULT_RELAY_URL;
rl.close();

const nwaClient = new nwa.NWAClient({
  relayUrl,
  requestMethods: ["get_info"],
});

console.info(
  "enter the following NWA connection URI into your wallet",
  nwaClient.connectionUri,
);

console.info("Waiting for connection...");

await nwaClient.subscribe({
  onSuccess: async (nwcClient) => {
    console.info("NWA successful", nwcClient.options);
    const response = await nwcClient.getInfo();

    console.info(response);

    nwcClient.close();
  },
});
