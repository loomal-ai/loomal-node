import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { requirePayment } from "../src/paywall/hono"

interface FakeContext {
  req: {
    url: string
    header: (name: string) => string | undefined
  }
  headersOut: Record<string, string>
  json: ReturnType<typeof vi.fn>
  header: (name: string, value: string) => void
}

function makeContext(opts: { url?: string; xPayment?: string } = {}): FakeContext {
  const headers: Record<string, string> = {}
  if (opts.xPayment) headers["x-payment"] = opts.xPayment
  const ctx: FakeContext = {
    req: {
      url: opts.url ?? "https://your-api.com/api/search",
      header: (name) => headers[name.toLowerCase()],
    },
    headersOut: {},
    json: vi.fn((body, status) => ({ body, status })),
    header: (name, value) => {
      ctx.headersOut[name] = value
    },
  }
  return ctx
}

const CHALLENGE_BODY = {
  x402Version: 1,
  accepts: [
    {
      scheme: "exact",
      network: "base",
      maxAmountRequired: "10000",
      resource: "https://your-api.com/api/search",
      description: "Paid search",
      mimeType: "application/json",
      payTo: "0xabc1230000000000000000000000000000000000",
      maxTimeoutSeconds: 60,
      asset: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      extra: { name: "USDC", version: "2" },
    },
  ],
}

describe("paywall/hono", () => {
  beforeEach(() => {
    process.env.LOOMAL_API_KEY = "loid-test-key"
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOOMAL_API_KEY
  })

  it("returns c.json(challenge, 402) when x-payment is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(CHALLENGE_BODY),
        text: () => Promise.resolve(JSON.stringify(CHALLENGE_BODY)),
      }),
    )

    const middleware = requirePayment({ amount: "0.05" })
    const ctx = makeContext()
    const next = vi.fn().mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(ctx as any, next)

    expect(ctx.json).toHaveBeenCalledWith(CHALLENGE_BODY, 402)
    expect(next).not.toHaveBeenCalled()
  })

  it("sets X-Payment-Response and calls next() on settle success", async () => {
    const settled = {
      ok: true,
      paymentResponse: "eyJvayI6dHJ1ZX0=",
      txHash: "0xdeadbeef",
      payer: "0xfeedface00000000000000000000000000000000",
      paymentInId: "pay_42",
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

    const middleware = requirePayment({ amount: "0.05" })
    const ctx = makeContext({ xPayment: "signed-blob" })
    const next = vi.fn().mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(ctx as any, next)

    expect(ctx.headersOut["X-Payment-Response"]).toBe("eyJvayI6dHJ1ZX0=")
    expect(next).toHaveBeenCalledTimes(1)
    expect(ctx.json).not.toHaveBeenCalled()
  })

  it("returns 402 with requirement on settle failure", async () => {
    const failed = {
      ok: false,
      stage: "settle",
      reason: "facilitator down",
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

    const middleware = requirePayment({ amount: "0.05" })
    const ctx = makeContext({ xPayment: "blob" })
    const next = vi.fn().mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(ctx as any, next)

    expect(ctx.json).toHaveBeenCalledWith(CHALLENGE_BODY, 402)
    expect(next).not.toHaveBeenCalled()
  })

  it("rebuilds a fresh challenge when redeem.ok=false omits requirement", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: false,
            stage: "verify",
            reason: "amount_mismatch",
          }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(CHALLENGE_BODY),
        text: () => Promise.resolve(JSON.stringify(CHALLENGE_BODY)),
      })
    vi.stubGlobal("fetch", fetchMock)

    const middleware = requirePayment({ amount: "0.05" })
    const ctx = makeContext({ xPayment: "stale-blob" })
    const next = vi.fn().mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(ctx as any, next)

    expect(ctx.json).toHaveBeenCalledWith(CHALLENGE_BODY, 402)
    expect(next).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("returns 502 error body when Loomal call throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))

    const middleware = requirePayment({ amount: "0.05" })
    const ctx = makeContext()
    const next = vi.fn().mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(ctx as any, next)

    expect(ctx.json).toHaveBeenCalledTimes(1)
    const [body, status] = ctx.json.mock.calls[0]
    expect(status).toBe(502)
    expect(body).toMatchObject({ error: "loomal_paywall_error" })
    expect(next).not.toHaveBeenCalled()
  })
})
