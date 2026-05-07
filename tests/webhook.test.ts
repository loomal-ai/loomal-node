import { describe, it, expect } from "vitest"
import { verifyWebhook, WebhookVerificationError } from "../src/webhook"

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
  it("accepts a valid sha256= prefixed signature without timestamp", async () => {
    const body = '{"event":"payment.settled","id":"pay_42"}'
    const sig = await hmacHex(SECRET, body)

    await expect(
      verifyWebhook(body, { signature: `sha256=${sig}` }, SECRET),
    ).resolves.toBeUndefined()
  })

  it("accepts a bare hex signature (no sha256= prefix)", async () => {
    const body = '{"event":"payment.settled"}'
    const sig = await hmacHex(SECRET, body)

    await expect(
      verifyWebhook(body, { signature: sig }, SECRET),
    ).resolves.toBeUndefined()
  })

  it("verifies with timestamp using `${ts}.${body}` signed payload", async () => {
    const ts = "1730000000"
    const body = '{"event":"payment.settled"}'
    const sig = await hmacHex(SECRET, `${ts}.${body}`)

    await expect(
      verifyWebhook(
        body,
        { signature: `sha256=${sig}`, timestamp: ts },
        SECRET,
        { nowSeconds: 1730000060, toleranceSeconds: 300 },
      ),
    ).resolves.toBeUndefined()
  })

  it("rejects when signature is missing", async () => {
    await expect(
      verifyWebhook("{}", { signature: undefined }, SECRET),
    ).rejects.toMatchObject({
      name: "WebhookVerificationError",
      code: "missing_signature",
    })
  })

  it("rejects when signature is empty string", async () => {
    await expect(
      verifyWebhook("{}", { signature: "" }, SECRET),
    ).rejects.toMatchObject({ code: "missing_signature" })
  })

  it("rejects when signature is not hex", async () => {
    await expect(
      verifyWebhook("{}", { signature: "sha256=not-hex!!!" }, SECRET),
    ).rejects.toMatchObject({ code: "invalid_signature" })
  })

  it("rejects when signature does not match", async () => {
    const body = '{"event":"payment.settled"}'
    const wrong = await hmacHex("different-secret", body)

    await expect(
      verifyWebhook(body, { signature: `sha256=${wrong}` }, SECRET),
    ).rejects.toMatchObject({ code: "invalid_signature" })
  })

  it("rejects timestamp older than tolerance window", async () => {
    const ts = "1700000000"
    const body = '{"event":"payment.settled"}'
    const sig = await hmacHex(SECRET, `${ts}.${body}`)

    await expect(
      verifyWebhook(
        body,
        { signature: `sha256=${sig}`, timestamp: ts },
        SECRET,
        { nowSeconds: 1700001000, toleranceSeconds: 300 },
      ),
    ).rejects.toMatchObject({ code: "timestamp_too_old" })
  })

  it("rejects future timestamp outside tolerance", async () => {
    const ts = "1800000000"
    const body = "{}"
    const sig = await hmacHex(SECRET, `${ts}.${body}`)

    await expect(
      verifyWebhook(
        body,
        { signature: `sha256=${sig}`, timestamp: ts },
        SECRET,
        { nowSeconds: 1700000000, toleranceSeconds: 300 },
      ),
    ).rejects.toMatchObject({ code: "timestamp_too_old" })
  })

  it("rejects non-numeric timestamp", async () => {
    await expect(
      verifyWebhook(
        "{}",
        { signature: "sha256=abc123", timestamp: "not-a-ts" },
        SECRET,
      ),
    ).rejects.toMatchObject({ code: "timestamp_invalid" })
  })

  it("rejects negative timestamp", async () => {
    await expect(
      verifyWebhook(
        "{}",
        { signature: "sha256=abc123", timestamp: "-1" },
        SECRET,
      ),
    ).rejects.toMatchObject({ code: "timestamp_invalid" })
  })

  it("WebhookVerificationError instance carries code", async () => {
    try {
      await verifyWebhook("{}", { signature: undefined }, SECRET)
      expect.fail("expected throw")
    } catch (e) {
      expect(e).toBeInstanceOf(WebhookVerificationError)
      expect((e as WebhookVerificationError).code).toBe("missing_signature")
    }
  })

  it("trims whitespace around the signature header value", async () => {
    const body = "{}"
    const sig = await hmacHex(SECRET, body)

    await expect(
      verifyWebhook(body, { signature: `  sha256=${sig}  ` }, SECRET),
    ).resolves.toBeUndefined()
  })
})
