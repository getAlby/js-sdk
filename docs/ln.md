# Lightning Network Client (LN) Documentation

The LN class helps you easily get started interacting with the lightning network. It is a high level wrapper around the [NWCClient](./nwc.md) which is compatible with many different lightning wallets.

For example, to make a payment:

```js
import { LN, USD } from "@getalby/sdk";
await new LN(credentials).pay("lnbc..."); // pay a lightning invoice
await new LN(credentials).pay("hello@getalby.com", USD(1)); // or pay $1 USD to a lightning address
```

Or to request a payment to be received:

```js
const request = await new LN(credentials).receive(USD(1.0));
// give request.invoice to someone...
request.onPaid(giveAccess);
```

## Examples

See [the LNClient examples directory](./examples/lnclient) for a full list of examples.
