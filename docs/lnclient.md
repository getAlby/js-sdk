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
```

Or to request a payment to be received:

```js
const request = await new LN(credentials).receive(USD(1.0));
// give request.invoice to someone...
request.onPaid(giveAccess);
```

## Examples

See [the LNClient examples directory](./examples/lnclient) for a full list of examples.
