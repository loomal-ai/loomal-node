# Changelog

All notable changes to `@loomal/sdk` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-05-13

### Added
- `loomal.payments` resource on the `Loomal` client. Methods:
  - `challenge({ amount, resource?, description?, network? })` —
    `POST /v0/payments/challenge`, returns the x402 402-body.
  - `redeem({ paymentHeader, resource, amount, network?, description? })` —
    `POST /v0/payments/redeem`, verifies + settles the buyer-signed payment.
  - `list({ limit? })` — `GET /v0/payments`, recent payments newest first.
  - `get(paymentId)` — `GET /v0/payments/:id`, single payment with the
    full Ed25519-signed receipt.
- `PaymentSummary`, `PaymentDetail`, `PaymentReceipt`, `PaymentReceiptBody`,
  `PaymentEndpointSummary`, `PaymentStatus`, `PaginatedPayments`,
  `ChallengeParams`, `RedeemParams` exported as types.

### Changed (BREAKING)
- `@loomal/sdk/paywall/mcp` now exports `requirePayment` instead of
  `requireToolPayment`. The new name matches the Express and Hono
  adapters. Migration: rename the import — the function signature is
  unchanged.

## [0.4.1] — 2026-05-07

### Added
- `verifyWebhook(rawBody, signature, secret)` exported from
  `@loomal/sdk/webhook`. Matches Loomal's
  `X-Loomal-Signature: sha256=<hex>` HMAC-SHA256 header. Returns
  `Promise<boolean>`. Web Crypto under the hood — runs on Node, Bun,
  Deno, and Cloudflare Workers.
- `SignedReceipt` and `ReceiptBody` exported from
  `@loomal/sdk/paywall/express` (and the other paywall subpaths via
  `core`). Mirror of the Ed25519-signed payment receipt the API
  attaches to a successful `POST /v0/payments/redeem`.

### Fixed
- Adapters now rebuild a fresh challenge when Loomal's redeem response
  returns `ok: false` without a `requirement` field (real API behavior
  on `payTo_mismatch` and `amount_mismatch`). Previously the middleware
  emitted a 402 with an empty body, leaving the buyer's x402 client
  with nothing to retry against.
- `RedeemResponse` types now match the API: `paymentInId` is
  `string | null`, `signedReceipt` and `recordingFailed` are exposed on
  the success branch, and `requirement` is optional on failure.

### Tests
- Added unit coverage for the paywall surface that shipped untested in
  `0.4.0`:
  - `tests/paywall-core.test.ts` — `buildChallenge`, `verifyAndSettle`,
    env var resolution (`LOOMAL_API_KEY`, `SELLER_LOOMAL_API_KEY`,
    `LOOMAL_BASE_URL`), API-key validation, error propagation,
    `signedReceipt` + nullable `paymentInId`, `ok: false` without
    `requirement`.
  - `tests/paywall-express.test.ts` — 402 challenge path, settle success
    with `X-Payment-Response` header + `next()`, 402 retry on failure,
    rebuild-challenge fallback, 502 on Loomal outage.
  - `tests/paywall-hono.test.ts` — same scenarios on the Hono adapter.
  - `tests/paywall-mcp.test.ts` — `PaymentRequiredError` when no
    payment is supplied, handler invocation on success, rebuild-
    challenge fallback, alternative `_meta.paymentHeader` key.
  - `tests/webhook.test.ts` — happy-path verify, mismatch, missing
    header, missing `sha256=` prefix.

## [0.4.0] — 2026-05-06

### Added
- Paywall middleware for sellers, exported under `@loomal/sdk/paywall/*`.
  Wrap a route with `requirePayment({ amount })` (Express, Hono) or a
  tool handler with `requireToolPayment(...)` (MCP) and Loomal handles
  the x402 challenge → verify → settle dance against Base mainnet.
  - `@loomal/sdk/paywall/express`
  - `@loomal/sdk/paywall/hono`
  - `@loomal/sdk/paywall/mcp`
- `PaywallConfig`, `PaywallRouteOptions`, `ChallengeResponse`,
  `RedeemResponse`, `PaymentRequirement` exported as types.
- `PaymentRequiredError` from the MCP adapter for tool-level handling.

[0.5.0]: https://github.com/loomal-ai/loomal-node/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/loomal-ai/loomal-node/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/loomal-ai/loomal-node/releases/tag/v0.4.0
