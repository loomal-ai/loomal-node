/**
 * Express middleware for the Loomal paywall.
 *
 *   import { requirePayment } from "@loomal/sdk/paywall/express"
 *
 *   app.get("/api/search",
 *     requirePayment({ amount: "0.01" }),
 *     (req, res) => res.json({ results: [...] })
 *   )
 */

import type { Request, Response, NextFunction } from "express"
import {
  buildChallenge,
  verifyAndSettle,
  type PaywallConfig,
  type PaywallRouteOptions,
} from "./core.js"

export interface ExpressPaywallOptions
  extends PaywallConfig,
    PaywallRouteOptions {}

export function requirePayment(options: ExpressPaywallOptions) {
  const { amount, description, resource: resourceOverride, ...config } = options
  const routeOptions: PaywallRouteOptions = {
    amount,
    description,
    resource: resourceOverride,
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const resource =
      routeOptions.resource ??
      `${req.protocol}://${req.get("host") ?? "localhost"}${req.originalUrl ?? req.url}`
    const xPayment = req.get("x-payment")

    try {
      if (!xPayment) {
        const challenge = await buildChallenge(config, resource, routeOptions)
        res.status(402).json(challenge)
        return
      }

      const redeem = await verifyAndSettle(config, resource, xPayment, routeOptions)
      if (!redeem.ok) {
        res.status(402).json(redeem.requirement)
        return
      }

      res.setHeader("X-Payment-Response", redeem.paymentResponse)
      next()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res
        .status(502)
        .json({ error: "loomal_paywall_error", message })
    }
  }
}

export type { PaywallConfig, PaywallRouteOptions } from "./core.js"
