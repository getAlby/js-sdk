# E2E Tests

- **`e2e/browser/`** — Playwright tests (run in real browser)
- **`e2e/`** — Jest integration tests (NWC faucet, etc., see PR #535)

## Browser tests (Playwright)

Minimal smoke test to verify the bundled SDK loads and runs in a browser.

### Setup

```bash
yarn install
yarn test:e2e:browser:install
```

### Run

```bash
yarn test:e2e:browser
```
