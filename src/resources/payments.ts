import { LoomalApiError } from "../errors"
import type { HttpClient } from "../http"
import type {
  PaginatedPayments,
  PaymentActivityList,
  PaymentDetail,
  PaymentsPayParams,
  PaymentsPayResponse,
} from "../types"
import type {
  ChallengeResponse,
  RedeemResponse,
} from "../paywall/core"
import { MandatesResource } from "./payments-mandates"

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
  /** Spend policy for `payments.pay()`. See {@link MandatesResource}. */
  readonly mandates: MandatesResource

  constructor(private http: HttpClient) {
    this.mandates = new MandatesResource(http)
  }

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

  /**
   * Pay any x402-protected URL. Drives the full handshake on your project's
   * wallet: discover 402 challenge, check mandate caps, sign EIP-3009, retry,
   * record. Returns a discriminated union — branch on `ok`.
   *
   * Requires the `payments:spend` scope on the API key.
   */
  async pay(params: PaymentsPayParams): Promise<PaymentsPayResponse> {
    const data = await this.http.postUnchecked<unknown>("/v0/payments/pay", {
      url: params.url,
      dryRun: params.dryRun,
    })
    if (!data || typeof data !== "object" || !("ok" in (data as Record<string, unknown>))) {
      throw new LoomalApiError(
        0,
        "unexpected_response",
        "payments.pay returned a body without an `ok` discriminator",
      )
    }
    return data as PaymentsPayResponse
  }

  list(params?: { limit?: number }): Promise<PaginatedPayments> {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", String(params.limit))
    const qs = query.toString()
    return this.http.get<PaginatedPayments>(`/v0/payments${qs ? `?${qs}` : ""}`)
  }

  /**
   * Bank-statement-style activity feed for the authenticated identity —
   * merges payments received (`direction: "in"`) and sent (`direction: "out"`),
   * latest first. No scope required.
   */
  activity(params?: { limit?: number }): Promise<PaymentActivityList> {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", String(params.limit))
    const qs = query.toString()
    return this.http.get<PaymentActivityList>(`/v0/payments/activity${qs ? `?${qs}` : ""}`)
  }

  get(paymentId: string): Promise<PaymentDetail> {
    return this.http.get<PaymentDetail>(`/v0/payments/${encodeURIComponent(paymentId)}`)
  }
}
