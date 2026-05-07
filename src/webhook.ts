/**
 * Webhook signature verifier for Loomal deliveries.
 *
 * Loomal signs each webhook with the project's webhook secret using
 * HMAC-SHA256. The signature header looks like `sha256=<hex>`. When a
 * `loomal-timestamp` header is present, the signed payload is
 * `${timestamp}.${rawBody}` and Loomal sends the timestamp so receivers
 * can reject replayed deliveries older than `toleranceSeconds`.
 *
 * Uses Web Crypto so the helper runs on Node, Bun, Deno, and
 * Cloudflare Workers without any platform-specific imports.
 *
 *   import { verifyWebhook } from "@loomal/sdk/webhook"
 *
 *   app.post("/webhooks/loomal",
 *     express.raw({ type: "application/json" }),
 *     async (req, res) => {
 *       try {
 *         await verifyWebhook(req.body.toString(), {
 *           signature: req.header("loomal-signature"),
 *           timestamp: req.header("loomal-timestamp"),
 *         }, process.env.LOOMAL_WEBHOOK_SECRET!)
 *       } catch (e) {
 *         return res.status(400).send("invalid signature")
 *       }
 *       // handle event ...
 *     })
 */

export interface WebhookHeaders {
  /**
   * Value of the `loomal-signature` request header. May include the
   * `sha256=` prefix or be a bare hex digest.
   */
  signature?: string | null
  /**
   * Value of the `loomal-timestamp` request header (Unix seconds).
   * If present, replay protection is enabled.
   */
  timestamp?: string | null
}

export interface VerifyWebhookOptions {
  /**
   * Maximum age of a signed delivery in seconds. Default 300 (5 min).
   * Only enforced when a timestamp header is provided.
   */
  toleranceSeconds?: number
  /**
   * Override the current time for testing. Unix seconds.
   */
  nowSeconds?: number
}

export class WebhookVerificationError extends Error {
  readonly code:
    | "missing_signature"
    | "invalid_signature"
    | "timestamp_invalid"
    | "timestamp_too_old"

  constructor(
    code: WebhookVerificationError["code"],
    message?: string,
  ) {
    super(message ?? code)
    this.code = code
    this.name = "WebhookVerificationError"
  }
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data))
  const bytes = new Uint8Array(sig)
  let hex = ""
  for (const b of bytes) hex += b.toString(16).padStart(2, "0")
  return hex
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Verify an HMAC-SHA256 webhook signature. Throws
 * `WebhookVerificationError` if the signature is missing, malformed,
 * fails to match, or the timestamp is outside the replay window.
 *
 * `rawBody` must be the exact bytes Loomal signed — pass the raw request
 * body, not a re-stringified JSON object.
 */
export async function verifyWebhook(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  options: VerifyWebhookOptions = {},
): Promise<void> {
  const provided = headers.signature?.trim()
  if (!provided) {
    throw new WebhookVerificationError("missing_signature")
  }

  const sigHex = provided.startsWith("sha256=")
    ? provided.slice(7)
    : provided
  if (!/^[0-9a-fA-F]+$/.test(sigHex)) {
    throw new WebhookVerificationError(
      "invalid_signature",
      "signature is not hex-encoded",
    )
  }

  const tsHeader = headers.timestamp?.toString().trim()
  if (tsHeader) {
    const ts = Number(tsHeader)
    if (!Number.isFinite(ts) || ts <= 0) {
      throw new WebhookVerificationError("timestamp_invalid")
    }
    const tolerance = options.toleranceSeconds ?? 300
    const now = options.nowSeconds ?? Math.floor(Date.now() / 1000)
    if (Math.abs(now - ts) > tolerance) {
      throw new WebhookVerificationError("timestamp_too_old")
    }
  }

  const signedPayload = tsHeader ? `${tsHeader}.${rawBody}` : rawBody
  const expected = await hmacSha256Hex(secret, signedPayload)

  if (!timingSafeEqualHex(sigHex.toLowerCase(), expected)) {
    throw new WebhookVerificationError("invalid_signature")
  }
}
