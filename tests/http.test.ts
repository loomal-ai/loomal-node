import { describe, it, expect, vi, afterEach } from "vitest"
import { HttpClient } from "../src/http"
import { LoomalApiError } from "../src/errors"

describe("HttpClient", () => {
  afterEach(() => vi.restoreAllMocks())

  it("sends correct auth header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ identityId: "id-123" }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const http = new HttpClient("https://api.loomal.ai", "loid-secret")
    await http.get("/v0/whoami")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.loomal.ai/v0/whoami",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer loid-secret",
        }),
      }),
    )
  })

  it("throws LoomalApiError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "unauthorized", message: "Invalid API key" }),
    }))

    const http = new HttpClient("https://api.loomal.ai", "bad-key")
    await expect(http.get("/v0/whoami")).rejects.toThrow(LoomalApiError)

    try {
      await http.get("/v0/whoami")
    } catch (e) {
      const err = e as LoomalApiError
      expect(err.status).toBe(401)
      expect(err.code).toBe("unauthorized")
    }
  })

  it("handles 204 No Content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    }))

    const http = new HttpClient("https://api.loomal.ai", "loid-key")
    const result = await http.delete("/v0/messages/123")
    expect(result).toBeUndefined()
  })

  it("sends JSON body on POST", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ messageId: "msg-1" }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const http = new HttpClient("https://api.loomal.ai", "loid-key")
    await http.post("/v0/messages/send", { to: ["a@b.com"], subject: "Hi", text: "Hello" })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ to: ["a@b.com"], subject: "Hi", text: "Hello" }),
      }),
    )
  })

  it("strips trailing slash from base URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal("fetch", mockFetch)

    const http = new HttpClient("https://api.loomal.ai/", "loid-key")
    await http.get("/v0/whoami")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.loomal.ai/v0/whoami",
      expect.any(Object),
    )
  })
})
