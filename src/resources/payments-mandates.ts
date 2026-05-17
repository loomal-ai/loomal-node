import type { HttpClient } from "../http"
import type {
  Mandate,
  MandateCreateParams,
  MandateList,
} from "../types"

/**
 * Spend policy attached to your project's wallet. Loomal enforces the caps
 * server-side on every `payments.pay()` call. Create one per project (the
 * first `pay()` against an identity without a mandate will fail with
 * `mandate_not_found`).
 *
 * Mounted at `loomal.payments.mandates`.
 */
export class MandatesResource {
  constructor(private http: HttpClient) {}

  /**
   * Create (and install on-chain) a mandate. First call takes 10–30 seconds
   * while the session key lands on Base. If `installError` comes back set,
   * the mandate is unusable — retry creation.
   */
  create(params: MandateCreateParams): Promise<Mandate> {
    return this.http.post<Mandate>("/v0/payments/mandates", {
      maxPerCallUsdc: params.maxPerCallUsdc,
      dailyCapUsdc: params.dailyCapUsdc,
      network: params.network,
      validUntil: params.validUntil,
    })
  }

  list(): Promise<MandateList> {
    return this.http.get<MandateList>("/v0/payments/mandates")
  }

  get(mandateId: string): Promise<Mandate> {
    return this.http.get<Mandate>(
      `/v0/payments/mandates/${encodeURIComponent(mandateId)}`,
    )
  }

  /** Marks the mandate as revoked. Existing settled payments aren't touched. */
  revoke(mandateId: string): Promise<void> {
    return this.http.delete<void>(
      `/v0/payments/mandates/${encodeURIComponent(mandateId)}`,
    )
  }
}
