import { describe, it, expect, vi, afterEach } from "vitest"
import { Loomal } from "../src/client"

describe("CalendarResource", () => {
  afterEach(() => vi.restoreAllMocks())

  it("client has calendar resource", () => {
    const client = new Loomal({ apiKey: "mgent-test" })
    expect(client.calendar).toBeDefined()
  })

  it("create calls POST /v0/calendar", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: () => Promise.resolve({
        eventId: "evt-1", title: "Meeting", startAt: "2026-04-10T10:00:00Z",
        endAt: "2026-04-10T11:00:00Z", isAllDay: false, description: null,
        location: "Zoom", metadata: null, createdAt: "2026-04-03T00:00:00Z",
        updatedAt: "2026-04-03T00:00:00Z",
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "mgent-test" })
    const result = await client.calendar.create({
      title: "Meeting", startAt: "2026-04-10T10:00:00Z", endAt: "2026-04-10T11:00:00Z", location: "Zoom",
    })
    expect(result.eventId).toBe("evt-1")
    expect(result.title).toBe("Meeting")
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v0/calendar"),
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("list calls GET /v0/calendar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ events: [{ eventId: "evt-1", title: "Meeting" }], count: 1 }),
    }))

    const client = new Loomal({ apiKey: "mgent-test" })
    const result = await client.calendar.list()
    expect(result.events).toHaveLength(1)
    expect(result.count).toBe(1)
  })

  it("list supports from/to filters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ events: [], count: 0 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const client = new Loomal({ apiKey: "mgent-test" })
    await client.calendar.list({ from: "2026-04-01", to: "2026-04-30" })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("from=2026-04-01"),
      expect.any(Object),
    )
  })

  it("get calls GET /v0/calendar/:id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ eventId: "evt-1", title: "Meeting" }),
    }))

    const client = new Loomal({ apiKey: "mgent-test" })
    const result = await client.calendar.get("evt-1")
    expect(result.eventId).toBe("evt-1")
  })

  it("update calls PATCH /v0/calendar/:id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ eventId: "evt-1", title: "Updated Meeting" }),
    }))

    const client = new Loomal({ apiKey: "mgent-test" })
    const result = await client.calendar.update("evt-1", { title: "Updated Meeting" })
    expect(result.title).toBe("Updated Meeting")
  })

  it("delete calls DELETE /v0/calendar/:id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }))

    const client = new Loomal({ apiKey: "mgent-test" })
    const result = await client.calendar.delete("evt-1")
    expect(result).toBeUndefined()
  })

  it("setPublic calls POST /v0/calendar/public", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ calendarPublic: true }),
    }))

    const client = new Loomal({ apiKey: "mgent-test" })
    const result = await client.calendar.setPublic(true)
    expect(result.calendarPublic).toBe(true)
  })
})
