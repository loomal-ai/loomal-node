import type { HttpClient } from "../http"
import type { IdentityResponse } from "../types"
import { DEFAULT_IDENTITY_PURPOSE } from "../types"

export class IdentityResource {
  constructor(private http: HttpClient) {}

  async whoami(): Promise<IdentityResponse> {
    const raw = await this.http.get<IdentityResponse>("/v0/whoami")
    // Backfill purpose for legacy identities so callers don't need to handle
    // `null` during the rollout window. Matches the server-side Prisma backfill.
    return { ...raw, purpose: raw.purpose ?? DEFAULT_IDENTITY_PURPOSE }
  }
}
