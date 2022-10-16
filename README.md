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
