import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { requirePayment } from "../src/paywall/express"

interface FakeReq {
  protocol: string
  originalUrl?: string
  url: string
  headers: Record<string, string>
  get(name: string): string | undefined
}

interface FakeRes {
  statusCode?: number
  headers: Record<string, string>
  body?: unknown
  status(code: number): FakeRes
  json(body: unknown): FakeRes
  setHeader(name: string, value: string): void
}

function makeReq(opts: { url?: string; xPayment?: string } = {}): FakeReq {
  const headers: Record<string, string> = {
    host: "your-api.com",
  }
  if (opts.xPayment) headers["x-payment"] = opts.xPayment
  return {
    protocol: "https",
    url: opts.url ?? "/api/search",
    originalUrl: opts.url ?? "/api/search",
    headers,
    get(name) {
      return headers[name.toLowerCase()]
    },
  }
}

function makeRes(): FakeRes {
  const res: FakeRes = {
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
  return res
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

describe("paywall/express", () => {
  beforeEach(() => {
    process.env.LOOMAL_API_KEY = "loid-test-key"
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOOMAL_API_KEY
  })

  it("returns 402 with challenge body when x-payment is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(CHALLENGE_BODY),
      text: () => Promise.resolve(JSON.stringify(CHALLENGE_BODY)),
    })
    vi.stubGlobal("fetch", fetchMock)

    const middleware = requirePayment({ amount: "0.05" })
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(req as any, res as any, next as any)

    expect(res.statusCode).toBe(402)
    expect(res.body).toEqual(CHALLENGE_BODY)
    expect(next).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.loomal.ai/v0/payments/challenge",
    )
  })

  it("calls next() and sets X-Payment-Response on settle success", async () => {
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
    const req = makeReq({ xPayment: "signed-blob" })
    const res = makeRes()
    const next = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(req as any, res as any, next as any)

    expect(res.statusCode).toBeUndefined()
    expect(res.headers["X-Payment-Response"]).toBe("eyJvayI6dHJ1ZX0=")
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("returns 402 with requirement on verify/settle failure", async () => {
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

    const middleware = requirePayment({ amount: "0.05" })
    const req = makeReq({ xPayment: "bad-blob" })
    const res = makeRes()
    const next = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(req as any, res as any, next as any)

    expect(res.statusCode).toBe(402)
    expect(res.body).toEqual(CHALLENGE_BODY)
    expect(next).not.toHaveBeenCalled()
  })

  it("rebuilds a fresh challenge when redeem.ok=false omits requirement", async () => {
    // Real API behavior on payTo_mismatch / amount_mismatch: returns
    // `{ ok: false, stage, reason }` with NO `requirement` field. The
    // adapter must fetch a fresh challenge so the buyer can retry.
    const fetchMock = vi.fn()
      // First call: redeem returns ok=false without requirement
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: false,
            stage: "verify",
            reason: "payTo_mismatch",
          }),
        text: () => Promise.resolve(""),
      })
      // Second call: rebuilt challenge
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(CHALLENGE_BODY),
        text: () => Promise.resolve(JSON.stringify(CHALLENGE_BODY)),
      })
    vi.stubGlobal("fetch", fetchMock)

    const middleware = requirePayment({ amount: "0.05" })
    const req = makeReq({ xPayment: "stale-blob" })
    const res = makeRes()
    const next = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(req as any, res as any, next as any)

    expect(res.statusCode).toBe(402)
    expect(res.body).toEqual(CHALLENGE_BODY)
    expect(next).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.loomal.ai/v0/payments/redeem",
    )
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.loomal.ai/v0/payments/challenge",
    )
  })

  it("returns 502 with error body when Loomal call throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ETIMEDOUT")))

    const middleware = requirePayment({ amount: "0.05" })
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(req as any, res as any, next as any)

    expect(res.statusCode).toBe(502)
    expect(res.body).toMatchObject({ error: "loomal_paywall_error" })
    expect(next).not.toHaveBeenCalled()
  })
})
