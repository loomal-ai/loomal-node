import { describe, it, expect } from "vitest"
import { Loomal } from "../src/client"

describe("Loomal client", () => {
  it("throws if no API key provided", () => {
    expect(() => new Loomal({ apiKey: "" })).toThrow("API key is required")
  })

  it("creates client with API key", () => {
    const client = new Loomal({ apiKey: "loid-test123" })
    expect(client.identity).toBeDefined()
    expect(client.mail).toBeDefined()
    expect(client.vault).toBeDefined()
    expect(client.logs).toBeDefined()
    expect(client.did).toBeDefined()
  })

  it("accepts custom base URL", () => {
    const client = new Loomal({ apiKey: "loid-test", baseUrl: "http://localhost:3001" })
    expect(client.identity).toBeDefined()
  })
})
