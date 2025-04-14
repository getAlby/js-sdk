# OAuth API Documentation

Please have a look a the Alby OAuth2 Wallet API:

[https://guides.getalby.com/alby-wallet-api/reference/getting-started](https://guides.getalby.com/alby-wallet-api/reference/getting-started)

## Available methods

- accountBalance
- accountSummary
- signMessage
- accountInformation
- accountValue4Value
- invoices
- incomingInvoices
- outgoingInvoices
- getInvoice
- createInvoice
- decodeInvoice
- keysend
- sendPayment
- sendBoostagram
- sendBoostagramToAlbyAccount
- createWebhookEndpoint
- deleteWebhookEndpoint

### Examples

#### Full OAuth Authentication flow

```js
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

const authUrl = await authClient.generateAuthURL({
  code_challenge_method: "S256",
  // authorizeUrl: "https://getalby.com/oauth"  endpoint for authorization (replace with the appropriate URL based on the environment)
});
// open auth URL
// `code` is passed as a query parameter when the user is redirected back after authorization
await authClient.requestAccessToken(code);

// access the token response. You can store this securely for future client initializations
console.log(authClient.token);

// initialize a client
const client = new Client(authClient);

const result = await client.accountBalance();
```

#### Initialize a client from existing token details

```js
const token = loadTokenForUser(); // {access_token: string, refresh_token: string, expires_at: number}
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  callback: "http://localhost:8080/callback",
  scopes: [
    "invoices:read",
    "account:read",
    "balance:read",
    "invoices:create",
    "invoices:read",
    "payments:send",
  ],
  token: token,
});

const client = new Client(authClient);
// the authClient will automatically refresh the access token if expired using the refresh token
const result = await client.createInvoice({ amount: 1000 });
```

#### Handling refresh token

Access tokens do expire. If an access token is about to expire, this library will automatically use a refresh token to retrieve a fresh one. Utilising the _tokenRefreshed_ event is a simple approach to guarantee that you always save the most recent tokens.

If token refresh fails, you can restart the OAuth Authentication flow or log the error by listening for the _tokenRefreshFailed_ event.

(Note: To prevent losing access to the user's token, only initialize one instance of the client per token pair at a time)

```js
const token = loadTokenForUser(); // {access_token: string, refresh_token: string, expires_at: number}
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  callback: "http://localhost:8080/callback",
  scopes: [
    "invoices:read",
    "account:read",
    "balance:read",
    "invoices:create",
    "invoices:read",
    "payments:send",
  ],
  token: token,
});

// listen to the tokenRefreshed event
authClient.on("tokenRefreshed", (tokens) => {
  // store the tokens in database
  console.log(tokens);
});

// Listen to the tokenRefreshFailed event
authClient.on("tokenRefreshFailed", (error) => {
  // Handle the token refresh failure, for example, log the error or launch OAuth authentication flow
  console.error("Token refresh failed:", error.message);
});
```

#### Sending payments

```js
const token = loadTokenForUser(); // {access_token: string, refresh_token: string, expires_at: number}
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  callback: "http://localhost:8080/callback",
  scopes: [
    "invoices:read",
    "account:read",
    "balance:read",
    "invoices:create",
    "invoices:read",
    "payments:send",
  ],
  token: token,
});

const client = new Client(authClient);
// the authClient will automatically refresh the access token if expired using the refresh token

await client.sendPayment({ invoice: bolt11 });

await client.keysend({
  destination: nodekey,
  amount: 10,
  memo: memo,
});
```

#### Send a boostagram

refer also to the boostagram spec: [BLIP-10](https://github.com/lightning/blips/blob/master/blip-0010.md)

```js
const token = loadTokenForUser(); // {access_token: string, refresh_token: string, expires_at: number}
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  callback: "http://localhost:8080/callback",
  scopes: ["payments:send"],
  token: token,
});

const client = new Client(authClient);
// the authClient will automatically refresh the access token if expired using the refresh token

// pass in an array if you want to send multiple boostagrams with one call
await client.sendBoostagram({
  recipient: {
    address:
      "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
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
});

// or manually through the keysend:

// pass in an array if you want to do multiple keysend payments with one call
await client.keysend({
  destination: nodekey,
  amount: 10,
  customRecords: {
    7629169: JSON.stringify(boostagram),
    696969: "user",
  },
});
```

#### Send multiple boostagrams

You often want to send a boostagram for multiple splits. You can do this with one API call. Simply pass in an array of boostagrams. See example above.

```js
const response = await client.sendBoostagram([
  boostagram1,
  boostagram2,
  boostagram3,
]);

console.log(response.keysends);
```

`response.keysends` is an array of objects that either has an `error` key if a payment faild or the `keysend` key if everything succeeded.

```json
{
  "keysends": [
    {
      "keysend": {
        "amount": 10,
        "fee": 0,
        "destination": "xx",
        "payment_preimage": "xx",
        "payment_hash": "xx"
      }
    },
    {
      "keysend": {
        "amount": 10,
        "fee": 0,
        "destination": "xxx",
        "payment_preimage": "xxx",
        "payment_hash": "xxx"
      }
    }
  ]
}
```

#### Decoding an invoice

For quick invoice decoding without an API request please see Alby's [Lightning Tools package](https://github.com/getAlby/js-lightning-tools#basic-invoice-decoding).

For more invoice details you can use the Alby Wallet API:

```js
const decodedInvoice = await client.decodeInvoice(paymentRequest);
const {payment_hash, amount, description, ...} = decodedInvoice;
```

## fetch() dependency

This library relies on a global `fetch()` function which will only work in browsers and node v18.x or newer. In older versions you can manually install a global fetch option or polyfill if needed.

For example:

```js
import fetch from "cross-fetch"; // or "@inrupt/universal-fetch"
globalThis.fetch = fetch;

// or as a polyfill:
import "cross-fetch/polyfill";
```

## Full usage examples

You can find examples in the [examples/](../examples/oauth/) directory.
