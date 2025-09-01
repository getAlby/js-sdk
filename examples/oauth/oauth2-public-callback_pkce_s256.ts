import { oauth } from "../../dist/index.module.js";
const { auth, Client } = oauth;
import express from "express";

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Please set CLIENT_ID and CLIENT_SECRET");
}

const app = express();

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

const client = new Client(authClient);

const STATE = "my-state";

app.get("/callback", async function (req, res) {
  try {
    const { code, state } = req.query;
    if (state !== STATE) return res.status(500).send("State isn't matching");
    await authClient.requestAccessToken(code);
    console.log(authClient);
    const invoices = await client.accountBalance();
    res.send(invoices);
  } catch (error) {
    console.log(error);
  }
});

app.get("/login", async function (req, res) {
  const authUrl = await authClient.generateAuthURL({
    state: STATE,
    code_challenge_method: "S256",
  });
  res.redirect(authUrl);
});

app.get("/balance", async function (req, res) {
  const result = await client.accountBalance();
  res.send(result);
});

app.get("/summary", async function (req, res) {
  const result = await client.accountSummary();
  res.send(result);
});

app.get("/value4value", async function (req, res) {
  const result = await client.accountValue4Value();
  res.send(result);
});

app.get("/make-invoice", async function (req, res) {
  const result = await client.createInvoice({ amount: 1000 });
  res.send(result);
});

app.get("/bolt11/:invoice", async function (req, res) {
  const result = await client.sendPayment({ invoice: req.params.invoice });
  res.send(result);
});

app.get("/keysend/:destination", async function (req, res) {
  const result = await client.keysend({
    destination: req.params.destination,
    amount: 10,
    memo: req.query.memo,
  });
  res.send(result);
});

app.get("/refresh", async function (req, res) {
  try {
    await authClient.refreshAccessToken();
    res.send("Refreshed Access Token");
  } catch (error) {
    console.log(error);
  }
});

app.listen(8080, () => {
  console.log(`Go here to login: http://localhost:8080/login`);
});
