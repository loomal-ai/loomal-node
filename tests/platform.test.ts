import { describe, it, expect, vi, afterEach } from "vitest"
import { LoomalPlatform } from "../src/platform"

describe("LoomalPlatform client", () => {
  it("throws if no API key provided", () => {
    expect(() => new LoomalPlatform({ apiKey: "" })).toThrow("Platform API key is required")
  })

  it("creates client with API key", () => {
    const client = new LoomalPlatform({ apiKey: "lopk-test123" })
    expect(client.identities).toBeDefined()
  })

  it("accepts custom base URL", () => {
    const client = new LoomalPlatform({ apiKey: "lopk-test", baseUrl: "http://localhost:3001" })
    expect(client.identities).toBeDefined()
  })
})

describe("PlatformIdentitiesResource", () => {
  afterEach(() => vi.restoreAllMocks())

  it("create calls POST /v0/platform/identities", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: () => Promise.resolve({
        identityId: "id-123", name: "Agent", rawKey: "loid-abc", emailAddress: "agent@mailgent.dev",
        scopes: ["mail:read"], apiKeyPrefix: "loid-abc1", createdAt: "2026-01-01T00:00:00Z", type: "INBOX",
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new LoomalPlatform({ apiKey: "lopk-test" })
    const result = await client.identities.create({ name: "Agent", emailName: "agent", scopes: ["mail:read"] })

    expect(result.identityId).toBe("id-123")
    expect(result.rawKey).toMatch(/^loid-/)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v0/platform/identities"),
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("list calls GET /v0/platform/identities", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ identities: [{ identityId: "id-1", name: "Agent" }], count: 1 }),
    }))

    const client = new LoomalPlatform({ apiKey: "lopk-test" })
    const result = await client.identities.list()
    expect(result.identities).toHaveLength(1)
    expect(result.count).toBe(1)
  })

  it("get calls GET /v0/platform/identities/:id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ identityId: "id-123", name: "Agent", apiKeyPrefix: "loid-abc1" }),
    }))

    const client = new LoomalPlatform({ apiKey: "lopk-test" })
    const result = await client.identities.get("id-123")
    expect(result.identityId).toBe("id-123")
    expect(result.apiKeyPrefix).toBeDefined()
  })

  it("delete calls DELETE /v0/platform/identities/:id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }))

    const client = new LoomalPlatform({ apiKey: "lopk-test" })
    const result = await client.identities.delete("id-123")
    expect(result).toBeUndefined()
  })

  it("rotateKey calls POST /v0/platform/identities/:id/rotate-key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ rawKey: "loid-newkey", apiKeyPrefix: "loid-newk" }),
    }))

    const client = new LoomalPlatform({ apiKey: "lopk-test" })
    const result = await client.identities.rotateKey("id-123")
    expect(result.rawKey).toMatch(/^loid-/)
  })

  it("sends platform key in auth header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ identities: [], count: 0 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new LoomalPlatform({ apiKey: "lopk-mysecretkey" })
    await client.identities.list()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer lopk-mysecretkey" }),
      }),
    )
  })
})
