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
- `playwright.config.ts` — Playwright configuration
