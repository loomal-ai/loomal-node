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

  it("pay calls POST /v0/payments/pay and returns success body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: true,
        status: 200,
        content: { result: "ok" },
        contentType: "application/json",
        cost: { amountUsdc: "0.05", amountUsdcRaw: "50000", network: "base" },
        txHash: "0xtxhash",
        payer: "0xpayer",
        recipient: "0xrecipient",
        resource: "https://seller.example.com/search",
        balanceAfter: { usdc: "0.95", usdcRaw: "950000" },
        mandate: {
          mandateId: "m-1",
          spentTodayUsdcRaw: "50000",
          dailyCapUsdcRaw: "1000000",
          remainingTodayUsdcRaw: "950000",
          validUntil: "2027-01-01T00:00:00.000Z",
        },
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.pay({ url: "https://seller.example.com/search" })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.txHash).toBe("0xtxhash")
      expect(result.cost.amountUsdc).toBe("0.05")
      expect(result.content).toEqual({ result: "ok" })
    }

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v0/payments/pay"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer loid-test",
          "Content-Type": "application/json",
        }),
      }),
    )
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.url).toBe("https://seller.example.com/search")
  })

  it("pay surfaces failure body on 402 without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: () => Promise.resolve({
        ok: false,
        code: "mandate_per_call_exceeded",
        message: "Price 0.50 USDC exceeds maxPerCallUsdc 0.10",
        hint: "Raise maxPerCallUsdc on the mandate or pay a cheaper endpoint",
        resource: "https://seller.example.com/search",
        cost: { amountUsdc: "0.50", network: "base" },
      }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.pay({ url: "https://seller.example.com/search" })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("mandate_per_call_exceeded")
      expect(result.message).toContain("exceeds maxPerCallUsdc")
    }
  })

  it("pay forwards dryRun", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: true,
        status: 200,
        cost: { amountUsdc: "0.05", amountUsdcRaw: "50000", network: "base" },
        txHash: null,
        payer: "0xpayer",
        recipient: "0xrecipient",
        resource: "https://seller.example.com/search",
        balanceAfter: { usdc: "1.00", usdcRaw: "1000000" },
        mandate: {
          mandateId: "m-1",
          spentTodayUsdcRaw: "0",
          dailyCapUsdcRaw: "1000000",
          remainingTodayUsdcRaw: "1000000",
          validUntil: "2027-01-01T00:00:00.000Z",
        },
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    await client.payments.pay({ url: "https://seller.example.com/search", dryRun: true })

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.dryRun).toBe(true)
  })

  it("pay throws if the body has no `ok` discriminator", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "unauthorized", message: "missing scope" }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    await expect(
      client.payments.pay({ url: "https://seller.example.com/search" }),
    ).rejects.toThrow(/discriminator/)
  })

  it("activity calls GET /v0/payments/activity with no limit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        activity: [
          {
            id: "po-1",
            direction: "out",
            network: "base",
            amountUsdcRaw: "50000",
            counterparty: "0xseller",
            resource: "https://seller.example.com/search",
            txHash: "0xtxout",
            status: "settled",
            failureReason: null,
            createdAt: "2026-05-12T10:00:00.000Z",
            mandateId: "m-1",
          },
          {
            id: "pi-1",
            direction: "in",
            network: "base",
            amountUsdcRaw: "25000",
            counterparty: "0xbuyer",
            resource: "https://you.example.com/api",
            txHash: "0xtxin",
            status: "settled",
            failureReason: null,
            createdAt: "2026-05-11T09:00:00.000Z",
            endpointId: "se_abc",
            endpoint: { id: "se_abc", urlPattern: "https://you.example.com/api" },
          },
        ],
        count: 2,
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.activity()

    expect(result.count).toBe(2)
    expect(result.activity[0].direction).toBe("out")
    expect(result.activity[1].direction).toBe("in")
    if (result.activity[1].direction === "in") {
      expect(result.activity[1].endpoint?.urlPattern).toBe("https://you.example.com/api")
    }

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("/v0/payments/activity")
    expect(url).not.toContain("limit=")
  })

  it("activity forwards limit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ activity: [], count: 0 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    await client.payments.activity({ limit: 25 })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=25"),
      expect.any(Object),
    )
  })

  it("mandates.create calls POST /v0/payments/mandates", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        mandateId: "m_abc",
        identityId: "id-1",
        network: "base",
        maxPerCallUsdc: "0.10",
        dailyCapUsdc: "1.00",
        validUntil: "2027-01-01T00:00:00.000Z",
        sessionKeyAddress: "0xsession",
        onchainInstalled: true,
        installTxHash: "0xinstall",
        installError: null,
        spentTodayUsdc: "0",
        remainingTodayUsdc: "1.00",
        totalSpentUsdc: "0",
        callCount: 0,
        revokedAt: null,
        createdAt: "2026-05-12T10:00:00.000Z",
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const m = await client.payments.mandates.create({
      maxPerCallUsdc: "0.10",
      dailyCapUsdc: "1.00",
    })

    expect(m.mandateId).toBe("m_abc")
    expect(m.installError).toBeNull()

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body)
    expect(body.maxPerCallUsdc).toBe("0.10")
    expect(body.dailyCapUsdc).toBe("1.00")
  })

  it("mandates.list calls GET /v0/payments/mandates", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ mandates: [] }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const result = await client.payments.mandates.list()
    expect(result.mandates).toEqual([])
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v0/payments/mandates"),
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("mandates.get and mandates.revoke url-encode the id", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ mandateId: "m/x" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    await client.payments.mandates.get("m/x")
    await client.payments.mandates.revoke("m/x")

    expect(mockFetch.mock.calls[0][0]).toContain("/v0/payments/mandates/m%2Fx")
    expect(mockFetch.mock.calls[1][0]).toContain("/v0/payments/mandates/m%2Fx")
    expect(mockFetch.mock.calls[1][1].method).toBe("DELETE")
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
