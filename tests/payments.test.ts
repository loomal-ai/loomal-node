import { describe, it, expect, vi, afterEach } from "vitest"
import { Loomal } from "../src/client"

describe("PaymentsResource", () => {
  afterEach(() => vi.restoreAllMocks())

  it("client has payments resource", () => {
    const client = new Loomal({ apiKey: "loid-test" })
    expect(client.payments).toBeDefined()
  })

  it("challenge calls POST /v0/payments/challenge with defaults", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        x402Version: 1,
        accepts: [{
          scheme: "exact",
          network: "base",
          maxAmountRequired: "50000",
          resource: "https://example.com/api",
          description: "Test API",
          mimeType: "",
          payTo: "0xabc",
          maxTimeoutSeconds: 60,
          asset: "0xusdc",
          extra: { name: "USD Coin", version: "2" },
        }],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.challenge({
      amount: "0.05",
      resource: "https://example.com/api",
    })

    expect(result.x402Version).toBe(1)
    expect(result.accepts[0].maxAmountRequired).toBe("50000")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v0/payments/challenge"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer loid-test",
          "Content-Type": "application/json",
        }),
      }),
    )

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.amount).toBe("0.05")
    expect(body.network).toBe("base")
    expect(body.resource).toBe("https://example.com/api")
  })

  it("redeem calls POST /v0/payments/redeem", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: true,
        paymentResponse: "base64-response",
        txHash: "0xtxhash",
        payer: "0xpayer",
        paymentInId: "pay-1",
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.redeem({
      paymentHeader: "base64-header",
      resource: "https://example.com/api",
      amount: "0.05",
    })

    expect(result).toMatchObject({ ok: true, txHash: "0xtxhash" })

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.paymentHeader).toBe("base64-header")
    expect(body.amount).toBe("0.05")
    expect(body.network).toBe("base")
  })

  it("redeem returns rejection body when ok=false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: false,
        stage: "verify",
        reason: "invalid_signature",
      }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.redeem({
      paymentHeader: "bad",
      resource: "https://example.com/api",
      amount: "0.05",
    })

    expect(result).toMatchObject({ ok: false, stage: "verify", reason: "invalid_signature" })
  })

  it("list calls GET /v0/payments", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        payments: [{
          id: "pay-1",
          endpointId: null,
          endpoint: null,
          network: "base",
          payerAddress: "0xpayer",
          recipientAddress: "0xrecipient",
          amountUsdcRaw: "50000",
          txHash: "0xtxhash",
          status: "settled",
          resourceUrl: "https://example.com/api",
          failureReason: null,
          createdAt: "2026-04-28T12:34:56.789Z",
          settledAt: "2026-04-28T12:34:57.123Z",
        }],
        count: 1,
      }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.list()
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].status).toBe("settled")
    expect(result.count).toBe(1)
  })

  it("list supports limit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ payments: [], count: 0 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    await client.payments.list({ limit: 50 })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=50"),
      expect.any(Object),
    )
  })

  it("get calls GET /v0/payments/:id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        id: "pay-1",
        endpointId: null,
        endpoint: null,
        network: "base",
        payerAddress: "0xpayer",
        recipientAddress: "0xrecipient",
        amountUsdcRaw: "50000",
        authorizationNonce: "0xnonce",
        txHash: "0xtxhash",
        status: "settled",
        resourceUrl: "https://example.com/api",
        failureReason: null,
        createdAt: "2026-04-28T12:34:56.789Z",
        settledAt: "2026-04-28T12:34:57.123Z",
        signedReceipt: {
          body: {
            version: 1,
            paymentInId: "pay-1",
            endpointId: null,
            identityId: "id-1",
            payerAddress: "0xpayer",
            recipientAddress: "0xrecipient",
            amountUsdcRaw: "50000",
            network: "base",
            txHash: "0xtxhash",
            timestamp: "2026-04-28T12:34:57.000Z",
          },
          signature: "base64sig",
          publicKey: "z6Mkpub",
          did: "did:web:loomal.ai:identities:id-1",
        },
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.get("pay-1")

    expect(result.id).toBe("pay-1")
    expect(result.signedReceipt.signature).toBe("base64sig")
    expect(result.signedReceipt.publicKey).toBe("z6Mkpub")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v0/payments/pay-1"),
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("get url-encodes the payment id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    await client.payments.get("pay/with slash")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v0/payments/pay%2Fwith%20slash"),
      expect.any(Object),
    )
  })
})
