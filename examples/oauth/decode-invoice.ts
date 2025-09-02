import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {  Client, OAuth2User  } from "@getalby/sdk/oauth";


const rl = readline.createInterface({ input, output });

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Please set CLIENT_ID and CLIENT_SECRET");
}

const paymentRequest =
  "lnbc10u1pj4t6w0pp54wm83znxp8xly6qzuff2z7u6585rnlcw9uduf2haa42qcz09f5wqdq023jhxapqd4jk6mccqzzsxqyz5vqsp5mlvjs8nktpz98s5dcrhsuelrz94kl2vjukvu789yzkewast6m00q9qyyssqupynqdv7e5y8nlul0trva5t97g7v3gwx7akhu2dvu4pn66eu2pr5zkcnegp8myz3wrpj9ht06pwyfn4dvpmnr96ejq6ygex43ymaffqq3gud4d";

const authClient = new OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080",
  user_agent:"AlbySDK-Example/0.1 (decode-invoice-demo)",
  scopes: ["invoices:read"], // this scope isn't needed, but at least one scope is required to get an access token
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

const response = await client.decodeInvoice(paymentRequest);

console.log(JSON.stringify(response, null, 2));
