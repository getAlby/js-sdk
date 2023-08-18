import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { auth, Client } from "../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080/callback",
  scopes: [
    "invoices:read",
    "account:read",
    "balance:read",
    "invoices:create",
    "invoices:read",
    "payments:send",
  ],
  token: {
    access_token: undefined,
    refresh_token: undefined,
    expires_at: undefined,
  }, // initialize with existing token
});

console.log(`Open the following URL and authenticate the app:`);
console.log(authClient.generateAuthURL());
console.log("----\n");

const code = await rl.question("Code: (localhost:8080?code=[THIS CODE]: ");
rl.close();

await authClient.requestAccessToken(code);
console.log(authClient.token);
const client = new Client(authClient);

// Create a webhook
response = await alby.createWebhookEndpoint({
  url: "https://example.com",
  filter_types: ["invoice.settled"],
});

// Delete a webhook
// response = await alby.deleteWebhookEndpoint('ep_...').then(console.log)

console.log(JSON.stringify(response));
