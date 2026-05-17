import type { HttpClient } from "../http"
import type { IdentityResponse } from "../types"

export class IdentityResource {
  constructor(private http: HttpClient) {}

  whoami(): Promise<IdentityResponse> {
    return this.http.get<IdentityResponse>("/v0/whoami")
  }
}
