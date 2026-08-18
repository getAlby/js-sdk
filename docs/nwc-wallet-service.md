# Nostr Wallet Connect - Wallet Service Documentation

[Nostr Wallet Connect](https://nwc.dev) is an open protocol enabling applications to interact with bitcoin lightning wallets. It allows users to connect apps they use to your wallet service, allowing app developers to easily integrate bitcoin lightning functionality.

The Alby JS SDK allows you to easily integrate Nostr Wallet Connect into any JavaScript based lightning wallet to allow client applications to easily connect and seamlessly interact with the wallet.

> See [NWCWalletService class documentation](https://getalby.github.io/js-sdk/classes/nwc.NWCWalletService.html)

## NWCWalletService

### Initialization Options

- `relayUrls`: URLs of the Nostr relays to be used (e.g. `["wss://relay.getalby.com/v1"]`)

### NWCWalletService quick start example

See [get_info](/examples/nwc/wallet-service/get-info.ts) and [notifications](/examples/nwc/wallet-service/notifications.ts) (fake `pay_invoice` + `payment_sent`).

```js
import { NWCWalletService, NWCWalletServiceKeyPair } from "@getalby/sdk/nwc";

const walletService = new NWCWalletService({
  relayUrls: ["wss://relay.getalby.com/v1"],
});

// load from storage: one wallet secret for the service, a distinct client pubkey per connection
const walletServiceSecretKey = "..."; // hex
const clientPubkey = "..."; // hex

// publish the NIP-47 info event once per wallet (not once per client)
await walletService.publishWalletServiceInfoEvent(
  walletServiceSecretKey,
  ["get_info"], // NIP-47 methods supported by your wallet service
  [], // only advertise notifications your service actually publishes
);

// for each client, create a key pair and subscribe separately
const keypair = new NWCWalletServiceKeyPair(
  walletServiceSecretKey,
  clientPubkey,
);

const unsub = await walletService.subscribe(keypair, {
  getInfo: () => {
    return Promise.resolve({
      result: {
        methods: ["get_info"],
        alias: "Alby Hub",
        //... add other fields here
      },
      error: undefined,
    });
  },
  // ... handle other NIP-47 methods here
});
```

`subscribe()` accepts an optional third argument `{ since?, until? }` (unix seconds) that is passed through to the NIP-01 request filter. Use a persisted high-water mark as `since` to limit replay of retained history on resubscribe. Relays can ignore these bounds, so keep using `recordEvent` for idempotency.

### `publishNotification(keypair, notification, options?)`

Publish a [NIP-47 notification](https://github.com/nostr-protocol/nips/blob/master/47.md) to a connected client. Clients receive these events via `NWCClient.subscribeNotifications()`.

Advertise the same notification types in `publishWalletServiceInfoEvent()` so clients know they can subscribe.

By default this publishes both encryption kinds advertised on the info event: `nip44_v2` (kind `23197`) and `nip04` (kind `23196`). Pass `encryptionTypes` only if you need to restrict that.

```js
await walletService.publishNotification(keypair, {
  notification_type: "payment_received", // or "payment_sent"
  notification: transaction, // Nip47Transaction
});
```
