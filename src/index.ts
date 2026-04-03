export { Mailgent } from "./client"
export { MailgentSupervisor } from "./supervisor"
export { MailgentApiError } from "./errors"
export type {
  MailgentConfig,
  SupervisorConfig,
  MessageResponse,
  ThreadResponse,
  ThreadDetailResponse,
  VaultCredentialType,
  CredentialMetadata,
  CredentialWithData,
  IdentityResponse,
  IdentitySummary,
  IdentityDetail,
  CreateIdentityParams,
  CreateIdentityResponse,
  RotateKeyResponse,
  PaginatedIdentities,
  ActivityLog,
  LogsStatsResponse,
  TotpResponse,
  PaginatedMessages,
  PaginatedThreads,
  PaginatedLogs,
  VaultList,
} from "./types"
export type { DidDocument } from "./resources/did"
