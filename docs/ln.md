# Lightning Network Client (LNClient) Documentation

The LNClient is a high level wrapper around the [NWCClient](./nwc.md) which helps you easily get started interacting with the lightning network.

For example, to make a payment:

```js
await new LNClient(credentials).pay(invoice);
```

Or to request a payment to be received:

```js
const request = await new LNClient(credentials).receive(USD(1.0));
// give request.invoice to someone...
request.onPaid(giveAccess);
```

## Examples

See [the LNClient examples directory](./examples/ln) for a full list of examples.
