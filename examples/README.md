# Alby SDK Examples

This directory contains example scripts demonstrating how to use the [`@getalby/sdk`](https://github.com/getAlby/js-sdk) for various Bitcoin, Lightning, and Nostr Wallet Connect use cases.

## ✅ Prerequisites

Before running the examples, make sure to install and build the Alby SDK from the root directory:

```bash
cd ..
yarn install
yarn build
```

## 📦 Setup

1. Navigate to the examples directory:

```bash
cd examples
```

2. Then install dependencies:

```bash
yarn install
```

## ▶️ Running an Example

Use `tsx` to run a specific TypeScript file. For example:

```bash
yarn tsx ./lnclient/pay_ln_address.ts
```

Make sure you’ve installed the dev dependencies and TypeScript properly.

## 📁 Folder Structure

- `lnclient/`: Contains Lightning client examples. This is a good place to start.

## 🧠 Notes

- All examples should be written in **TypeScript** for type safety.
- Designed to test features against a locally built version of the SDK.
- Contributions are welcome! Feel free to submit more examples or improvements.

## Legacy examples

Javascript examples can be run directly using node:

```bash
node examples/nwc/client/get-balance.js
```

---

Made with ⚡ by the Alby contributors.
