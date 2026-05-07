/**
 * Framework-agnostic core for the @loomal/sdk paywall middleware.
 *
 * Sellers wrap a route with `requirePayment(...)` (Express, Hono, MCP) and
 * the framework adapter calls these two functions:
 *
 *   - `buildChallenge` — when no X-Payment header is present, ask Loomal
 *     to construct the 402 body (an x402 PaymentRequirements set).
 *   - `verifyAndSettle` — when a buyer retries with a signed X-Payment
 *     header, ask Loomal to verify, settle on chain, and sign a receipt.
 *
 * The framework adapters handle headers and response shape; the protocol
 * stays in one place.
 */

const DEFAULT_BASE_URL = "https://api.loomal.ai"
const DEFAULT_NETWORK: "base" = "base"

export interface PaymentRequirement {
  scheme: "exact"
  network: "base"
  maxAmountRequired: string
  resource: string
  description: string
  mimeType: string
  payTo: `0x${string}`
  maxTimeoutSeconds: number
  asset: `0x${string}`
  extra: { name: string; version: string }
}

export interface ChallengeResponse {
  x402Version: 1
  accepts: PaymentRequirement[]
}

export type RedeemResponse =
  | {
      ok: true
      paymentResponse: string
      txHash: string | null
      payer: `0x${string}`
      paymentInId: string
    }
  | {
      ok: false
      stage: "verify" | "settle"
      reason: string
      requirement: ChallengeResponse
    }

export interface PaywallConfig {
  /**
   * Loomal API key (loid-…). Reads from `LOOMAL_API_KEY` or
   * `SELLER_LOOMAL_API_KEY` env vars when omitted.
   */
  apiKey?: string
  /** Override the API base URL. Defaults to https://api.loomal.ai. */
  baseUrl?: string
  /** Network to settle on. Currently only `base` is supported. */
  network?: "base"
}

export interface PaywallRouteOptions {
  /** Decimal USDC amount as a string, e.g. "0.05". Required. */
  amount: string
  /** Optional human-readable description shown in the 402 body. */
  description?: string
  /**
   * Override the resource URL recorded in the receipt. Defaults to the
   * incoming request URL.
   */
  resource?: string
}

function resolveApiKey(explicit?: string): string {
  const key =
    explicit ??
    process.env.LOOMAL_API_KEY ??
    process.env.SELLER_LOOMAL_API_KEY ??
    ""
  if (!key.startsWith("loid-")) {
    throw new Error(
      "Loomal paywall: missing API key. Pass `apiKey` or set LOOMAL_API_KEY in your environment.",
    )
  }
  return key
}

function resolveBaseUrl(explicit?: string): string {
  return (
    explicit ??
    process.env.LOOMAL_BASE_URL ??
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "")
}

async function loomalCall<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Loomal ${path} ${res.status}: ${text.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

/**
 * Ask Loomal to build a 402 challenge body. The framework adapter sends
 * this back to the buyer as the response body of a 402 reply.
 */
export async function buildChallenge(
  config: PaywallConfig,
  resource: string,
  options: PaywallRouteOptions,
): Promise<ChallengeResponse> {
  const apiKey = resolveApiKey(config.apiKey)
  const baseUrl = resolveBaseUrl(config.baseUrl)
  return loomalCall<ChallengeResponse>(baseUrl, apiKey, "/v0/payments/challenge", {
    amount: options.amount,
    network: config.network ?? DEFAULT_NETWORK,
    resource: options.resource ?? resource,
    description: options.description ?? resource,
  })
}

/**
 * Verify a buyer-signed payment header and settle on chain. Returns the
 * settled receipt body or the reason for failure (so the framework
 * adapter can reply 402 with the requirement body again).
 */
export async function verifyAndSettle(
  config: PaywallConfig,
  resource: string,
  paymentHeader: string,
  options: PaywallRouteOptions,
): Promise<RedeemResponse> {
  const apiKey = resolveApiKey(config.apiKey)
  const baseUrl = resolveBaseUrl(config.baseUrl)
  return loomalCall<RedeemResponse>(baseUrl, apiKey, "/v0/payments/redeem", {
    paymentHeader,
    resource: options.resource ?? resource,
    amount: options.amount,
    network: config.network ?? DEFAULT_NETWORK,
  })
}
