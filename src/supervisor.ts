import { HttpClient } from "./http"
import { SupervisorIdentitiesResource } from "./resources/supervisor-identities"
import type { SupervisorConfig } from "./types"

const DEFAULT_BASE_URL = "https://api.loomal.ai"

export class LoomalSupervisor {
  readonly identities: SupervisorIdentitiesResource

  constructor(config: SupervisorConfig) {
    if (!config.apiKey) {
      throw new Error("Supervisor API key is required. Pass { apiKey: 'mgsv-...' } or set LOOMAL_SUPERVISOR_KEY env var.")
    }

    const http = new HttpClient(config.baseUrl || DEFAULT_BASE_URL, config.apiKey)
    this.identities = new SupervisorIdentitiesResource(http)
  }
}
