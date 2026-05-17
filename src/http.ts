import { LoomalApiError } from "./errors"

export class HttpClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "")
    this.apiKey = apiKey
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 204) return undefined as T

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new LoomalApiError(
        res.status,
        data.error || "unknown_error",
        data.message || `Request failed with status ${res.status}`,
      )
    }

    return data as T
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body)
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body)
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body)
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path)
  }

  /**
   * POST that does not throw on 4xx/5xx — returns the parsed JSON body verbatim.
   * Use for endpoints that encode their own success/failure discriminator in
   * the body (e.g. `/v0/payments/pay` returns `{ ok, ... }` with status 200,
   * 402, or 503).
   */
  async postUnchecked<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 204) return undefined as T
    const data = await res.json().catch(() => ({}))
    return data as T
  }
}
