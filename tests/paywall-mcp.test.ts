import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import {
  requireToolPayment,
  PaymentRequiredError,
} from "../src/paywall/mcp"

const CHALLENGE_BODY = {
  x402Version: 1,
  accepts: [
    {
      scheme: "exact",
      network: "base",
      maxAmountRequired: "10000",
      resource: "tool",
      description: "tool",
      mimeType: "application/json",
      payTo: "0xabc1230000000000000000000000000000000000",
      maxTimeoutSeconds: 60,
      asset: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      extra: { name: "USDC", version: "2" },
    },
  ],
}

describe("paywall/mcp", () => {
  beforeEach(() => {
    process.env.LOOMAL_API_KEY = "loid-test-key"
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOOMAL_API_KEY
  })

  it("throws PaymentRequiredError with challenge when no x-payment in _meta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(CHALLENGE_BODY),
        text: () => Promise.resolve(JSON.stringify(CHALLENGE_BODY)),
      }),
    )

    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = requireToolPayment({ amount: "0.05" }, handler)

    await expect(wrapped({ q: "x" }, { _meta: {} })).rejects.toBeInstanceOf(
      PaymentRequiredError,
    )
    expect(handler).not.toHaveBeenCalled()
  })

  it("invokes wrapped handler when payment redeems", async () => {
    const settled = {
      ok: true,
      paymentResponse: "eyJ4Ijp0cnVlfQ==",
      txHash: "0xdeadbeef",
      payer: "0xfeedface00000000000000000000000000000000",
      paymentInId: "pay_xyz",
    }
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(settled),
        text: () => Promise.resolve(JSON.stringify(settled)),
      }),
    )

    const handler = vi.fn().mockResolvedValue({ results: ["a", "b"] })
    const wrapped = requireToolPayment({ amount: "0.05" }, handler)

    const result = await wrapped(
      { q: "x" },
      { _meta: { "x-payment": "signed-blob" } },
    )

    expect(handler).toHaveBeenCalledWith({ q: "x" }, expect.any(Object))
    expect(result).toEqual({ results: ["a", "b"] })
  })

  it("throws PaymentRequiredError on settle failure with requirement", async () => {
    const failed = {
      ok: false,
      stage: "verify",
      reason: "signature mismatch",
      requirement: CHALLENGE_BODY,
    }
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(failed),
        text: () => Promise.resolve(JSON.stringify(failed)),
      }),
    )

    const handler = vi.fn()
    const wrapped = requireToolPayment({ amount: "0.05" }, handler)

    try {
      await wrapped({ q: "x" }, { _meta: { "x-payment": "bad-blob" } })
      expect.fail("expected PaymentRequiredError")
    } catch (err) {
      expect(err).toBeInstanceOf(PaymentRequiredError)
      expect((err as PaymentRequiredError).challenge).toEqual(CHALLENGE_BODY)
    }
    expect(handler).not.toHaveBeenCalled()
  })

  it("reads payment header from _meta.paymentHeader as fallback", async () => {
    const settled = {
      ok: true,
      paymentResponse: "x",
      txHash: null,
      payer: "0xfeedface00000000000000000000000000000000",
      paymentInId: "pay_y",
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(settled),
      text: () => Promise.resolve(JSON.stringify(settled)),
    })
    vi.stubGlobal("fetch", fetchMock)

    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = requireToolPayment({ amount: "0.05" }, handler)

    await wrapped({ q: "x" }, { _meta: { paymentHeader: "alt-key-blob" } })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.paymentHeader).toBe("alt-key-blob")
    expect(handler).toHaveBeenCalled()
  })
})
