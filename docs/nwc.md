# Nostr Wallet Connect Documentation

[Nostr Wallet Connect](https://nwc.dev) is an open protocol enabling applications to interact with bitcoin lightning wallets. It allows users to connect their existing wallets to your application allowing developers to easily integrate bitcoin lightning functionality.

The Alby JS SDK allows you to easily integrate Nostr Wallet Connect into any JavaScript based application.

There are two interfaces you can use to access NWC:

- The `NWCClient` exposes the [NWC](https://nwc.dev/) interface directly, which is more powerful than the WebLN interface and is recommended if you plan to create an application outside of the web (e.g. native mobile/command line/server backend etc.). You can explore all the examples [here](../examples/nwc/client/).
- The `NostrWebLNProvider` exposes the [WebLN](https://webln.guide/) interface to execute lightning wallet functionality through Nostr Wallet Connect, such as sending payments, making invoices and getting the node balance. You can explore all the examples [here](../examples/nwc/). See also [Bitcoin Connect](https://github.com/getAlby/bitcoin-connect/) if you are developing a frontend web application.

## NWCClient

### Initialization Options

- `nostrWalletConnectUrl`: full Nostr Wallet Connect URL as defined by the [spec](https://github.com/getAlby/nips/blob/master/47.md)
- `relayUrl`: URL of the Nostr relay to be used (e.g. wss://relay.getalby.com/v1)
- `walletPubkey`: pubkey of the Nostr Wallet Connect app
- `secret`: secret key to sign the request event (if not available window.nostr will be used)

### NWCClient Quick start example

```js
import { nwc } from "@getalby/sdk";
const nwcClient = new nwc.NWCClient({
  nostrWalletConnectUrl: loadNWCUrl(),
}); // loadNWCUrl is some function to get the NWC URL from some (encrypted) storage

// now you can send payments by passing in the invoice in an object
const response = await nwcClient.payInvoice({ invoice });
```

### `static fromAuthorizationUrl()`

Initialized a new `NWCClient` instance but generates a new random secret. The pubkey of that secret then needs to be authorized by the user (this can be initiated by redirecting the user to the `getAuthorizationUrl()` URL or calling `fromAuthorizationUrl()` to open an authorization popup.

```js
const nwcClient = await nwc.NWCClient.fromAuthorizationUrl(
  "https://my.albyhub.com/apps/new",
  {
    name: "My app name",
  },
);
```

The same options can be provided to getAuthorizationUrl() as fromAuthorizationUrl() - see [Manual Auth example](../examples/nwc/client/auth_manual.html)

### Examples

See [the NWC client examples directory](../examples/nwc/client) for a full list of examples.

## NostrWebLNProvider (aliased as NWC) Options

- `nostrWalletConnectUrl`: full Nostr Wallet Connect URL as defined by the [spec](https://github.com/getAlby/nips/blob/master/47.md)
- `relayUrl`: URL of the Nostr relay to be used (e.g. wss://relay.getalby.com/v1)
- `walletPubkey`: pubkey of the Nostr Wallet Connect app
- `secret`: secret key to sign the request event (if not available window.nostr will be used)
- `client`: initialize using an existing NWC client

### WebLN Quick start example

```js
import { webln } from "@getalby/sdk";
const nwc = new webln.NostrWebLNProvider({
  nostrWalletConnectUrl: loadNWCUrl(),
}); // loadNWCUrl is some function to get the NWC URL from some (encrypted) storage
// or use the short version
const nwc = new webln.NWC({ nostrWalletConnectUrl: loadNWCUrl });

// connect to the relay
await nwc.enable();

// now you can send payments by passing in the invoice
const response = await nwc.sendPayment(invoice);
```

You can use NWC as a webln compatible object in your web app:

```js
// you can set the window.webln object to use the universal API to send payments:
if (!window.webln) {
  // prompt the user to connect to NWC
  window.webln = new webln.NostrWebLNProvider({
    nostrWalletConnectUrl: loadNWCUrl,
  });
  // now use any webln code
}
```

## NostrWebLNProvider Functions

The goal of the Nostr Wallet Connect provider is to be API compatible with [webln](https://www.webln.guide/). Currently not all methods are supported - see the examples/nwc directory for a list of supported methods.

### sendPayment(invice: string)

Takes a bolt11 invoice and calls the NWC `pay_invoice` function.
It returns a promise object that is resolved with an object with the preimage or is rejected with an error

#### Payment Example

```js
import { webln } from "@getalby/sdk";
const nwc = new webln.NostrWebLNProvider({ nostrWalletConnectUrl: loadNWCUrl });
await nwc.enable();
const response = await nwc.sendPayment(invoice);
console.log(response);
```

#### getNostrWalletConnectUrl()

Returns the `nostr+walletconnect://` URL which includes all the connection information (`walletPubkey`, `relayUrl`, `secret`)
This can be used to get and persist the string for later use.

#### fromAuthorizationUrl(url: string, {name: string})

Opens a new window prompt with at the provided authorization URL to ask the user to authorize the app connection.
The promise resolves when the connection is authorized and the popup sends a `nwc:success` message or rejects when the prompt is closed.
Pass a `name` to the NWC provider describing the application.

```js
import { webln } from "@getalby/sdk";

try {
  const nwc = await webln.NostrWebLNProvider.fromAuthorizationUrl(
    "https://my.albyhub.com/apps/new",
    {
      name: "My app name",
    },
  );
} catch (e) {
  console.error(e);
}
await nwc.enable();
let response;
try {
  response = await nwc.sendPayment(invoice);
  // if success then the response.preimage will be only
  console.info(`payment successful, the preimage is ${response.preimage}`);
} catch (e) {
  console.error(e.error || e);
}
```

#### React Native (Expo)

Look at our [NWC React Native Expo Demo app](https://github.com/getAlby/nwc-react-native-expo) for how to use NWC in a React Native expo project.

#### For Node.js

To use this on Node.js you first must install `websocket-polyfill` and import it:

```js
import "websocket-polyfill";
// or: require('websocket-polyfill');
```

if you get an `crypto is not defined` error, either upgrade to node.js 20 or above, or import it manually:

```js
import * as crypto from 'crypto'; // or 'node:crypto'
globalThis.crypto = crypto as any;
//or: global.crypto = require('crypto');
```

### Examples

#### Defaults

```js
import { webln } from "@getalby/sdk";

const nwc = new webln.NostrWebLNProvider(); // use defaults (connects to Alby's relay, will use window.nostr to sign the request)
await nwc.enable(); // connect to the relay
const response = await nwc.sendPayment(invoice);
console.log(response.preimage);

nwc.close(); // close the websocket connection
```

#### Use a custom, user provided Nostr Wallet Connect URL

```js
import { webln } from "@getalby/sdk";

const nwc = new webln.NostrWebLNProvider({
  nostrWalletConnectUrl:
    "nostr+walletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://nostr.bitcoiner.social&secret=c60320b3ecb6c15557510d1518ef41194e9f9337c82621ddef3f979f668bfebd",
}); // use defaults
await nwc.enable(); // connect to the relay
const response = await nwc.sendPayment(invoice);
console.log(response.preimage);

nwc.close(); // close the websocket connection
```

#### Generate a new NWC connect url using a locally-generated secret

```js
// use the `fromAuthorizationUrl` helper which opens a popup to initiate the connection flow.
// the promise resolves once the NWC app returned.
const nwc = await webln.NostrWebLNProvider.fromAuthorizationUrl(
  "https://my.albyhub.com/apps/new",
  {
    name: "My app name",
  },
);

// ... enable and send a payment

// if you want to get the connect url with the secret:
// const nostrWalletConnectUrl nwc.getNostrWalletConnectUrl(true)
```

The same options can be provided to getAuthorizationUrl() as fromAuthorizationUrl() - see [Manual Auth example](../examples/nwc/auth_manual.html)

### Nostr Wallet Auth

NWA is an alternative flow for lightning apps to easily initialize an NWC connection to mobile-first or self-custodial wallets, using a client-created secret.

The app will generate an NWA URI which should be opened in the wallet, where the user can approve the connection.

#### Generating an NWA URI

See [NWA example](examples/nwc/client/nwa.js)

### Accepting and creating a connection from an NWA URI

See [NWA accept example](examples/nwc/client/nwa.js) for NWA URI parsing and handling. The implementation of actually creating the connection and showing a confirmation page to the user is wallet-specific. In the example, a connection will be created via the `create_connection` NWC command.
