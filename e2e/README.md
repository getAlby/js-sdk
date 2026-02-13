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
# All e2e tests
yarn test:e2e

# Chromium only (faster)
yarn test:e2e --project=chromium

# With UI for debugging
yarn test:e2e:ui

# In headed mode (visible browser)
yarn test:e2e:headed
```

## Structure

- `e2e/` — e2e test directory
- `playwright.config.ts` — Playwright configuration
