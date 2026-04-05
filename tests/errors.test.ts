import { describe, it, expect } from "vitest"
import { LoomalApiError } from "../src/errors"

describe("LoomalApiError", () => {
  it("has correct properties", () => {
    const err = new LoomalApiError(404, "not_found", "Resource not found")
    expect(err.status).toBe(404)
    expect(err.code).toBe("not_found")
    expect(err.message).toBe("Resource not found")
    expect(err.name).toBe("LoomalApiError")
  })

  it("is an instance of Error", () => {
    const err = new LoomalApiError(500, "internal", "Server error")
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(LoomalApiError)
  })
})
