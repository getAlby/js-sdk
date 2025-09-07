import "websocket-polyfill"; // required in node.js
import qrcode from "qrcode-terminal";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { NWAClient } from "@getalby/sdk/nwc";

const rl = readline.createInterface({ input, output });

const DEFAULT_RELAY_URL = "wss://relay.getalby.com/v1";

const relayUrl =
  (await rl.question(`Relay URL (${DEFAULT_RELAY_URL}): `)) ||
  DEFAULT_RELAY_URL;
rl.close();

const nwaClient = new NWAClient({
  relayUrl,
  requestMethods: ["get_info"],
});

console.info("Scan or enter the following NWA connection URI in your wallet:");

// this prints the QR code
qrcode.generate(nwaClient.connectionUri, { small: true });

console.info(nwaClient.connectionUri);

console.info("\nWaiting for connection...");

await nwaClient.subscribe({
  onSuccess: async (nwcClient) => {
    console.info("NWA successful", nwcClient.options);
    const response = await nwcClient.getInfo();

    console.info(response);

    nwcClient.close();
  },
});
