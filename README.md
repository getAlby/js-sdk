# Alby JS SDK

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

* `providerName`: name of the provider to load the default options. currently `alby` (default)
* `nostrWalletConnectUrl`: full Nostr Wallet Connect URL as defined by the [spec](https://github.com/getAlby/nips/blob/master/47.md)
* `relayUrl`: URL of the Nostr relay to be used (e.g. wss://nostr-relay.getalby.com)
* `walletPubkey`: pubkey of the Nostr Wallet Connect app
* `secret`: secret key to sign the request event (if not available window.nostr will be used)
* `authorizationUrl`: URL to the NWC interface for the user to and the app connection

#### Example

```js
const nwc = new NostrWebLNProvider({ nostrWalletConnectUrl: loadNWCUrl });
await nwc.enable(); // connect to the relay
const response = nwc.sendPayment(invoice);
```

### NostrWebLNProvider Functions
The goal of the Nostr Wallet Connect provider is to be API compatible with [webln](https://www.webln.guide/). Currently not all methods are supported and only `sendPayment` is specified.

#### `static withNewSecret()`
Initialized a new `NostrWebLNProvider` instance but generates a new random secret. The pubkey of that secret then needs to be authorized by the user (this can be initiated by redirecting the user to the `getAuthorizationUrl()` URL or calling `initNWC()` to open an authorization popup.

##### Example

```js
const nwc = NostrWebLNProvider.withNewSecret();
await nwc.initNWC();
```

#### sendPayment(invice: string)
Takes a bolt11 invoice and calls the NWC `pay_invoice` function. 
It returns an object with the preimage or an error

##### Example

```js
const nwc = new NostrWebLNProvider({ nostrWalletConnectUrl: loadNWCUrl });
await nwc.enable();
const response = await nwc.sendPayment(invoice);
console.log(response);
```

#### getNostrWalletConnectUrl()
Returns the `nostr+walletconnect://` URL which includes all the connection information (`walletPubkey`, `relayUrl`, `secret`)
This can be used to get and persist the string for later use.

#### initNWC() 
Opens a new window prompt with the `getAuthorizationUrl()` (the user's NWC UI) to ask the user to authorize the app connection. 
The promise resolves when the connection is authorized and the popup sends a `nwc:success` message or rejects when the prompt is closed. 

```js
const nwc = NostrWebLNProvider.withNewSecret();
try {
  await nwc.initNWC();
} catch(e) {
  console.warn("Prompt closed");
}
await nwc.enable();
const response = await nwc.sendPayment(invoice);
// ! always check the response 
if (response.preimage) { 
  console.info("payment successful");
} else {
  console.error(response);
}
```


#### For Node.js

To use this on Node.js you first must install `websocket-polyfill` and import it:

```js
import 'websocket-polyfill';
// or: require('websocket-polyfill');
```

if you get an `crypto is not defined` error you have to import it first:

```js
import * as crypto from 'node:crypto';
global.crypto = crypto;
//or: global.crypto = require('crypto');
```


### Examples

#### Defaults
```js
import { NostrWebLNProvider } from 'alby-js-sdk';

const webln = new NostrWebLNProvider(); // use defaults (connects to Alby's relay, will use window.nostr to sign the request)
await webln.enable(); // connect to the relay
const response = await webln.sendPayment(invoice);
console.log(response.preimage);

webln.close(); // close the websocket connection
```

#### Use a custom, user provided Nostr Wallet Connect URL
```js
import { NostrWebLNProvider } from 'alby-js-sdk';

const webln = new NostrWebLNProvider({ nostrWalletConnectUrl: 'nostrwalletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://nostr.bitcoiner.social&secret=c60320b3ecb6c15557510d1518ef41194e9f9337c82621ddef3f979f668bfebd'); // use defaults
await webln.enable(); // connect to the relay
const response = await webln.sendPayment(invoice);
console.log(response.preimage);

webln.close(); // close the websocket connection
```

#### Generate a new NWC connect url using a locally-generated secret
```js
// same options can be provided to .withNewSecret() as creating a new NostrWebLNProvider()
const webln = webln.NostrWebLNProvider.withNewSecret();

// get the connect URL to the interface where the user has to enable the connection
webln.getConnectUrl({ name: `My app name` });
// an optional return_to parameter can be passed in 
webln.getConnectUrl({ name: `My app name`, returnTo: document.location.toString() });

// or use the `initNWC` helper which opens a popup to initiate the connection flow.
// the promise resolves once the NWC app returned.
await webln.initNWC("alby", {
  name: `My app name`,
});

// ... enable and send a payment

// if you want to get the connect url with the secret:
// const nostrWalletConnectUrl nwc.getNostrWalletConnectUrl(true)

```

## OAuth API Documentation

Please have a look a the Alby OAuth2 Wallet API:

[https://guides.getalby.com/alby-wallet-api/reference/getting-started](https://guides.getalby.com/alby-wallet-api/reference/getting-started)


### Examples

#### Full OAuth Authentication flow

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

#### Initialize a client from existing token details

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

#### Sending payments

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

#### Send a boostagram

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

#### Send multiple boostagrams
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
