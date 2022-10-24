import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { auth, Client } from "../dist/index.module.js";

const rl = readline.createInterface({ input, output });

const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080/callback",
  scopes: ["invoices:read", "account:read", "balance:read", "invoices:create", "invoices:read", "payments:send"],
  token: {access_token: undefined, refresh_token: undefined, expires_at: undefined} // initialize with existing token
});

console.log(`Open the following URL and authenticate the app:`);
console.log(authClient.generateAuthURL());
console.log("----\n");

const code = await rl.question('Code: (localhost:8080?code=[THIS CODE]: ');
rl.close();

await authClient.requestAccessToken(code);
console.log(authClient.token);
const client = new Client(authClient);

const response = await client.sendBoostagram({
  recipient: {
    address: '030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3',
    customKey: '696969',
    customValue: 'bNVHj0WZ0aLPPAesnn9M'
  },
  amount: 10,
  // spec: https://github.com/lightning/blips/blob/master/blip-0010.md
  boostagram: {
    "app_name": "Alby SDK Demo",
    "value_msat_total": 49960, // TOTAL Number of millisats for the payment (all splits together, before fees. The actual number someone entered in their player, for numerology purposes.)
    "value_msat": 2121, // Number of millisats for this split payment
    "url": "https://feeds.buzzsprout.com/xxx.rss",
    "podcast": "Podcast title",
    "action": "boost",
    "episode": "The episode title",
    "episode_guid": "Buzzsprout-xxx",
    "ts": 574,
    "name": "Podcaster - the recipient name",
    "sender_name": "Satoshi - the sender/listener name"
  }
});

console.log(response);
