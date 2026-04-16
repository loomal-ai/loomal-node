# Loomal Node.js SDK

The official Node.js/TypeScript SDK for the [Loomal API](https://docs.loomal.ai) -- identity infrastructure for AI agents.

[![npm](https://img.shields.io/npm/v/@loomal/sdk)](https://www.npmjs.com/package/@loomal/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

- Zero dependencies (native `fetch`)
- ESM + CJS dual output
- Full TypeScript type definitions
- Node 18+

## Installation

```bash
npm install @loomal/sdk
```

## Quick start

```typescript
import { Loomal } from "@loomal/sdk";

const client = new Loomal({ apiKey: "loid-..." });

const { messages } = await client.mail.listMessages({ limit: 10 });
```

## Authentication

Create an API key in the [Loomal Console](https://console.loomal.ai). Keys are prefixed with `loid-`.

Pass the key directly:

```typescript
const client = new Loomal({ apiKey: "loid-..." });
```

Or load from an environment variable:

```typescript
const client = new Loomal({ apiKey: process.env.LOOMAL_API_KEY });
```

## Usage

### Identity

```typescript
const identity = await client.identity.whoami();
```

### Vault

The vault is password-manager-style encrypted secret storage (AES-256-GCM at rest). Use `client.vault.store()` for arbitrary types, or the typed helpers below.

```typescript
// Simple API key
await client.vault.storeApiKey("stripe", "sk_live_...");

// OAuth-style client credentials (client id + secret)
await client.vault.storeApiKey("twitter", {
  clientId: "abc123",
  secret: "def456",
});

// Credit card (encrypted at rest — this is a secret vault, not a payment processor)
await client.vault.storeCard("personal-visa", {
  cardholder: "Jane Doe",
  number: "4242 4242 4242 4242",
  expMonth: "12",
  expYear: "2029",
  cvc: "123",
  zip: "94103",
}, { metadata: { brand: "Visa" } });

// Shipping address
await client.vault.storeShippingAddress("home", {
  name: "Autonomous Agent",
  line1: "1 Demo Way",
  city: "San Francisco",
  state: "CA",
  postcode: "94103",
  country: "US",
});
```

Supported credential types: `LOGIN`, `API_KEY`, `OAUTH`, `TOTP`, `SSH_KEY`, `DATABASE`, `SMTP`, `AWS`, `CERTIFICATE`, `CARD`, `SHIPPING_ADDRESS`, `CUSTOM`.

### More resources

The SDK also exposes `client.mail`, `client.calendar`, `client.logs`, and `client.did`. See the full reference at **[docs.loomal.ai](https://docs.loomal.ai)** for request/response shapes, pagination, and end-to-end examples.

## Error handling

All API errors are thrown as `LoomalApiError` with structured fields:

```typescript
import { Loomal, LoomalApiError } from "loomal";

try {
  await client.mail.send({ to: "test@example.com", subject: "Hi", text: "Hello" });
} catch (e) {
  if (e instanceof LoomalApiError) {
    console.error(e.status);  // HTTP status code
    console.error(e.code);    // API error code
    console.error(e.message); // Human-readable message
  }
}
```

## TypeScript

The SDK exports all request and response types:

```typescript
import type {
  LoomalConfig,
  MessageResponse,
  ThreadResponse,
  ThreadDetailResponse,
  PaginatedMessages,
  PaginatedThreads,
  VaultCredentialType,
  CredentialMetadata,
  CredentialWithData,
  VaultList,
  TotpResponse,
  IdentityResponse,
  ActivityLog,
  PaginatedLogs,
  LogsStatsResponse,
  DidDocument,
} from "loomal";
```

## Links

- [Documentation](https://docs.loomal.ai)
- [Website](https://loomal.ai)
- [Console](https://console.loomal.ai)

## License

MIT
