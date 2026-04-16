import type { HttpClient } from "../http"
import type {
  ApiKeyClientPairData,
  ApiKeySecretData,
  CardData,
  CardMetadata,
  CredentialMetadata,
  CredentialWithData,
  ShippingAddressData,
  TotpResponse,
  VaultCredentialType,
  VaultList,
} from "../types"

export class VaultResource {
  constructor(private http: HttpClient) {}

  list(): Promise<VaultList> {
    return this.http.get<VaultList>("/v0/vault")
  }

  get(name: string): Promise<CredentialWithData> {
    return this.http.get<CredentialWithData>(`/v0/vault/${encodeURIComponent(name)}`)
  }

  store(name: string, params: {
    type: VaultCredentialType
    data: Record<string, unknown>
    metadata?: Record<string, unknown>
    expiresAt?: string
  }): Promise<CredentialMetadata> {
    return this.http.put<CredentialMetadata>(`/v0/vault/${encodeURIComponent(name)}`, params)
  }

  /**
   * Store an API_KEY credential. Pass a string for single-secret keys
   * (e.g. `sk_live_...`), or `{ clientId, secret }` for OAuth-style client
   * credentials.
   */
  storeApiKey(
    name: string,
    secretOrPair: string | ApiKeyClientPairData,
    options?: { metadata?: Record<string, unknown>; expiresAt?: string },
  ): Promise<CredentialMetadata> {
    const data: ApiKeySecretData | ApiKeyClientPairData =
      typeof secretOrPair === "string"
        ? { key: secretOrPair }
        : { clientId: secretOrPair.clientId, secret: secretOrPair.secret }
    const metadata: Record<string, unknown> = { ...(options?.metadata ?? {}) }
    if (typeof secretOrPair !== "string") {
      metadata.clientId = secretOrPair.clientId
    }
    return this.store(name, {
      type: "API_KEY",
      data: data as unknown as Record<string, unknown>,
      metadata,
      expiresAt: options?.expiresAt,
    })
  }

  /**
   * Store a CARD credential. Card data is AES-256-GCM encrypted at rest;
   * this is a password-manager-style vault entry, not a payment processor.
   */
  storeCard(
    name: string,
    card: CardData,
    options?: { metadata?: CardMetadata & Record<string, unknown>; expiresAt?: string },
  ): Promise<CredentialMetadata> {
    const last4 = card.number.replace(/\s+/g, "").slice(-4)
    const metadata: CardMetadata & Record<string, unknown> = {
      last4,
      ...(options?.metadata ?? {}),
    }
    return this.store(name, {
      type: "CARD",
      data: card as unknown as Record<string, unknown>,
      metadata,
      expiresAt: options?.expiresAt,
    })
  }

  /**
   * Store a SHIPPING_ADDRESS credential. All fields are encrypted at rest.
   */
  storeShippingAddress(
    name: string,
    address: ShippingAddressData,
    options?: { metadata?: Record<string, unknown>; expiresAt?: string },
  ): Promise<CredentialMetadata> {
    return this.store(name, {
      type: "SHIPPING_ADDRESS",
      data: address as unknown as Record<string, unknown>,
      metadata: options?.metadata,
      expiresAt: options?.expiresAt,
    })
  }

  delete(name: string): Promise<void> {
    return this.http.delete(`/v0/vault/${encodeURIComponent(name)}`)
  }

  totp(name: string): Promise<TotpResponse> {
    return this.http.get<TotpResponse>(`/v0/vault/${encodeURIComponent(name)}/totp`)
  }
}
