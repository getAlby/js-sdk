import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getAuthClient } from "./helper";

const userAgent = "AlbySDK-Example/0.1 (delete_webhook-demo)"

const client = await getAuthClient(userAgent);

const rl = readline.createInterface({ input, output });
const webhookId = await rl.question("Enter the webhook ID to delete: ");
rl.close();

// Delete a webhook
const deleteResult  = await client.deleteWebhookEndpoint(webhookId)
console.log("webhook deleted", JSON.stringify(deleteResult));