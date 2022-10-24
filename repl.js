import * as repl from 'node:repl';
import { auth, Client } from "./dist/index.module.js";

const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080/callback",
  scopes: ["invoices:read", "account:read", "balance:read", "invoices:create", "invoices:read", "payments:send"],
  token: {access_token: process.env.ACCESS_TOKEN, refresh_token: undefined, expires_at: undefined} // initialize with existing token
});


console.log('Welcome to the alby-js-sdk REPL');

if (!process.env.CLIENT_ID) {
  console.log("Configure the environment variable `CLIENT_ID` and option; `CLIENT_SECRET`, `ACCESS_TOKEN`");
  process.exit();
}

console.log('use `authClient` and `alby` (the client)');


const r = repl.start('> ');
r.context.authClient = authClient;
r.context.alby = new Client(authClient);
