import { v } from "convex/values";



import type { MutationCtx } from "../../_generated/server";

import { mutation } from "../../_generated/server";

import { EMBED_AUTH_CHANNEL_CID } from "../embed/embedAuthConstants";



const DEV_BOOTSTRAP_SECRET = "dev-local-partner-embed-bootstrap";



/** Dev-only: upsert partner row with embed JWT config for WebView handoff tests. */

export const bootstrapDevPartnerEmbed = mutation({

  args: {

    bootstrapSecret: v.string(),

    pid: v.optional(v.number()),

    name: v.optional(v.string()),

    host: v.optional(v.string()),

    jwtSecret: v.optional(v.string()),

    allowedOrigins: v.optional(v.array(v.string())),

  },

  handler: async (ctx, args) => {

    const secret =

      process.env.PARTNER_EMBED_BOOTSTRAP_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;

    if (args.bootstrapSecret !== secret) {

      throw new Error("forbidden");

    }



    const pid = args.pid ?? 0;

    const jwtSecret = args.jwtSecret?.trim() || `partner-dev-secret-${pid}`;



    const partnerData = {

      jwtSecret,

      embed: { method: "jwt_local" as const },

      enabledContexts: ["casual", "portal", "campaign"],

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

      await ctx.db.patch(existing._id, {

        name: args.name ?? existing.name ?? name,

        host: args.host ?? existing.host ?? host,

        auth_channels: authChannelIds,
        staff_auth_channels: staffAuthChannelIds,

        data: { ...prior, ...partnerData },

      });

      return {

        ok: true as const,

        pid,

        created: false as const,

        jwtSecret,

      };

    }



    await ctx.db.insert("partner", {

      pid,

      name,

      host,

      auth_channels: authChannelIds,

      staff_auth_channels: staffAuthChannelIds,

      data: partnerData,

    });



    return {

      ok: true as const,

      pid,

      created: true as const,

      jwtSecret,

    };

  },

});

