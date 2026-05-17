export interface MessageResponse {
  messageId: string
  threadId: string
  inboxId: string
  from: string[]
  to: string[]
  cc: string[]
  subject: string | null
  text: string | null
  extractedText: string | null
  labels: string[]
  createdAt: string
}

export interface ThreadResponse {
  threadId: string
  inboxId: string
  subject: string | null
  createdAt: string
  updatedAt: string
  messageCount?: number
}

export interface ThreadDetailResponse extends ThreadResponse {
  totalMessages: number
  messages: MessageResponse[]
}

export type VaultCredentialType =
  | "LOGIN" | "API_KEY" | "OAUTH" | "TOTP" | "SSH_KEY"
  | "DATABASE" | "SMTP" | "AWS" | "CERTIFICATE"
  | "CARD" | "SHIPPING_ADDRESS" | "CUSTOM"

/** Single API key / secret. */
export interface ApiKeySecretData {
  key: string
}

/** OAuth-style client credentials (client id + secret). */
export interface ApiKeyClientPairData {
  clientId: string
  secret: string
}

/** Payment card stored as an encrypted credential (not a payment processor). */
export interface CardData {
  cardholder: string
  number: string
  expMonth: string
  expYear: string
  cvc: string
  zip?: string
}

export interface CardMetadata {
  brand?: string
  last4?: string
}

/** Shipping / mailing address stored as an encrypted credential. */
export interface ShippingAddressData {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postcode: string
  country: string
  phone?: string
}

export interface CredentialMetadata {
  credentialId: string
  type: VaultCredentialType
  name: string
  metadata: Record<string, unknown> | null
  expiresAt: string | null
  lastUsedAt: string | null
  lastRotatedAt: string | null
  createdAt: string
}

export interface CredentialWithData extends CredentialMetadata {
  data: Record<string, unknown>
}

/**
 * SELLER projects accept x402 payments on registered endpoints (their server
 * imports `@loomal/sdk/paywall/*` middleware). BUYER projects spend via
 * mandates and own the agent infrastructure (inbox, vault, calendar, identity
 * signing) used by autonomous agents.
 *
 * Default scopes attached at create time differ by purpose — branch on this
 * field if your code needs to behave differently per role.
 */
export type IdentityPurpose = "SELLER" | "BUYER"

/**
 * Default applied client-side when `purpose` is absent from a server response.
 * Matches the Prisma backfill (legacy identities are treated as BUYER) so client
 * code never has to handle a null purpose during the rollout window.
 */
export const DEFAULT_IDENTITY_PURPOSE: IdentityPurpose = "BUYER"

export interface IdentityResponse {
  identityId: string
  name: string
  email: string
  displayName: string
  type: string
  /** SELLER or BUYER. Defaults to `"BUYER"` on legacy identities created before the split was rolled out (matches the server-side backfill). */
  purpose: IdentityPurpose
  scopes: string[]
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
  wallet: { address: string } | null
}

export interface ActivityLog {
  id: string
  action: string
  category: string
  severity: string
  status: string
  description: string | null
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown> | null
  durationMs: number | null
  createdAt: string
}

export interface LogsStatsResponse {
  total: number
  today: number
  errors: number
  byCategory: Record<string, number>
}

export interface TotpResponse {
  code: string
  remaining: number
  /** Count of single-use TOTP backup codes still stored. Use `vault.totpUseBackup` to consume one. */
  backupCodesRemaining?: number
}

export interface TotpBackupResponse {
  /** The consumed backup code. Single-use — never returned again. */
  code: string
  /** Backup codes still unused after this call. */
  remaining: number
}

export interface LoomalConfig {
  apiKey: string
  baseUrl?: string
}

export interface PaginatedMessages {
  messages: MessageResponse[]
  count: number
  nextPageToken?: string
}

export interface PaginatedThreads {
  threads: ThreadResponse[]
  count: number
  nextPageToken?: string
}

export interface PaginatedLogs {
  logs: ActivityLog[]
  count: number
  nextPageToken?: string
}

export interface IdentitySummary {
  identityId: string
  name: string
  type: string
  /** SELLER or BUYER. Defaults to `"BUYER"` on legacy identities created before the split was rolled out (matches the server-side backfill). */
  purpose: IdentityPurpose
  email: string | null
  scopes: string[]
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
}

export interface IdentityDetail extends IdentitySummary {
  apiKeyPrefix: string
}

export interface CreateIdentityParams {
  name: string
  emailName: string
  scopes: string[]
  /** SELLER or BUYER — required at create time. */
  purpose?: IdentityPurpose
}

export interface CreateIdentityResponse {
  identityId: string
  name: string
  type: string
  purpose: IdentityPurpose | null
  emailAddress: string
  scopes: string[]
  apiKeyPrefix: string
  rawKey: string
  createdAt: string
}

export interface RotateKeyResponse {
  rawKey: string
  apiKeyPrefix: string
}

export interface PaginatedIdentities {
  identities: IdentitySummary[]
  count: number
  nextPageToken?: string
}

export interface PlatformConfig {
  apiKey: string
  baseUrl?: string
}

export interface CalendarEvent {
  eventId: string
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  isAllDay: boolean
  location: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface CreateCalendarEventParams {
  title: string
  description?: string
  startAt: string
  endAt?: string
  isAllDay?: boolean
  location?: string
  metadata?: Record<string, unknown>
}

export interface UpdateCalendarEventParams {
  title?: string
  description?: string | null
  startAt?: string
  endAt?: string | null
  isAllDay?: boolean
  location?: string | null
  metadata?: Record<string, unknown> | null
}

export interface PaginatedCalendarEvents {
  events: CalendarEvent[]
  count: number
}

export interface VaultList {
  credentials: CredentialMetadata[]
  count: number
}

export interface EmailRuleResponse {
  id: string
  type: "ALLOW" | "BLOCK"
  scope: "RECEIVE" | "SEND" | "REPLY"
  value: string
  createdAt: string
}

export type PaymentStatus = "settled" | "verified" | "failed" | "unpaid_delivered"

export interface PaymentEndpointSummary {
  id: string
  urlPattern: string
  priceUsdc: string
}

export interface PaymentSummary {
  id: string
  endpointId: string | null
  endpoint: PaymentEndpointSummary | null
  network: "base"
  payerAddress: string
  recipientAddress: string
  /** Raw USDC units (6 decimals). e.g. "50000" = 0.05 USDC. */
  amountUsdcRaw: string
  txHash: string | null
  status: PaymentStatus
  resourceUrl: string
  failureReason: string | null
  createdAt: string
  settledAt: string | null
}

export interface PaymentReceiptBody {
  version: 1
  paymentInId: string
  endpointId: string | null
  identityId: string
  payerAddress: string
  recipientAddress: string
  amountUsdcRaw: string
  network: "base"
  txHash: string
  timestamp: string
}

export interface PaymentReceipt {
  body: PaymentReceiptBody
  signature: string
  publicKey: string
  did: string
}

export interface PaymentDetail extends PaymentSummary {
  authorizationNonce: string
  signedReceipt: PaymentReceipt
}

export interface PaginatedPayments {
  payments: PaymentSummary[]
  count: number
}

// --- x402 buyer-side: pay() params, error codes, and response shape ---

export const PAYMENT_ERROR_CODES = {
  MANDATE_NOT_FOUND: "mandate_not_found",
  MANDATE_EXPIRED: "mandate_expired",
  MANDATE_REVOKED: "mandate_revoked",
  MANDATE_DAILY_CAP_EXCEEDED: "mandate_daily_cap_exceeded",
  MANDATE_PER_CALL_EXCEEDED: "mandate_per_call_exceeded",
  SESSION_KEY_NOT_INSTALLED: "session_key_not_installed",
  SESSION_KEY_INSTALL_FAILED: "session_key_install_failed",
  WALLET_NOT_PROVISIONED: "wallet_not_provisioned",
  BALANCE_INSUFFICIENT: "balance_insufficient",
  URL_NOT_X402: "url_not_x402",
  NETWORK_UNSUPPORTED: "network_unsupported",
  NETWORK_MISMATCH: "network_mismatch",
  PAYMENT_RESPONSE_INVALID: "payment_response_invalid",
  SETTLE_FAILED: "settle_failed",
  FACILITATOR_UNAVAILABLE: "facilitator_unavailable",
  PAYMENTS_DISABLED: "payments_disabled",
  UNAUTHORIZED: "unauthorized",
} as const

export type PaymentErrorCode =
  (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]

export interface PaymentError {
  code: PaymentErrorCode
  message: string
  hint?: string
  retryAfterMs?: number
}

export interface PaymentsPayParams {
  /** Any x402-protected URL. */
  url: string
  /** Run mandate + balance checks without signing or moving money. */
  dryRun?: boolean
}

export interface PaymentsPaySuccess {
  ok: true
  /** HTTP status from the paid endpoint after settlement. */
  status: number
  /** Parsed JSON body if the endpoint returned application/json. */
  content?: unknown
  /** Raw body if non-JSON. */
  contentText?: string
  contentType?: string
  cost: {
    /** Decimal USDC, e.g. "0.05". */
    amountUsdc: string
    /** Raw USDC units (6 decimals), e.g. "50000". */
    amountUsdcRaw: string
    network: string
  }
  txHash: string | null
  payer: string
  recipient: string
  resource: string
  balanceAfter: {
    usdc: string
    usdcRaw: string
  }
  mandate: {
    mandateId: string
    spentTodayUsdcRaw: string
    dailyCapUsdcRaw: string
    remainingTodayUsdcRaw: string
    /** ISO 8601. */
    validUntil: string
  }
  /** Signed receipt from seller, when surfaced. */
  receipt?: unknown
}

export interface PaymentsPayFailure extends PaymentError {
  ok: false
  resource?: string
  cost?: { amountUsdc: string; network: string }
}

export type PaymentsPayResponse = PaymentsPaySuccess | PaymentsPayFailure

// --- Bank-statement-style activity feed (buyer + seller, merged) ---

interface PaymentActivityCommon {
  id: string
  network: string
  /** Raw USDC units (6 decimals), e.g. "50000" = 0.05 USDC. */
  amountUsdcRaw: string
  /** Counterparty address. For `in` rows this is the payer; for `out` rows the recipient. */
  counterparty: string
  resource: string | null
  txHash: string | null
  status: string
  failureReason: string | null
  /** ISO 8601. */
  createdAt: string
}

export interface PaymentActivityIn extends PaymentActivityCommon {
  direction: "in"
  endpointId: string | null
  endpoint: { id: string; urlPattern: string } | null
}

export interface PaymentActivityOut extends PaymentActivityCommon {
  direction: "out"
  mandateId: string | null
}

export type PaymentActivityRow = PaymentActivityIn | PaymentActivityOut

export interface PaymentActivityList {
  activity: PaymentActivityRow[]
  count: number
}

// --- Mandates: spend policy attached to a project's wallet ---

export interface MandateCreateParams {
  /** Max USDC any single call can spend, decimal e.g. "0.10". */
  maxPerCallUsdc: string
  /** Max cumulative USDC per UTC day, decimal e.g. "1.00". Must be ≥ `maxPerCallUsdc`. */
  dailyCapUsdc: string
  network?: "base"
  /** ISO 8601. Defaults to 7 days from now. */
  validUntil?: string
}

export interface Mandate {
  mandateId: string
  identityId: string
  network: string
  maxPerCallUsdc: string
  dailyCapUsdc: string
  validUntil: string
  sessionKeyAddress: string
  onchainInstalled: boolean
  installTxHash: string | null
  /** Set when on-chain session-key install failed. Mandate is unusable until reinstalled. */
  installError: string | null
  spentTodayUsdc: string
  remainingTodayUsdc: string
  totalSpentUsdc: string
  callCount: number
  revokedAt: string | null
  createdAt: string
}

export interface MandateList {
  mandates: Mandate[]
}
