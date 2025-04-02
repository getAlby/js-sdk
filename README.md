# Alby JS SDK

## Introduction

Build zero-custody bitcoin payments into apps with a few lines of code.

This JavaScript SDK is for interacting with a bitcoin lightning wallet via Nostr Wallet Connect or the Alby Wallet API.

## Installing

```bash
npm install @getalby/sdk
```

or

```bash
yarn add @getalby/sdk
```

or for use without any build tools:

```html
<script type="module">
  import { nwc, webln } from "https://esm.sh/@getalby/sdk@4.1.0"; // jsdelivr.net, skypack.dev also work

  // ... then use nwc.NWCClient or webln.NWC (see documentation below)
</script>
```

## Lightning Network Client (LN) Documentation

Quickly get started adding lightning payments to your app.

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

[Read more](./docs/ln.md)

For more flexibility you can access the underlying NWC wallet directly. Continue to read the Nostr Wallet Connect documentation below.

## Nostr Wallet Connect Documentation

[Nostr Wallet Connect](https://nwc.dev) is an open protocol enabling applications to interact with bitcoin lightning wallets. It allows users to connect their existing wallets to your application allowing developers to easily integrate bitcoin lightning functionality.

For apps, see [NWC client and NWA client documentation](./docs/nwc.md)

For wallet services, see [NWC wallet service documentation](./docs/nwc-wallet-service.md)

## Alby Wallet API Documentation

The [Alby OAuth API](https://guides.getalby.com/alby-wallet-api/reference/getting-started) allows you to integrate bitcoin lightning functionality provided by the Alby Wallet into your applications, with the Alby Wallet API. Send & receive payments, create invoices, setup payment webhooks, access Podcasting 2.0 and more!

[Read more](./docs/oauth.md)

### NodeJS

**This library relies on a global fetch() function which will work in browsers and node v18.x or newer.** (In older versions you have to use a polyfill.)

## WebLN Documentation

The JS SDK also has some implementations for [WebLN](https://webln.guide).
See the [NostrWebLNProvider documentation](./docs/nwc.md) and [OAuthWebLNProvider documentation](./docs/oauth.md).

## Need help?

We are happy to help, please contact us or create an issue.

- [Twitter: @getAlby](https://twitter.com/getAlby)
- [Telegram Community Chat](https://t.me/getAlby)
- e-mail to support@getalby.com
- [bitcoin.design](https://bitcoin.design/) Slack community [#lightning-browser-extension](https://bitcoindesign.slack.com/archives/C02591ADXM2)
- Read the [Alby developer guide](https://guides.getalby.com/developer-guide) to better understand how Alby packages and APIs can be used to power your app.

## Thanks

The client and the setup is inspired and based on the [twitter-api-typescript-sdk](https://github.com/twitterdev/twitter-api-typescript-sdk).

## License

MIT
