import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {  Client, OAuth2User } from "@getalby/sdk/oauth";


const rl = readline.createInterface({ input, output });

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Please set CLIENT_ID and CLIENT_SECRET");
}

const authClient = new OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080/callback",
   user_agent:"AlbySDK-Example/0.1 (boostagram-demo)",
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
rl.close();

await authClient.requestAccessToken(code);
console.log(authClient.token);
const client = new Client(authClient);

// use an array if you want to send multiple boostagrams with one call
const response = await client.sendBoostagram([
  {
    recipient: {
      address:
        "02947ea84b359c2e902c10e173aa209a36c2f92a6143c73170eb72b2077c592187",
      customKey: "696969",
      customValue: "bNVHj0WZ0aLPPAesnn9M",
    },
    amount: 10,
    // spec: https://github.com/lightning/blips/blob/master/blip-0010.md
    boostagram: {
      app_name: "Alby SDK Demo",
      value_msat_total: 49960, // TOTAL Number of millisats for the payment (all splits together, before fees. The actual number someone entered in their player, for numerology purposes.)
      value_msat: 2121, // Number of millisats for this split payment
      url: "https://feeds.buzzsprout.com/xxx.rss",
      podcast: "Podcast title",
      action: "boost",
      episode: "The episode title",
      episode_guid: "Buzzsprout-xxx",
      ts: 574,
      name: "Podcaster - the recipient name",
      sender_name: "Satoshi - the sender/listener name",
    },
  },
]);

console.log(JSON.stringify(response));
