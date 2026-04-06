import { HttpClient } from "./http"
import { PlatformIdentitiesResource } from "./resources/platform-identities"
import type { PlatformConfig } from "./types"

const DEFAULT_BASE_URL = "https://api.loomal.ai"

export class LoomalPlatform {
  readonly identities: PlatformIdentitiesResource

  constructor(config: PlatformConfig) {
    if (!config.apiKey) {
      throw new Error("Platform API key is required. Pass { apiKey: 'lopk-...' } or set LOOMAL_PLATFORM_KEY env var.")
    }

    const http = new HttpClient(config.baseUrl || DEFAULT_BASE_URL, config.apiKey)
    this.identities = new PlatformIdentitiesResource(http)
  }
}
