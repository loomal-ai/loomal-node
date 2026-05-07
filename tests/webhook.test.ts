import { describe, it, expect } from "vitest"
import { verifyWebhook } from "../src/webhook"

const SECRET = "whsec_test_supersecret"

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data))
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

describe("verifyWebhook", () => {
  it("returns true on a valid sha256= signature", async () => {
    const body = '{"event":"payment.received","id":"pay_42"}'
    const sig = await hmacHex(SECRET, body)

    expect(await verifyWebhook(body, `sha256=${sig}`, SECRET)).toBe(true)
  })

  it("returns false when signature does not match", async () => {
    const body = '{"event":"payment.received"}'
    const wrong = await hmacHex("different-secret", body)

    expect(await verifyWebhook(body, `sha256=${wrong}`, SECRET)).toBe(false)
  })

  it("returns false when signature header is missing", async () => {
    expect(await verifyWebhook("{}", undefined, SECRET)).toBe(false)
    expect(await verifyWebhook("{}", null, SECRET)).toBe(false)
    expect(await verifyWebhook("{}", "", SECRET)).toBe(false)
  })

  it("returns false when signature is missing the sha256= prefix", async () => {
    const body = "{}"
    const sig = await hmacHex(SECRET, body)

    expect(await verifyWebhook(body, sig, SECRET)).toBe(false)
  })
})
