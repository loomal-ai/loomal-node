# Loomal Node.js SDK

The official Node.js/TypeScript SDK for the [Loomal API](https://docs.loomal.ai) -- identity infrastructure for AI agents.

[![npm](https://img.shields.io/npm/v/loomal)](https://www.npmjs.com/package/loomal)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

- Zero dependencies (native `fetch`)
- ESM + CJS dual output
- Full TypeScript type definitions
- Node 18+

## Installation

```bash
npm install loomal
```

## Quick start

```typescript
import { Loomal } from "loomal";

const client = new Loomal({ apiKey: "mgent-..." });

const { messages } = await client.mail.listMessages({ limit: 10 });
```

## Authentication

Create an API key in the [Loomal Console](https://console.loomal.ai). Keys are prefixed with `mgent-`.

Pass the key directly:

```typescript
const client = new Loomal({ apiKey: "mgent-..." });
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

### Mail

```typescript
// Send an email
await client.mail.send({
  to: "recipient@example.com",
  subject: "Hello from my agent",
  text: "Sent via Loomal SDK.",
});

// Reply to a message
await client.mail.reply(messageId, { text: "Got it, thanks." });

// List messages
const { messages } = await client.mail.listMessages({ limit: 20 });

// Get a single message
const message = await client.mail.getMessage(messageId);

// Update labels
await client.mail.updateLabels(messageId, {
  addLabels: ["STARRED"],
  removeLabels: ["UNREAD"],
});

// Delete a message
await client.mail.deleteMessage(messageId);

// List threads
const { threads } = await client.mail.listThreads({ limit: 10 });

// Get a thread with its messages
const thread = await client.mail.getThread(threadId, { limit: 25 });

// Delete a thread
await client.mail.deleteThread(threadId);
```

### Vault

```typescript
// Store a credential
await client.vault.store("github-token", {
  type: "api_key",
  data: { token: "ghp_..." },
  metadata: { service: "github" },
});

// List credentials
const credentials = await client.vault.list();

// Get a credential (decrypted)
const cred = await client.vault.get("github-token");

// Get a TOTP code
const { code } = await client.vault.totp("2fa-secret");

// Delete a credential
await client.vault.delete("github-token");
```

### Activity Logs

```typescript
// List logs with filters
const { logs } = await client.logs.list({
  limit: 50,
  category: "mail",
  status: "success",
});

// Get log statistics
const stats = await client.logs.stats();
```

### DID

```typescript
// Resolve an identity DID document
const doc = await client.did.resolve(identityId);

// Resolve a domain DID document
const domainDoc = await client.did.resolveDomain();
```

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
