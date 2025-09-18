import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { Client, OAuth2User } from "@getalby/sdk/oauth";

const rl = readline.createInterface({ input, output });

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Please set CLIENT_ID and CLIENT_SECRET");
}


const authClient = new OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080/callback",
  user_agent:"AlbySDK-Example/0.1 (create_webhook-demo)",
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
console.log(await authClient.generateAuthURL());
console.log("----\n");

const code = await rl.question("Code: (localhost:8080?code=[THIS CODE]: ");

const webhookUrl = await rl.question("Enter your webhook URL (get a test URL at https://webhook.site/): ");
rl.close();

await authClient.requestAccessToken(code);
console.log(authClient.token);
const client = new Client(authClient);

// Create a webhook
const webhook = await client.createWebhookEndpoint({
  url: webhookUrl,
  filter_types: ["invoice.incoming.settled", "invoice.outgoing.settled"],
});
console.log("Webhook Id: ", JSON.stringify(webhook.id));


