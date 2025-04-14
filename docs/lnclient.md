# Lightning Network Client (LN) Documentation

The LN class helps you easily get started interacting with the lightning network. It is a high level wrapper around the [NWCClient](./nwc.md) which is compatible with many different lightning wallets.

See [LNClient class documentation](https://getalby.github.io/js-sdk/classes/LNClient.html)

For example, to make a payment:

```js
import { LN, USD, SATS } from "@getalby/sdk";
const credentials = "nostr+walletconnect://..."; // the NWC connection credentials
await new LN(credentials).pay("lnbc..."); // pay a lightning invoice
await new LN(credentials).pay("hello@getalby.com", SATS(21)); // or pay 21 sats to a lightning address
await new LN(credentials).pay("hello@getalby.com", USD(1)); // or pay $1 USD to a lightning address
await new LN(credentials).pay("hello@getalby.com", new FiatAmount(1, "THB")); // or pay an amount in any currency to a lightning address
await new LN(credentials).pay("hello@getalby.com", USD(1), {
  metadata: { comment: "Example comment", payer_data: { name: "Bob" } },
}); // set a comment for the payment you are making, and that the payment was made by Bob
```

Or to request to receive a payment:

```js
const request = await new LN(credentials).requestPayment(USD(1.0));

// give request.invoice to someone, then act upon it:
request
  .onPaid(giveAccess) // listen for incoming payment and then fire the given method
  .onTimeout(60, showTimeout); // if they didn't pay within 60 seconds, do something else
```

## Examples

See [the LNClient examples directory](./examples/lnclient) for a full list of examples.

## For Node.js

To use this on Node.js you first must install `websocket-polyfill@0.0.3` and import it:

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
