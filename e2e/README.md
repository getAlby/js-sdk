# E2E Tests

E2E tests use [Playwright](https://playwright.dev/).

## Environment Setup

1. Install project dependencies:
   ```bash
   yarn install
   ```

2. Install Playwright browsers:
   ```bash
   yarn test:e2e:install
   ```

## Running Tests

```bash
# E2E tests (Chromium by default)
yarn test:e2e

# All browsers (requires: yarn test:e2e:install first)
yarn playwright test

# With UI for debugging
yarn test:e2e:ui

# In headed mode (visible browser)
yarn test:e2e:headed
```

## Structure

- `e2e/` — e2e test directory
- `e2e/fixtures/` — HTML fixtures for browser tests
- `e2e/amount.spec.ts` — lnclient/Amount tests
- `e2e/fiat-amount.spec.ts` — lnclient/FiatAmount tests (mocked rates API)
- `e2e/oauth.spec.ts` — oauth Client tests (mocked Alby API)
- `e2e/webln.spec.ts` — webln OauthWeblnProvider tests (mocked Alby API)
- `e2e/nwc.spec.ts` — nwc NWCClient/NWAClient tests (no relay required)
- `e2e/lnclient.spec.ts` — lnclient LNClient tests (constructor, close)
- `playwright.config.ts` — Playwright configuration

## Limitations

The following are **not covered** by E2E tests (require real infrastructure or complex mocks):

- **NWC relay-dependent flows** — `NWCClient.getInfo`, `getBalance`, `payInvoice`, `makeInvoice`, etc. require WebSocket connection to Nostr relay
- **LNClient.pay / requestPayment** — depend on NWC relay
- **NostrWeblnProvider** — depends on NWC relay
- **OAuth2User** — OAuth authorization flow with redirects and popups
