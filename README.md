# Alby OAuth2 Wallet API SDK

## Introduction

This JavaScript SDK for the Alby OAuth2 Wallet API and the Nostr Wallet Connect API.

## Installing

```
npm install alby-js-sdk
```

## Nostr Wallet Connect Documentation

Nostr Wallet Connect is an open protocol enabling applications to interact with bitcoin lightning wallets. It allows users to connect their existing wallets to your application allowing developers to easily integrate bitcoin lightning functionality.

The Alby JS SDK allows you to easily integrate Nostr Wallet Connect into any JavaScript based application. 

The `NostrWebLNProvider` exposes the [WebLN](webln.guide/) sendPayment interface to execute lightning payments through Nostr Wallet Connect.

(note: in the future more WebLN functions will be added to Nostr Wallet Connect)


### NostrWebLNProvider Options

* `nostrWalletConnectUrl`: the full Nostr Wallet Connect URL as defined by the [spec](https://github.com/getAlby/nips/blob/master/47.md)
* `relayUrl`: the URL of the Nostr relay to be used (e.g. wss://nostr-relay.getalby.com)
* `walletPubkey`: the pubkey of the Nostr Wallet Connect app
* `privateKey`: the private key to sign the message (if not available window.nostr will be used)

### Example

#### Defaults
```js
import { NostrWebLNProvider } from 'alby-js-sdk';

const webln = new NostrWebLNProvider(); // use defaults (will use window.nostr to sign the request)
const response = webln.sendPayment(invoice);
console.log(response.preimage);
```

#### Use a custom, user provided Nostr Wallet Connect URL
```js
import { NostrWebLNProvider } from 'alby-js-sdk';

const webln = new NostrWebLNProvider({ nostrWalletConnectUrl: 'nostrwalletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://nostr.bitcoiner.social&secret=c60320b3ecb6c15557510d1518ef41194e9f9337c82621ddef3f979f668bfebd'); // use defaults
const response = webln.sendPayment(invoice);
console.log(response.preimage);
```

## OAuth API Documentation

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

### Send multiple boostagrams
You often want to send a boostagram for multiple splits. You can do this with one API call. Simply pass in an array of boostagrams. See example above.

```js
const response = await client.sendBoostagram([boostagram1, boostagram2, boostagram3]);

console.log(response.keysends);
```
`response.keysends` is an array of objects that either has an `error` key if a payment faild or the `keysend` key if everything succeeded.

```json
{
  "keysends":[
    {
      "keysend": { "amount":10, "fee":0, "destination":"xx","payment_preimage":"xx","payment_hash":"xx"}
    },
    {
      "keysend":{"amount":10,"fee":0,"destination":"xxx","payment_preimage":"xxx","payment_hash":"xxx"}
    }
  ]
}
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
