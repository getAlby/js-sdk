# Alby OAuth2 Wallet API SDK

## Introduction

This JavaScript SDK for the Alby OAuth2 Wallet API.


## Installing

```
npm install alby-js-sdk
```

## API Documentation

Please have a look a the Alby OAuth2 Wallet API:

[https://guides.getalby.com/alby-wallet-api/reference/getting-started](https://guides.getalby.com/alby-wallet-api/reference/getting-started)


## Examples

### Full OAuth Authentication flow

```js
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  callback: "http://localhost:8080/callback",
  scopes: ["invoices:read", "account:read", "balance:read", "invoices:create", "invoices:read", "payments:send"],
  token: {access_token: undefined, refresh_token: undefined, expires_at: undefined} // initialize with existing token
});

const authUrl = authClient.generateAuthURL({
  code_challenge_method: "S256",
});
// open auth URL
// `code` is passed as a query parameter when the user is redirected back aufter authorization
await authClient.requestAccessToken(code);

// access the token response. You can store this securely for future client initializations
console.log(authClient.token);

// initialize a client
const client = new Client(authClient);

const result = await client.accountBalance();
```

### Initialize a client from existing token details

```js
const token = loadTokenForUser(); // {access_token: string, refresh_token: string, expires_at: number}
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  callback: "http://localhost:8080/callback",
  scopes: ["invoices:read", "account:read", "balance:read", "invoices:create", "invoices:read", "payments:send"],
  token: token
});

const client = new Client(authClient);
// the authClient will automatically refresh the access token if expired using the refresh token
const result = await client.createInvoice({amount: 1000});
```

### Sending payments

```js
const token = loadTokenForUser(); // {access_token: string, refresh_token: string, expires_at: number}
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  callback: "http://localhost:8080/callback",
  scopes: ["invoices:read", "account:read", "balance:read", "invoices:create", "invoices:read", "payments:send"],
  token: token
});

const client = new Client(authClient);
// the authClient will automatically refresh the access token if expired using the refresh token

await client.sendPayment({ invoice: bolt11 });

await client.keysend({
  destination: nodekey,
  amount: 10,
  memo: memo
});
```

### Send a boostagram

refer also to the boostagram spec: https://github.com/lightning/blips/blob/master/blip-0010.md

```js
const token = loadTokenForUser(); // {access_token: string, refresh_token: string, expires_at: number}
const authClient = new auth.OAuth2User({
  client_id: process.env.CLIENT_ID,
  callback: "http://localhost:8080/callback",
  scopes: ["payments:send"],
  token: token
});

const client = new Client(authClient);
// the authClient will automatically refresh the access token if expired using the refresh token

// pass in an array if you want to send multiple boostagrams with one call
await client.sendBoostagram({
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


// or manually through the keysend:

// pass in an array if you want to do multiple keysend payments with one call
await client.keysend({
  destination: nodekey,
  amount: 10,
  customRecords: {
    "7629169": JSON.stringify(boostagram),
    "696969": "user",
  }
});
```

## Full usage examples

You can find examples in the [examples/](examples/) directory.


## Need help?

We are happy to help, please contact us or create an issue.

* [Twitter: @getAlby](https://twitter.com/getAlby)
* [Telegram group](https://t.me/getAlby)
* support at getalby.com
* [bitcoin.design](https://bitcoin.design/) Slack community [#lightning-browser-extension](https://bitcoindesign.slack.com/archives/C02591ADXM2)


## Thanks

The client and the setup is inspired and based on the [twitter-api-typescript-sdk](https://github.com/twitterdev/twitter-api-typescript-sdk).


## License

MIT
