# Loomal Node.js SDK

The official Node.js/TypeScript SDK for the [Loomal API](https://docs.loomal.ai) -- identity, mail, vault, calendar, and **Loomal Pay** for AI agents.

[![npm](https://img.shields.io/npm/v/@loomal/sdk)](https://www.npmjs.com/package/@loomal/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

- Zero dependencies (native `fetch`)
- ESM + CJS dual output
- Full TypeScript type definitions
- Node 18+
- Drop-in **paywall middleware** for Express, Hono, and MCP

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

## Loomal Pay paywall middleware

Charge USDC per call on top of any HTTP handler. The middleware does the
two-call x402 flow against `api.loomal.ai` for you.

### Express

```typescript
import express from "express";
import { requirePayment } from "@loomal/sdk/paywall/express";

const app = express();

app.get(
  "/api/search",
  requirePayment({ amount: "0.01" }),
  (req, res) => res.json({ results: [/* ... */] }),
);
```

### Hono

```typescript
import { Hono } from "hono";
import { requirePayment } from "@loomal/sdk/paywall/hono";

const app = new Hono();

app.get(
  "/api/search",
  requirePayment({ amount: "0.01" }),
  (c) => c.json({ results: [/* ... */] }),
);
```

### MCP server

```typescript
import { requireToolPayment } from "@loomal/sdk/paywall/mcp";

server.tool(
  "search",
  { description: "Paid search" },
  requireToolPayment({ amount: "0.01" }, async (args) => ({
    results: [/* ... */],
  })),
);
```

The middleware reads your seller API key from `LOOMAL_API_KEY` (or
`SELLER_LOOMAL_API_KEY`) by default, or you can pass `apiKey` explicitly:

```typescript
requirePayment({ amount: "0.01", apiKey: process.env.MY_LOOMAL_KEY });
```

Settled payments return an Ed25519-signed receipt and an
[on-chain USDC transfer on Base](https://basescan.org). See the
[full payments guide](https://docs.loomal.ai/payments) for the protocol
shape and webhook configuration.

### Webhook signature verification

Loomal signs every webhook delivery with HMAC-SHA256 using your project's
webhook secret. Verify it before trusting the body:

```typescript
import { verifyWebhook } from "@loomal/sdk/webhook";

app.post(
  "/webhooks/loomal",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      await verifyWebhook(
        req.body.toString(),
        {
          signature: req.header("loomal-signature"),
          timestamp: req.header("loomal-timestamp"),
        },
        process.env.LOOMAL_WEBHOOK_SECRET!,
      );
    } catch {
      return res.status(400).send("invalid signature");
    }
    // body is authentic — handle the event
  },
);
```

Replay protection is on whenever a `loomal-timestamp` header is present
(default tolerance: 5 minutes). Web Crypto under the hood, so the same
helper runs on Node, Bun, Deno, and Cloudflare Workers.

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
