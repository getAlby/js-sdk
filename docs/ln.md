# Lightning Network Client (LNClient) Documentation

The LNClient helps you easily get started interacting with the lightning network. It is a high level wrapper around the [NWCClient](./nwc.md) which is compatible with many different lightning wallets.

For example, to make a payment:

```js
await new LNClient(credentials).pay("lnbc..."); // pay a lightning invoice
await new LNClient(credentials).pay("hello@getalby.com", USD(1)); // or pay $1 USD to a lightning address
```

Or to request a payment to be received:

```js
const request = await new LNClient(credentials).receive(USD(1.0));
// give request.invoice to someone...
request.onPaid(giveAccess);
```

## Examples

See [the LNClient examples directory](./examples/ln) for a full list of examples.
