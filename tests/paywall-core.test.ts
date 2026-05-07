import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import {
  buildChallenge,
  verifyAndSettle,
  type ChallengeResponse,
  type RedeemResponse,
} from "../src/paywall/core"

const SAMPLE_REQ = {
  scheme: "exact" as const,
  network: "base" as const,
  maxAmountRequired: "10000",
  resource: "https://your-api.com/search",
  description: "Paid search",
  mimeType: "application/json",
  payTo: "0xabc1230000000000000000000000000000000000" as `0x${string}`,
  maxTimeoutSeconds: 60,
  asset: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as `0x${string}`,
  extra: { name: "USDC", version: "2" },
}

const SAMPLE_CHALLENGE: ChallengeResponse = {
  x402Version: 1,
  accepts: [SAMPLE_REQ],
}

function jsonRes(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  }
}

describe("paywall/core", () => {
  beforeEach(() => {
    process.env.LOOMAL_API_KEY = "loid-test-key"
    delete process.env.LOOMAL_BASE_URL
    delete process.env.SELLER_LOOMAL_API_KEY
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOOMAL_API_KEY
  })

  describe("buildChallenge", () => {
    it("posts to /v0/payments/challenge with right body", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonRes(SAMPLE_CHALLENGE))
      vi.stubGlobal("fetch", fetchMock)

      const result = await buildChallenge(
        {},
        "https://your-api.com/search",
        { amount: "0.05" },
      )

      expect(result).toEqual(SAMPLE_CHALLENGE)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.loomal.ai/v0/payments/challenge")
      expect(init.method).toBe("POST")
      expect(init.headers.Authorization).toBe("Bearer loid-test-key")
      expect(init.headers["Content-Type"]).toBe("application/json")
      expect(JSON.parse(init.body)).toEqual({
        amount: "0.05",
        network: "base",
        resource: "https://your-api.com/search",
        description: "https://your-api.com/search",
      })
    })

    it("uses route-level resource override when provided", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonRes(SAMPLE_CHALLENGE))
      vi.stubGlobal("fetch", fetchMock)

      await buildChallenge(
        {},
        "https://other.example/q", // incoming resource
        { amount: "0.05", resource: "https://override.example/api", description: "custom" },
      )

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.resource).toBe("https://override.example/api")
      expect(body.description).toBe("custom")
    })

    it("respects LOOMAL_BASE_URL env override and strips trailing slash", async () => {
      process.env.LOOMAL_BASE_URL = "https://staging.loomal.ai/"
      const fetchMock = vi.fn().mockResolvedValue(jsonRes(SAMPLE_CHALLENGE))
      vi.stubGlobal("fetch", fetchMock)

      await buildChallenge({}, "https://x.dev/q", { amount: "0.01" })

      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://staging.loomal.ai/v0/payments/challenge",
      )
    })

    it("accepts SELLER_LOOMAL_API_KEY as fallback env", async () => {
      delete process.env.LOOMAL_API_KEY
      process.env.SELLER_LOOMAL_API_KEY = "loid-seller"
      const fetchMock = vi.fn().mockResolvedValue(jsonRes(SAMPLE_CHALLENGE))
      vi.stubGlobal("fetch", fetchMock)

      await buildChallenge({}, "https://x.dev/q", { amount: "0.01" })

      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer loid-seller")
    })

    it("throws when no API key is available", async () => {
      delete process.env.LOOMAL_API_KEY
      delete process.env.SELLER_LOOMAL_API_KEY
      vi.stubGlobal("fetch", vi.fn())

      await expect(
        buildChallenge({}, "https://x.dev/q", { amount: "0.01" }),
      ).rejects.toThrow(/missing API key/)
    })

    it("throws when API key has wrong prefix", async () => {
      vi.stubGlobal("fetch", vi.fn())
      await expect(
        buildChallenge({ apiKey: "sk-bad" }, "https://x.dev/q", { amount: "0.01" }),
      ).rejects.toThrow(/missing API key/)
    })

    it("propagates Loomal API errors with status + body excerpt", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('{"error":"unauthorized"}'),
        }),
      )

      await expect(
        buildChallenge({ apiKey: "loid-k" }, "https://x.dev/q", { amount: "0.01" }),
      ).rejects.toThrow(/Loomal \/v0\/payments\/challenge 401/)
    })
  })

  describe("verifyAndSettle", () => {
    it("posts to /v0/payments/redeem with payment header and amount", async () => {
      const settled: RedeemResponse = {
        ok: true,
        paymentResponse: "eyJzdWNjZXNzIjp0cnVlfQ==",
        txHash: "0xdeadbeef",
        payer: "0xfeedface00000000000000000000000000000000",
        paymentInId: "pay_abc123",
      }
      const fetchMock = vi.fn().mockResolvedValue(jsonRes(settled))
      vi.stubGlobal("fetch", fetchMock)

      const result = await verifyAndSettle(
        { apiKey: "loid-k" },
        "https://x.dev/q",
        "x-payment-blob",
        { amount: "0.01" },
      )

      expect(result).toEqual(settled)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.loomal.ai/v0/payments/redeem")
      expect(JSON.parse(init.body)).toEqual({
        paymentHeader: "x-payment-blob",
        resource: "https://x.dev/q",
        amount: "0.01",
        network: "base",
      })
    })

    it("returns ok=false response on verify failure", async () => {
      const failed: RedeemResponse = {
        ok: false,
        stage: "verify",
        reason: "signature mismatch",
        requirement: SAMPLE_CHALLENGE,
      }
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(failed)))

      const result = await verifyAndSettle(
        { apiKey: "loid-k" },
        "https://x.dev/q",
        "bad-blob",
        { amount: "0.01" },
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.stage).toBe("verify")
        expect(result.reason).toBe("signature mismatch")
        expect(result.requirement).toEqual(SAMPLE_CHALLENGE)
      }
    })

    it("returns ok=false without requirement when API omits it", async () => {
      // payTo_mismatch / amount_mismatch responses lack `requirement`.
      // The core function should pass that shape through verbatim — the
      // adapter is responsible for rebuilding a challenge.
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonRes({
            ok: false,
            stage: "verify",
            reason: "payTo_mismatch",
          }),
        ),
      )

      const result = await verifyAndSettle(
        { apiKey: "loid-k" },
        "https://x.dev/q",
        "blob",
        { amount: "0.01" },
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.stage).toBe("verify")
        expect(result.reason).toBe("payTo_mismatch")
        expect(result.requirement).toBeUndefined()
      }
    })

    it("surfaces signedReceipt and recordingFailed on success", async () => {
      // Real API includes these on the success branch; the SDK type now
      // exposes them as optional fields.
      const settled = {
        ok: true,
        paymentResponse: "x",
        txHash: "0xdeadbeef",
        payer: "0xfeedface00000000000000000000000000000000",
        paymentInId: null, // API may return null when DB recording fails
        signedReceipt: {
          body: {
            version: 1,
            paymentInId: "p_x",
            endpointId: null,
            identityId: "id_x",
            payerAddress: "0xfeedface00000000000000000000000000000000",
            recipientAddress: "0xabc1230000000000000000000000000000000000",
            amountUsdcRaw: "10000",
            network: "base",
            txHash: "0xdeadbeef",
            timestamp: "2026-05-07T12:00:00.000Z",
          },
          signature: "base64sig==",
          publicKeyHex: "ab".repeat(32),
          alg: "Ed25519" as const,
        },
        recordingFailed: true,
      }
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(settled)))

      const result = await verifyAndSettle(
        { apiKey: "loid-k" },
        "https://x.dev/q",
        "blob",
        { amount: "0.01" },
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.paymentInId).toBeNull()
        expect(result.recordingFailed).toBe(true)
        expect(result.signedReceipt?.alg).toBe("Ed25519")
        expect(result.signedReceipt?.body.amountUsdcRaw).toBe("10000")
      }
    })

    it("uses route resource override on settle when set", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonRes({
          ok: true,
          paymentResponse: "x",
          txHash: null,
          payer: "0xfeedface00000000000000000000000000000000",
          paymentInId: "pay_xyz",
        } as RedeemResponse),
      )
      vi.stubGlobal("fetch", fetchMock)

      await verifyAndSettle(
        { apiKey: "loid-k" },
        "https://incoming.example/x",
        "blob",
        { amount: "0.01", resource: "https://override.example/y" },
      )

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.resource).toBe("https://override.example/y")
    })
  })
})
