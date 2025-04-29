import { oauth } from "../../dist/index.module.js";
import type { oauth as OAuth } from "../../dist/index";
import express, { Request, Response } from "express";

// Ensure CLIENT_ID and CLIENT_SECRET are set
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Please set CLIENT_ID and CLIENT_SECRET");
}

// Initialize Express app
const app = express();

// OAuth2Client setup
const authClient = new oauth.auth.OAuth2User({
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
  }, // Initialize with existing token
}) as unknown as OAuth.auth.OAuth2User;

const client = new oauth.Client(authClient) as OAuth.Client;

// Set state for OAuth flow
const STATE = "my-state";

// Callback route after OAuth authorization
app.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    if (state !== STATE) return res.status(500).send("State isn't matching");

    // Request access token
    await authClient.requestAccessToken(code as string);
    console.log(authClient);

    // Get account balance
    const invoices = await client.accountBalance({});
    res.send(invoices);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error during OAuth callback");
  }
});

// Login route to redirect to OAuth authorization URL
app.get("/login", async (req: Request, res: Response) => {
  try {
    const authUrl = await authClient.generateAuthURL({
      state: STATE,
      code_challenge_method: "S256",
    });
    res.redirect(authUrl);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error generating auth URL");
  }
});

// Route to get account balance
app.get("/balance", async (req: Request, res: Response) => {
  try {
    const result = await client.accountBalance({});
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching balance");
  }
});

// Route to get account summary
app.get("/summary", async (req: Request, res: Response) => {
  try {
    const result = await client.accountSummary({});
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching summary");
  }
});

// Route for Value4Value
app.get("/value4value", async (req: Request, res: Response) => {
  try {
    const result = await client.accountValue4Value({});
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error fetching value4value info");
  }
});

// Route to create an invoice
app.get("/make-invoice", async (req: Request, res: Response) => {
  try {
    const result = await client.createInvoice({ amount: 1000 });
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error creating invoice");
  }
});

// Route to send payment using a Bolt11 invoice
app.get("/bolt11/:invoice", async (req: Request, res: Response) => {
  try {
    const result = await client.sendPayment({ invoice: req.params.invoice });
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error sending payment");
  }
});

// Route to perform a keysend payment
app.get("/keysend/:destination", async (req: Request, res: Response) => {
  try {
    const result = await client.keysend({
      destination: req.params.destination,
      amount: 10,
      memo: req.query.memo as string,
    });
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error performing keysend");
  }
});

// Route to refresh access token
app.get("/refresh", async (req: Request, res: Response) => {
  try {
    await authClient.refreshAccessToken();
    res.send("Refreshed Access Token");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error refreshing access token");
  }
});

// Start the server
app.listen(8080, () => {
  console.log(`Go here to login: http://localhost:8080/login`);
});
