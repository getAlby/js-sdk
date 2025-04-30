import "websocket-polyfill"; // required in node.js
import qrcode from "qrcode-terminal";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { nwc } from "../../../dist/index.module.js";
import type { nwc as NWC } from "../../../dist/index";

const rl = readline.createInterface({ input, output });

const DEFAULT_RELAY_URL = "wss://relay.getalby.com/v1";

async function main() {
  const relayUrl: string =
    (await rl.question(`Relay URL (${DEFAULT_RELAY_URL}): `)) ||
    DEFAULT_RELAY_URL;
  rl.close();

  const nwaClient = new nwc.NWAClient({
    relayUrl,
    requestMethods: ["get_info"],
  }) as NWC.NWAClient;

  console.info(
    "Scan or enter the following NWA connection URI in your wallet:",
  );
  qrcode.generate(nwaClient.connectionUri, { small: true });
  console.info(nwaClient.connectionUri);

  console.info("\nWaiting for connection...");

  await nwaClient.subscribe({
    onSuccess: async (nwcClient: NWC.NWCClient) => {
      console.info("NWA successful", nwcClient.options);
      const response = await nwcClient.getInfo();
      console.info(response);
      nwcClient.close();
    },
  });
}

main().catch((error) => {
  console.error("Unexpected error:", error);
});
