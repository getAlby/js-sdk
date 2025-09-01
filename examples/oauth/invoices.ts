import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {  Client, GetInvoicesRequestParams, OAuth2User } from "@getalby/sdk/oauth";

const rl = readline.createInterface({ input, output });

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Please set CLIENT_ID and CLIENT_SECRET");
}


const authClient = new OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080",
  scopes: ["invoices:read", "account:read", "balance:read"],
  user_agent:"AlbySDK-Example/0.1 (invoices-demo)",
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

const params:GetInvoicesRequestParams = {
  page: 1,
  items: 5
}
const response = await client.incomingInvoices(params);

console.log(JSON.stringify(response, null, 2));

if (response[0]) {
  const invoice = await client.getInvoice(response[0].r_hash_str);
  console.log(JSON.stringify(invoice, null, 2));
}
