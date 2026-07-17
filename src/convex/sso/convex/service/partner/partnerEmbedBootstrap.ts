import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { EMBED_AUTH_CHANNEL_CID } from "../embed/embedAuthConstants";
import type { PartnerCapabilities } from "./partnerCapabilities";

const DEV_BOOTSTRAP_SECRET = "dev-local-partner-embed-bootstrap";

/** Upsert partner row with embed auth config (dev handoff or prod partner bootstrap). */
export const bootstrapDevPartnerEmbed = mutation({
  args: {
    bootstrapSecret: v.string(),
    pid: v.optional(v.number()),
    name: v.optional(v.string()),
    host: v.optional(v.string()),
    jwtSecret: v.optional(v.string()),
    allowedOrigins: v.optional(v.array(v.string())),
    /** Default jwt_local; CrazyGames prod uses crazygames_jwt. */
    embedMethod: v.optional(
      v.union(v.literal("jwt_local"), v.literal("crazygames_jwt"))
    ),
    /** When true (default), enable portalGames capability for this partner. */
    portalGames: v.optional(v.boolean()),
    campaignOps: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const secret =
      process.env.PARTNER_EMBED_BOOTSTRAP_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;
    if (args.bootstrapSecret !== secret) {
      throw new Error("forbidden");
    }

    const pid = args.pid ?? 0;
    const jwtSecret = args.jwtSecret?.trim() || `partner-dev-secret-${pid}`;
    const embedMethod = args.embedMethod ?? "jwt_local";
    const capabilities: PartnerCapabilities = {
      portalGames: args.portalGames !== false,
      campaignOps: args.campaignOps === true,
    };

    const partnerData = {
      jwtSecret,
      embed: { method: embedMethod },
      ...(args.allowedOrigins?.length ? { allowedOrigins: args.allowedOrigins } : {}),
    };

    const existing = await ctx.db
      .query("partner")
      .withIndex("by_pid", (q) => q.eq("pid", pid))
      .unique();

    const authChannelIds = [EMBED_AUTH_CHANNEL_CID];
    const staffAuthChannelIds = [0];
    const name = args.name ?? "Dev Partner Embed";
    const host = args.host ?? "http://localhost:3000";

    if (existing) {
      const prior =
        existing.data && typeof existing.data === "object"
          ? (existing.data as Record<string, unknown>)
          : {};
      const { enabledContexts: _drop, ...priorRest } = prior;
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name ?? name,
        host: args.host ?? existing.host ?? host,
        auth_channels: authChannelIds,
        staff_auth_channels: staffAuthChannelIds,
        capabilities,
        data: { ...priorRest, ...partnerData },
      });
      return {
        ok: true as const,
        pid,
        created: false as const,
        jwtSecret,
        embedMethod,
      };
    }

    await ctx.db.insert("partner", {
      pid,
      name,
      host,
      auth_channels: authChannelIds,
      staff_auth_channels: staffAuthChannelIds,
      capabilities,
      data: partnerData,
    });

    return {
      ok: true as const,
      pid,
      created: true as const,
      jwtSecret,
      embedMethod,
    };
  },
});
