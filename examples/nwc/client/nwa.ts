import qrcode from "qrcode-terminal";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { NWAClient } from "@getalby/sdk/nwc";

const rl = readline.createInterface({ input, output });

//const DEFAULT_RELAY_URLs = "ws://localhost:7447/v1,ws://localhost:7448/v1";
const DEFAULT_RELAY_URLs = "wss://relay.getalby.com/v1";

const relayUrls =
  (await rl.question(
    `Relay URLs, comma separated (${DEFAULT_RELAY_URLs}): `,
  )) || DEFAULT_RELAY_URLs;
rl.close();

const nwaClient = new NWAClient({
  relayUrls: relayUrls.split(","),
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
