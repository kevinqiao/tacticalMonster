import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { sha256Hex } from "./crypto";

export type McpAuthContext = {
  keyId: string;
  tenantId: string;
  scopes: string[];
  name: string;
};

/** Shared helper usable from query/mutation handlers (no ctx.runQuery). */
export async function authenticateApiKey(
  ctx: { db: any },
  apiKey: string,
): Promise<McpAuthContext | null> {
  if (!apiKey || !apiKey.startsWith("mcp_sk_")) {
    return null;
  }
  const keyHash = await sha256Hex(apiKey);
  const record = await ctx.db
    .query("mcp_api_keys")
    .withIndex("by_keyHash", (q: any) => q.eq("keyHash", keyHash))
    .unique();

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt < Date.now()) return null;

  return {
    keyId: record._id,
    tenantId: record.tenantId,
    scopes: record.scopes,
    name: record.name,
  };
}

export const validateApiKey = internalQuery({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }): Promise<McpAuthContext | null> => {
    return await authenticateApiKey(ctx, apiKey);
  },
});

export const touchLastUsed = internalMutation({
  args: { keyId: v.id("mcp_api_keys") },
  handler: async (ctx, { keyId }) => {
    await ctx.db.patch(keyId, { lastUsedAt: Date.now() });
  },
});

export function requireScope(scopes: string[], required: string): void {
  if (!scopes.includes(required) && !scopes.includes("admin")) {
    throw new Error(`API key missing required scope: ${required}`);
  }
}

export async function requireAuth(
  ctx: { db: any },
  apiKey: string,
  scope: string,
): Promise<McpAuthContext> {
  const auth = await authenticateApiKey(ctx, apiKey);
  if (!auth) {
    throw new Error("Unauthorized");
  }
  requireScope(auth.scopes, scope);
  return auth;
}
