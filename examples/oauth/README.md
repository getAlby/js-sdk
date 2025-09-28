# Alby SDK OAuth Examples

These examples demonstrate how to use the Alby SDK's OAuth features with either **OAuth2User (CLIENT_ID + CLIENT_SECRET)** or a simple **Access Token**.

Before running any example, make sure you’ve already built the root package. You can follow the prerequisites and setup guide in [../README.md](../README.md).

---

## Running Examples with OAuth2User

**Prerequisites:**

1. Generate a `CLIENT_ID` and `CLIENT_SECRET` from the [Alby Developer Dashboard](https://getalby.com/developer/oauth_clients).

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in your credentials inside `.env`:

   ```env
   # OAuth Clients
   CLIENT_ID=""
   CLIENT_SECRET=""
   ```

**Run an example:**

```bash
yarn tsx invoices.ts
```

When running with `OAuth2User`, you’ll be prompted to open an authentication URL in your browser and paste back the code.

---

## Running Examples with Access Token

**Prerequisites:**

1. Generate an access token from the [Alby Developer Dashboard](https://getalby.com/developer/access_tokens/new).

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in your access token inside `.env`:

   ```env
   # Access Token
   ACCESS_TOKEN=""
   ```

**Run an example:**

```bash
yarn tsx invoices.ts
```

When running with `ACCESS_TOKEN`, the example will skip the OAuth flow and use the token directly.
