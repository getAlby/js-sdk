# Nostr Wallet Connect - Wallet Service Documentation

[Nostr Wallet Connect](https://nwc.dev) is an open protocol enabling applications to interact with bitcoin lightning wallets. It allows users to connect apps they use to your wallet service, allowing app developers to easily integrate bitcoin lightning functionality.

The Alby JS SDK allows you to easily integrate Nostr Wallet Connect into any JavaScript based lightning wallet to allow client applications to easily connect and seamlessly interact with the wallet.

> See [NWCWalletService class documentation](https://getalby.github.io/js-sdk/classes/nwc.NWCWalletService.html)

## NWCWalletService

### Initialization Options

- `relayUrl`: URL of the Nostr relay to be used (e.g. wss://relay.getalby.com/v1)

### NWCWalletService quick start example

See [the full example](/examples/nwc/wallet-service/example.js)

```js
import { nwc } from "@getalby/sdk";

const walletService = new nwc.NWCWalletService({
  relayUrl: "wss://relay.getalby.com/v1",
});

// now for each client/app connection you can publish a NIP-47 info event and subscribe to requests

await walletService.publishWalletServiceInfoEvent(
  walletServiceSecretKey,
  ["get_info"], // NIP-47 methods supported by your wallet service
  [],
);

// each client connection will have a unique keypair

const keypair = new nwc.NWCWalletServiceKeyPair(
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
