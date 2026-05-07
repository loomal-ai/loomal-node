/**
 * MCP tool wrapper for the Loomal paywall.
 *
 *   import { requireToolPayment } from "@loomal/sdk/paywall/mcp"
 *
 *   server.tool(
 *     "search",
 *     { description: "Paid search" },
 *     requireToolPayment({ amount: "0.01" }, async (args) => ({
 *       results: [...]
 *     })),
 *   )
 *
 * MCP is a JSON-RPC protocol so we can't directly speak HTTP 402. This
 * wrapper inspects the call's `_meta` for a payment header, runs the same
 * Loomal challenge/redeem flow, and either throws an MCP error containing
 * the challenge body (which the agent's MCP client retries with a signed
 * payment) or invokes the wrapped handler on success.
 */

import {
  buildChallenge,
  verifyAndSettle,
  type PaywallConfig,
  type PaywallRouteOptions,
} from "./core.js"

export interface McpPaywallOptions
  extends PaywallConfig,
    PaywallRouteOptions {}

// Minimal MCP shape so we don't take a hard dep on `@modelcontextprotocol/sdk`.
interface McpToolExtra {
  _meta?: Record<string, unknown> & {
    "x-payment"?: string
    paymentHeader?: string
  }
  signal?: AbortSignal
}

export type ToolHandler<TArgs, TResult> = (
  args: TArgs,
  extra: McpToolExtra,
) => Promise<TResult> | TResult

export class PaymentRequiredError extends Error {
  readonly code = "loomal/payment-required"
  readonly challenge: unknown
  constructor(challenge: unknown) {
    super("Payment required")
    this.challenge = challenge
  }
}

export function requireToolPayment<TArgs, TResult>(
  options: McpPaywallOptions,
  handler: ToolHandler<TArgs, TResult>,
): ToolHandler<TArgs, TResult> {
  const { amount, description, resource: resourceOverride, ...config } = options
  const routeOptions: PaywallRouteOptions = {
    amount,
    description,
    resource: resourceOverride,
  }

  return async (args, extra) => {
    const resource = routeOptions.resource ?? "tool"
    const meta = extra._meta ?? {}
    const xPayment =
      typeof meta["x-payment"] === "string"
        ? (meta["x-payment"] as string)
        : typeof meta.paymentHeader === "string"
          ? (meta.paymentHeader as string)
          : undefined

    if (!xPayment) {
      const challenge = await buildChallenge(config, resource, routeOptions)
      throw new PaymentRequiredError(challenge)
    }

    const redeem = await verifyAndSettle(config, resource, xPayment, routeOptions)
    if (!redeem.ok) {
      throw new PaymentRequiredError(redeem.requirement)
    }

    return handler(args, extra)
  }
}

export type { PaywallConfig, PaywallRouteOptions } from "./core.js"
