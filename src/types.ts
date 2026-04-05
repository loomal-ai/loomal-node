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
  | "DATABASE" | "SMTP" | "AWS" | "CERTIFICATE" | "CUSTOM"

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

export interface IdentityResponse {
  identityId: string
  name: string
  email: string
  displayName: string
  type: string
  scopes: string[]
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
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
}

export interface CreateIdentityResponse {
  identityId: string
  name: string
  type: string
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

export interface SupervisorConfig {
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
