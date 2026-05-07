/**
 * Verify a Loomal webhook signature.
 *
 * Loomal sends `X-Loomal-Signature: sha256=<hex>` — an HMAC-SHA256 of
 * the raw request body using the project's webhook secret. Pass the
 * raw body bytes the request arrived with (don't re-stringify the JSON).
 *
 *   import { verifyWebhook } from "@loomal/sdk/webhook"
 *
 *   const ok = await verifyWebhook(
 *     rawBody,
 *     req.header("x-loomal-signature"),
 *     process.env.LOOMAL_WEBHOOK_SECRET!,
 *   )
 *   if (!ok) return res.status(400).send("invalid signature")
 *
 * Uses Web Crypto so the same helper runs on Node, Bun, Deno, and
 * Cloudflare Workers.
 */
export async function verifyWebhook(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): Promise<boolean> {
  // Reject empty secret outright. Web Crypto throws DataError on a
  // zero-length HMAC key, which would crash the caller's webhook
  // handler. An unset env var passed straight through ('' or
  // undefined) is the obvious foot-gun. Fail closed.
  if (!secret) return false
  if (!signature || !signature.startsWith("sha256=")) return false
  const provided = signature.slice(7).toLowerCase()
  if (!/^[0-9a-f]+$/.test(provided)) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)),
  )
  let expected = ""
  for (const b of sig) expected += b.toString(16).padStart(2, "0")

  return timingSafeEqual(provided, expected)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
