import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getAuthClient } from "./helper";

const userAgent = "AlbySDK-Example/0.1 (create_webhook-demo)"

const client = await getAuthClient(userAgent);

const rl = readline.createInterface({ input, output });
const webhookUrl = await rl.question("Enter your webhook URL (get a test URL at https://webhook.site/): ");
rl.close();

// Create a webhook
const webhook = await client.createWebhookEndpoint({
  url: webhookUrl,
  filter_types: ["invoice.incoming.settled", "invoice.outgoing.settled"],
});
console.log("Webhook Id: ", JSON.stringify(webhook.id));


