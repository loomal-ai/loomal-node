import { defineConfig } from "tsup"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/paywall/express.ts",
    "src/paywall/hono.ts",
    "src/paywall/mcp.ts",
    "src/webhook.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
})
