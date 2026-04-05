import { HttpClient } from "./http"
import { IdentityResource } from "./resources/identity"
import { MailResource } from "./resources/mail"
import { VaultResource } from "./resources/vault"
import { LogsResource } from "./resources/logs"
import { DidResource } from "./resources/did"
import { CalendarResource } from "./resources/calendar"
import type { LoomalConfig } from "./types"

const DEFAULT_BASE_URL = "https://api.loomal.ai"

export class Loomal {
  readonly identity: IdentityResource
  readonly mail: MailResource
  readonly vault: VaultResource
  readonly logs: LogsResource
  readonly did: DidResource
  readonly calendar: CalendarResource

  constructor(config: LoomalConfig) {
    if (!config.apiKey) {
      throw new Error("Loomal API key is required. Pass { apiKey: 'mgent-...' } or set LOOMAL_API_KEY env var.")
    }

    const http = new HttpClient(config.baseUrl || DEFAULT_BASE_URL, config.apiKey)

    this.identity = new IdentityResource(http)
    this.mail = new MailResource(http)
    this.vault = new VaultResource(http)
    this.logs = new LogsResource(http)
    this.did = new DidResource(http)
    this.calendar = new CalendarResource(http)
  }
}
