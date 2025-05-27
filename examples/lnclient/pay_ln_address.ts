import "websocket-polyfill"; // required in node.js

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// ⚠️ Using locally built SDK for testing — run `pnpm build` before running this example.
import { LN, USD } from "../../dist/index.module.js";
import type { LNClient } from "../../dist/index";


async function main() {
  const rl = readline.createInterface({ input, output });

  const nwcUrl =
    process.env.NWC_URL ||
    (await rl.question(
      "Nostr Wallet Connect URL (nostr+walletconnect://...): ",
    ));
  rl.close();

  // Cast to LNClient to satisfy TypeScript — the LN class matches the interface at runtime
  const client = new LN(nwcUrl) as unknown as LNClient;
  console.info("Paying $1");
  const response = await client.pay("hello@getalby.com", USD(1.0), {
    metadata: { comment: "Payment from JS SDK", payer_data: { name: "Bob" } },
  });
  console.info("Paid successfully", response);
  client.close(); // when done and no longer needed close the wallet connection
}

main().catch((error) => {
  console.error("Error occurred:", error);
  process.exit(1);
});