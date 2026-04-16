import { describe, it, expect, vi, afterEach } from "vitest"
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
