#!/usr/bin/env node
/**
 * Bootstrap / create an MCP API key against the tournament Convex deployment.
 *
 * Usage:
 *   CONVEX_URL=https://….convex.cloud \
 *   MCP_ADMIN_SECRET=your-admin-secret \
 *   node scripts/create-api-key.mjs --name "agent-platform" --tenant default --scopes read,write
 *
 * Or with an existing admin key:
 *   MCP_API_KEY=mcp_sk_… node scripts/create-api-key.mjs --name "readonly" --scopes read
 */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  console.error("CONVEX_URL is required");
  process.exit(1);
}

const name = arg("name", "default");
const tenantId = arg("tenant", "default");
const scopes = arg("scopes", "read,write").split(",").map((s) => s.trim());

const client = new ConvexHttpClient(convexUrl);
const result = await client.action(anyApi.mcp.keys.createApiKey, {
  adminSecret: process.env.MCP_ADMIN_SECRET,
  apiKey: process.env.MCP_API_KEY,
  name,
  tenantId,
  scopes,
  createdBy: process.env.USER ?? "cli",
});

console.log(JSON.stringify(result, null, 2));
console.log("\nStore apiKey securely. Add it to mcp-server MCP_API_KEYS.");
