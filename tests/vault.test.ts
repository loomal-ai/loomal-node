import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { Loomal } from "../src/client"

function mockPutOk() {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      credentialId: "cred-1",
      name: "test",
      type: "API_KEY",
      metadata: null,
      expiresAt: null,
      lastUsedAt: null,
      lastRotatedAt: null,
      createdAt: "2026-04-16T00:00:00Z",
    }),
  })
  vi.stubGlobal("fetch", mockFetch)
  return mockFetch
}

function parseBody(call: unknown) {
  // vi.fn mock call shape: [url, init]
  const [, init] = call as [string, { body: string }]
  return JSON.parse(init.body)
}

describe("VaultResource store helpers", () => {
  afterEach(() => vi.restoreAllMocks())

  it("storeApiKey with a string stores legacy { key } shape", async () => {
    const mockFetch = mockPutOk()
    const client = new Loomal({ apiKey: "loid-test" })
    await client.vault.storeApiKey("stripe", "sk_live_abc123")

    const body = parseBody(mockFetch.mock.calls[0])
    expect(body.type).toBe("API_KEY")
    expect(body.data).toEqual({ key: "sk_live_abc123" })
    expect(body.metadata?.clientId).toBeUndefined()
  })

  it("storeApiKey with { clientId, secret } stores OAuth-style pair and mirrors clientId in metadata", async () => {
    const mockFetch = mockPutOk()
    const client = new Loomal({ apiKey: "loid-test" })
    await client.vault.storeApiKey("twitter", { clientId: "abc123", secret: "def456" })

    const body = parseBody(mockFetch.mock.calls[0])
    expect(body.type).toBe("API_KEY")
    expect(body.data).toEqual({ clientId: "abc123", secret: "def456" })
    expect(body.metadata.clientId).toBe("abc123")
  })

  it("storeCard encrypts all card fields and derives last4 in metadata", async () => {
    const mockFetch = mockPutOk()
    const client = new Loomal({ apiKey: "loid-test" })
    await client.vault.storeCard("personal-visa", {
      cardholder: "Jane Doe",
      number: "4242 4242 4242 4242",
      expMonth: "12",
      expYear: "2029",
      cvc: "123",
      zip: "94103",
    }, { metadata: { brand: "Visa" } })

    const body = parseBody(mockFetch.mock.calls[0])
    expect(body.type).toBe("CARD")
    expect(body.data.cardholder).toBe("Jane Doe")
    expect(body.data.number).toBe("4242 4242 4242 4242")
    expect(body.data.cvc).toBe("123")
    expect(body.metadata.last4).toBe("4242")
    expect(body.metadata.brand).toBe("Visa")
  })

  it("storeShippingAddress puts all fields in encrypted data", async () => {
    const mockFetch = mockPutOk()
    const client = new Loomal({ apiKey: "loid-test" })
    await client.vault.storeShippingAddress("home", {
      name: "Autonomous Agent",
      line1: "1 Demo Way",
      city: "San Francisco",
      state: "CA",
      postcode: "94103",
      country: "US",
      phone: "+1-555-0100",
    })

    const body = parseBody(mockFetch.mock.calls[0])
    expect(body.type).toBe("SHIPPING_ADDRESS")
    expect(body.data.line1).toBe("1 Demo Way")
    expect(body.data.country).toBe("US")
    expect(body.data.phone).toBe("+1-555-0100")
  })

  it("generic store still works for arbitrary types", async () => {
    const mockFetch = mockPutOk()
    const client = new Loomal({ apiKey: "loid-test" })
    await client.vault.store("db", {
      type: "DATABASE",
      data: { password: "s3cr3t" },
      metadata: { host: "db.example.com" },
    })

    const body = parseBody(mockFetch.mock.calls[0])
    expect(body.type).toBe("DATABASE")
    expect(body.data.password).toBe("s3cr3t")
  })
})

describe("VaultResource TOTP + backup codes", () => {
  afterEach(() => vi.restoreAllMocks())

  it("totp returns parsed response including backupCodesRemaining when present", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "123456", remaining: 22, backupCodesRemaining: 4 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const res = await client.vault.totp("github-2fa")

    expect(mockFetch.mock.calls[0][0]).toContain("/v0/vault/github-2fa/totp")
    expect(res).toEqual({ code: "123456", remaining: 22, backupCodesRemaining: 4 })
  })

  it("totp parses response without backupCodesRemaining (older API)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "654321", remaining: 17 }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    const res = await client.vault.totp("legacy")

    expect(res.code).toBe("654321")
    expect(res.backupCodesRemaining).toBeUndefined()
  })

  it("totpUseBackup POSTs to /totp/backup and returns parsed response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "bk-aaaa-1111", remaining: 3 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    const res = await client.vault.totpUseBackup("github-2fa")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain("/v0/vault/github-2fa/totp/backup")
    expect((init as { method: string }).method).toBe("POST")
    expect(res).toEqual({ code: "bk-aaaa-1111", remaining: 3 })
  })

  it("totpUseBackup accepts arbitrary text codes (not just digits)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "letters-AND-digits-123_OK!", remaining: 0 }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    const res = await client.vault.totpUseBackup("x")
    expect(res.code).toBe("letters-AND-digits-123_OK!")
    expect(res.remaining).toBe(0)
  })

  it("totpUseBackup encodes the credential name", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "x", remaining: 0 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "loid-test" })
    await client.vault.totpUseBackup("name with spaces/and/slashes")

    expect(mockFetch.mock.calls[0][0]).toContain(
      "/v0/vault/name%20with%20spaces%2Fand%2Fslashes/totp/backup",
    )
  })

  it("totpUseBackup throws LoomalApiError on 400 (no codes left)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: () => Promise.resolve({ error: "bad_request", message: "No unused backup codes remaining", status: 400 }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    await expect(client.vault.totpUseBackup("drained")).rejects.toMatchObject({
      status: 400,
      code: "bad_request",
    })
  })

  it("totpUseBackup throws LoomalApiError on 404 (unknown credential)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 404,
      json: () => Promise.resolve({ error: "not_found", message: "Credential not found", status: 404 }),
    }))

    const client = new Loomal({ apiKey: "loid-test" })
    await expect(client.vault.totpUseBackup("missing")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    })
  })
})

const integrationDescribe = process.env.LOOMAL_API_URL ? describe : describe.skip
integrationDescribe("VaultResource integration (live API)", () => {
  const baseUrl = process.env.LOOMAL_API_URL!
  const apiKey = process.env.LOOMAL_API_KEY!
  const credName = process.env.LOOMAL_TEST_CRED || "test-totp-node"

  // Earlier suites in this file stub global fetch via vi.stubGlobal — clear it
  // so the real fetch is used here, otherwise we hit the live API through a stub.
  beforeEach(() => { vi.unstubAllGlobals() })

  it("totp returns code, remaining, and backupCodesRemaining (>=0)", async () => {
    const client = new Loomal({ apiKey, baseUrl })
    const res = await client.vault.totp(credName)
    expect(typeof res.code).toBe("string")
    expect(res.code).toMatch(/^\d{6}$/)
    expect(typeof res.remaining).toBe("number")
    expect(typeof res.backupCodesRemaining).toBe("number")
    expect(res.backupCodesRemaining).toBeGreaterThanOrEqual(0)
  })

  it("totpUseBackup consumes a code and decrements the count", async () => {
    const client = new Loomal({ apiKey, baseUrl })
    const before = (await client.vault.totp(credName)).backupCodesRemaining ?? 0
    if (before === 0) return // nothing to consume
    const used = await client.vault.totpUseBackup(credName)
    expect(typeof used.code).toBe("string")
    expect(used.code.length).toBeGreaterThan(0)
    expect(used.remaining).toBe(before - 1)
  })

  it("totpUseBackup returns DIFFERENT codes on consecutive calls (single-use)", async () => {
    const client = new Loomal({ apiKey, baseUrl })
    const before = (await client.vault.totp(credName)).backupCodesRemaining ?? 0
    if (before < 2) return
    const a = await client.vault.totpUseBackup(credName)
    const b = await client.vault.totpUseBackup(credName)
    expect(a.code).not.toBe(b.code)
  })

  it("totpUseBackup throws 400 once codes are exhausted", async () => {
    const client = new Loomal({ apiKey, baseUrl })
    // drain
    let safety = 20
    while (safety-- > 0) {
      try { await client.vault.totpUseBackup(credName) }
      catch (e: any) {
        if (e.status === 400) {
          expect(e.code).toBe("bad_request")
          return
        }
        throw e
      }
    }
    // if we got here, drain another
    await expect(client.vault.totpUseBackup(credName)).rejects.toMatchObject({ status: 400 })
  })

  it("totpUseBackup throws 404 for unknown credential", async () => {
    const client = new Loomal({ apiKey, baseUrl })
    await expect(client.vault.totpUseBackup("__definitely_not_real__")).rejects.toMatchObject({
      status: 404,
    })
  })
})
