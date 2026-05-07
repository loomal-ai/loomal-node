/**
 * Hono middleware for the Loomal paywall.
 *
 *   import { requirePayment } from "@loomal/sdk/paywall/hono"
 *
 *   app.get("/api/search",
 *     requirePayment({ amount: "0.01" }),
 *     (c) => c.json({ results: [...] })
 *   )
 *
 * Hono runs on Bun, Deno, Cloudflare Workers, and Node — the middleware
 * works on every runtime since it only uses `fetch` and standard headers.
 */

import {
  buildChallenge,
  verifyAndSettle,
  type PaywallConfig,
  type PaywallRouteOptions,
} from "./core.js"

export interface HonoPaywallOptions
  extends PaywallConfig,
    PaywallRouteOptions {}

// Minimal Hono shape so we don't need a peer-dep on `hono`.
interface HonoLikeContext {
  req: { url?: string; header: (name: string) => string | undefined }
  json(body: unknown, status?: number): Response
  header(name: string, value: string): void
}

export function requirePayment(options: HonoPaywallOptions) {
  const { amount, description, resource: resourceOverride, ...config } = options
  const routeOptions: PaywallRouteOptions = {
    amount,
    description,
    resource: resourceOverride,
  }

  return async (c: HonoLikeContext, next: () => Promise<void>) => {
    const resource = routeOptions.resource ?? c.req.url ?? "unknown"
    const xPayment = c.req.header("x-payment")

    try {
      if (!xPayment) {
        const challenge = await buildChallenge(config, resource, routeOptions)
        return c.json(challenge, 402)
      }

      const redeem = await verifyAndSettle(config, resource, xPayment, routeOptions)
      if (!redeem.ok) {
        return c.json(redeem.requirement, 402)
      }

      c.header("X-Payment-Response", redeem.paymentResponse)
      await next()
      return undefined
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return c.json({ error: "loomal_paywall_error", message }, 502)
    }
  }
}

export type { PaywallConfig, PaywallRouteOptions } from "./core.js"
