# Changelog

All notable changes to `@loomal/sdk` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] — 2026-05-07

### Added
- `verifyWebhook(rawBody, headers, secret, options?)` exported from
  `@loomal/sdk/webhook`. HMAC-SHA256 signature check for Loomal webhook
  deliveries. Web Crypto under the hood, so it runs on Node, Bun, Deno,
  and Cloudflare Workers without platform-specific imports. Optional
  `loomal-timestamp` replay protection with a configurable tolerance.
- `WebhookVerificationError` with discriminated `code`:
  `missing_signature` | `invalid_signature` | `timestamp_invalid` |
  `timestamp_too_old`.

### Tests
- Added unit coverage for the paywall surface that shipped untested in
  `0.4.0`:
  - `tests/paywall-core.test.ts` — `buildChallenge`, `verifyAndSettle`,
    env var resolution (`LOOMAL_API_KEY`, `SELLER_LOOMAL_API_KEY`,
    `LOOMAL_BASE_URL`), API-key validation, error propagation.
  - `tests/paywall-express.test.ts` — 402 challenge path, settle success
    with `X-Payment-Response` header + `next()`, 402 retry on failure,
    502 fallback on Loomal outage.
  - `tests/paywall-hono.test.ts` — same four scenarios on the Hono
    adapter.
  - `tests/paywall-mcp.test.ts` — `PaymentRequiredError` when no
    payment is supplied, handler invocation on success, alternative
    `_meta.paymentHeader` key.
  - `tests/webhook.test.ts` — sha256= prefix and bare-hex signatures,
    timestamped replay window, malformed timestamp/signature, constant-
    time mismatch, whitespace tolerance.

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

[0.4.1]: https://github.com/loomal-ai/loomal-node/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/loomal-ai/loomal-node/releases/tag/v0.4.0
