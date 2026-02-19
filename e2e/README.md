# E2E Tests

Minimal Playwright smoke test to verify the bundled SDK loads and runs in a browser.

Jest runs in Node and cannot detect browser-specific bundle issues. This single test validates that the build works in a real browser environment.

## Setup

```bash
yarn install
yarn test:e2e:browser:install
```

## Run

```bash
yarn test:e2e:browser
```
