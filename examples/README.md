# Alby SDK Examples

This directory contains example scripts demonstrating how to use the [`@getalby/sdk`](https://github.com/getAlby/js-sdk) for various Bitcoin, Lightning, and Nostr Wallet Connect use cases.

## ✅ Prerequisites

> 🛠️ Only needed if you're running the **legacy JavaScript examples** (not required for TypeScript examples)

Before running legacy JS examples, make sure to install and build the Alby SDK from the root directory:


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
 ✅ No need to build the SDK — just install dependencies and run.
 

Make sure you’ve installed the dev dependencies and TypeScript properly.

## 📁 Folder Structure

- `lnclient/`: Contains Lightning client examples. This is a good place to start.

## 🧠 Notes

- All examples should be written in **TypeScript** for type safety.
- Designed to test features against a locally built version of the SDK.
- Contributions are welcome! Feel free to submit more examples or improvements.

## Legacy examples

Some older examples are still in JavaScript and can be run using node:

```bash
node ./nwc/client/get-balance.js
```
⚠️ For these to work, you must build the SDK first (yarn build in the root directory).


---

Made with ⚡ by the Alby contributors.
