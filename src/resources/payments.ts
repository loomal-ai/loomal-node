import type { HttpClient } from "../http"
import type {
  PaginatedPayments,
  PaymentDetail,
} from "../types"
import type {
  ChallengeResponse,
  RedeemResponse,
} from "../paywall/core"

export interface ChallengeParams {
  amount: string
  resource?: string
  description?: string
  network?: "base"
}

export interface RedeemParams {
  paymentHeader: string
  resource: string
  amount: string
  network?: "base"
  description?: string
}

export class PaymentsResource {
  constructor(private http: HttpClient) {}

  challenge(params: ChallengeParams): Promise<ChallengeResponse> {
    return this.http.post<ChallengeResponse>("/v0/payments/challenge", {
      amount: params.amount,
      network: params.network ?? "base",
      resource: params.resource,
      description: params.description,
    })
  }

  redeem(params: RedeemParams): Promise<RedeemResponse> {
    return this.http.post<RedeemResponse>("/v0/payments/redeem", {
      paymentHeader: params.paymentHeader,
      resource: params.resource,
      amount: params.amount,
      network: params.network ?? "base",
      description: params.description,
    })
  }

  list(params?: { limit?: number }): Promise<PaginatedPayments> {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", String(params.limit))
    const qs = query.toString()
    return this.http.get<PaginatedPayments>(`/v0/payments${qs ? `?${qs}` : ""}`)
  }

  get(paymentId: string): Promise<PaymentDetail> {
    return this.http.get<PaymentDetail>(`/v0/payments/${encodeURIComponent(paymentId)}`)
  }
}
