import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * MCP remote access: API keys for multi-tenant / multi-agent platforms.
 * Raw keys are never stored — only SHA-256 hashes.
 */
export const mcpSchema = {
  mcp_api_keys: defineTable({
    keyHash: v.string(),
    keyPrefix: v.string(),
    name: v.string(),
    scopes: v.array(v.string()), // "read" | "write" | "admin"
    tenantId: v.string(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_keyHash", ["keyHash"])
    .index("by_tenant", ["tenantId"])
    .index("by_prefix", ["keyPrefix"]),
};
