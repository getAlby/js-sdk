import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { oauth } from "../../dist/index.module.js";
const { auth, Client } = oauth;

const rl = readline.createInterface({ input, output });

const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080",
  scopes: ["invoices:read", "account:read", "balance:read"],
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

const response = await client.incomingInvoices();

console.log(JSON.stringify(response, null, 2));

if (response[0]) {
  const invoice = await client.getInvoice(response[0].r_hash_str);
  console.log(JSON.stringify(invoice, null, 2));
}
