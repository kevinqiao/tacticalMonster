import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, query } from "../_generated/server";
import { requireAuth, requireScope } from "./auth";
import { generateRawApiKey, getKeyPrefix, sha256Hex } from "./crypto";

/**
 * Create an MCP API key.
 * Bootstrap: pass MCP_ADMIN_SECRET as adminSecret when bootstrapping the first key,
 * or use an existing key with "admin" scope.
 */
export const createApiKey = action({
  args: {
    adminSecret: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    name: v.string(),
    tenantId: v.string(),
    scopes: v.array(v.string()),
    expiresAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminSecret = process.env.MCP_ADMIN_SECRET;
    const usingBootstrap =
      !!args.adminSecret && !!adminSecret && args.adminSecret === adminSecret;

    if (!usingBootstrap) {
      if (!args.apiKey) {
        throw new Error("Provide apiKey (admin scope) or adminSecret for bootstrap");
      }
      const auth = await ctx.runQuery(internal.mcp.auth.validateApiKey, {
        apiKey: args.apiKey,
      });
      if (!auth) throw new Error("Unauthorized");
      requireScope(auth.scopes, "admin");
    }

    const rawKey = generateRawApiKey();
    const keyHash = await sha256Hex(rawKey);
    const keyPrefix = getKeyPrefix(rawKey);

    const keyId = await ctx.runMutation(internal.mcp.keys.insertApiKey, {
      keyHash,
      keyPrefix,
      name: args.name,
      scopes: args.scopes,
      tenantId: args.tenantId,
      createdBy: args.createdBy,
      expiresAt: args.expiresAt,
    });

    // Raw key returned exactly once — store it securely on the client side.
    return {
      keyId,
      apiKey: rawKey,
      keyPrefix,
      name: args.name,
      scopes: args.scopes,
      tenantId: args.tenantId,
    };
  },
});

export const insertApiKey = internalMutation({
  args: {
    keyHash: v.string(),
    keyPrefix: v.string(),
    name: v.string(),
    scopes: v.array(v.string()),
    tenantId: v.string(),
    createdBy: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!/^[a-f0-9]{64}$/.test(args.keyHash)) {
      throw new Error("Invalid key hash");
    }
    return await ctx.db.insert("mcp_api_keys", {
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      name: args.name,
      scopes: args.scopes,
      tenantId: args.tenantId,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

export const revokeApiKey = action({
  args: {
    apiKey: v.string(),
    keyId: v.id("mcp_api_keys"),
  },
  handler: async (ctx, { apiKey, keyId }) => {
    const auth = await ctx.runQuery(internal.mcp.auth.validateApiKey, { apiKey });
    if (!auth) throw new Error("Unauthorized");
    requireScope(auth.scopes, "admin");
    await ctx.runMutation(internal.mcp.keys.markRevoked, { keyId });
    return { ok: true };
  },
});

export const markRevoked = internalMutation({
  args: { keyId: v.id("mcp_api_keys") },
  handler: async (ctx, { keyId }) => {
    await ctx.db.patch(keyId, { revokedAt: Date.now() });
  },
});

export const listApiKeys = query({
  args: {
    apiKey: v.string(),
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, { apiKey, tenantId }) => {
    const auth = await requireAuth(ctx, apiKey, "admin");
    const tid = tenantId ?? auth.tenantId;
    const keys = await ctx.db
      .query("mcp_api_keys")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tid))
      .collect();

    return keys.map((k) => ({
      keyId: k._id,
      keyPrefix: k.keyPrefix,
      name: k.name,
      scopes: k.scopes,
      tenantId: k.tenantId,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      revokedAt: k.revokedAt,
      lastUsedAt: k.lastUsedAt,
    }));
  },
});
