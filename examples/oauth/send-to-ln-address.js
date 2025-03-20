import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { auth, Client } from "../../dist/index.module.js";
import { LightningAddress } from "alby-tools";

const rl = readline.createInterface({ input, output });

const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080",
  scopes: ["payments:send"],
  token: {
    access_token: undefined,
    refresh_token: undefined,
    expires_at: undefined,
  }, // initialize with existing token
});

console.log(`Open the following URL and authenticate the app:`);
console.log(await authClient.generateAuthURL());
console.log("----\n");

const code = await rl.question("Code: (localhost:8080?code=[THIS CODE]: ");
rl.close();

await authClient.requestAccessToken(code);
console.log(authClient.token);
const client = new Client(authClient);

const ln = new LightningAddress("hello@getalby.com");
// fetch the LNURL data
await ln.fetch();

const invoice = await ln.requestInvoice({ satoshi: 1000 });

const response = await client.sendPayment({ invoice: invoice.paymentRequest });

console.log(JSON.stringify(response, null, 2));
