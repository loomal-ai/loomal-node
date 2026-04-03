import type { HttpClient } from "../http"
import type {
  CreateIdentityParams,
  CreateIdentityResponse,
  IdentityDetail,
  PaginatedIdentities,
  RotateKeyResponse,
} from "../types"

export class SupervisorIdentitiesResource {
  constructor(private http: HttpClient) {}

  create(params: CreateIdentityParams): Promise<CreateIdentityResponse> {
    return this.http.post<CreateIdentityResponse>("/v0/platform/identities", params)
  }

  list(params?: { limit?: number; pageToken?: string }): Promise<PaginatedIdentities> {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", String(params.limit))
    if (params?.pageToken) query.set("pageToken", params.pageToken)
    const qs = query.toString()
    return this.http.get<PaginatedIdentities>(`/v0/platform/identities${qs ? `?${qs}` : ""}`)
  }

  get(identityId: string): Promise<IdentityDetail> {
    return this.http.get<IdentityDetail>(`/v0/platform/identities/${encodeURIComponent(identityId)}`)
  }

  delete(identityId: string): Promise<void> {
    return this.http.delete(`/v0/platform/identities/${encodeURIComponent(identityId)}`)
  }

  rotateKey(identityId: string): Promise<RotateKeyResponse> {
    return this.http.post<RotateKeyResponse>(`/v0/platform/identities/${encodeURIComponent(identityId)}/rotate-key`)
  }
}
