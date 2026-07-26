import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import type { PartnerCapabilities } from "./partnerCapabilities";
import { requirePartnerSlug } from "./partnerCapabilities";
import {
  PARTNER_GAME_TYPES,
  sanitizePartnerGames,
} from "./portalPartnerConfig";
import {
  applyAdReplayDailyCapToPartnerData,
  effectivePartnerReplaySettings,
  sanitizeAdReplayDailyCapInput,
} from "./partnerAdReplayConfig";
import { internal } from "../../_generated/api";

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
    /** URL segment for /gc/{partnerSlug}/{game} (e.g. crazygames). */
    partnerSlug: v.optional(v.string()),
    /** @deprecated Prefer partnerSlug */
    portalKey: v.optional(v.string()),
    /** Enabled game types; default = full partner registry when partnerSlug is set. */
    games: v.optional(v.array(v.string())),
    /** Optional Portal ad-replay daily cap override (0..100). */
    adReplayDailyCap: v.optional(v.number()),
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

    const rawSlug = args.partnerSlug ?? args.portalKey;
    const partnerSlug =
      rawSlug != null && rawSlug.trim() !== ""
        ? requirePartnerSlug(rawSlug)
        : undefined;
    const games =
      args.games != null
        ? sanitizePartnerGames(args.games)
        : partnerSlug
          ? [...PARTNER_GAME_TYPES]
          : undefined;

    if (partnerSlug) {
      const conflict = await ctx.db
        .query("partner")
        .withIndex("by_slug", (q) => q.eq("slug", partnerSlug))
        .unique();
      if (conflict && conflict.pid !== pid) {
        throw new Error("slug_taken");
      }
    }

    const capInput =
      args.adReplayDailyCap !== undefined
        ? sanitizeAdReplayDailyCapInput(args.adReplayDailyCap)
        : undefined;

    const partnerDataBase = {
      jwtSecret,
      embed: { method: embedMethod },
      ...(args.allowedOrigins?.length ? { allowedOrigins: args.allowedOrigins } : {}),
    };

    const existing = await ctx.db
      .query("partner")
      .withIndex("by_pid", (q) => q.eq("pid", pid))
      .unique();

    const playerAuth = {
      mode: "embed" as const,
      embed: { method: embedMethod },
    };
    const staffAuth = { mode: "web" as const };
    const name = args.name ?? "Dev Partner Embed";
    const host = args.host ?? "http://localhost:3000";

    const portalFields = {
      ...(partnerSlug !== undefined ? { slug: partnerSlug } : {}),
      ...(games !== undefined ? { games } : {}),
    };

    if (existing) {
      const prior =
        existing.data && typeof existing.data === "object"
          ? (existing.data as Record<string, unknown>)
          : {};
      const { enabledContexts: _drop, ...priorRest } = prior;
      const merged = applyAdReplayDailyCapToPartnerData(
        { ...priorRest, ...partnerDataBase },
        capInput
      );
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name ?? name,
        host: args.host ?? existing.host ?? host,
        playerAuth,
        staffAuth,
        capabilities,
        data: merged,
        ...portalFields,
      });
      const effectiveReplay = effectivePartnerReplaySettings(merged);
      await ctx.scheduler.runAfter(
        0,
        internal.service.bridge.portalAdReplayCapPush.pushPartnerAdReplayCapToPortal,
        {
          partnerId: pid,
          adReplayDailyCap: effectiveReplay.adReplayDailyCap,
          maxReplaysPerMatch: effectiveReplay.maxReplaysPerMatch,
          adReplayEnabled: effectiveReplay.adReplayEnabled,
          ticketReplayEnabled: effectiveReplay.ticketReplayEnabled,
          ticketReplayPriceTickets: effectiveReplay.ticketReplayPriceTickets,
        }
      );
      return {
        ok: true as const,
        pid,
        created: false as const,
        jwtSecret,
        embedMethod,
        partnerSlug: partnerSlug ?? existing.slug,
        games: games ?? existing.games,
        adReplayDailyCap: effectiveReplay.adReplayDailyCap,
      };
    }

    const insertData = applyAdReplayDailyCapToPartnerData(
      { ...partnerDataBase },
      capInput
    );
    await ctx.db.insert("partner", {
      pid,
      name,
      host,
      playerAuth,
      staffAuth,
      capabilities,
      data: insertData,
      ...portalFields,
    });

    const effectiveReplay = effectivePartnerReplaySettings(insertData);
    await ctx.scheduler.runAfter(
      0,
      internal.service.bridge.portalAdReplayCapPush.pushPartnerAdReplayCapToPortal,
      {
        partnerId: pid,
        adReplayDailyCap: effectiveReplay.adReplayDailyCap,
        maxReplaysPerMatch: effectiveReplay.maxReplaysPerMatch,
        adReplayEnabled: effectiveReplay.adReplayEnabled,
        ticketReplayEnabled: effectiveReplay.ticketReplayEnabled,
        ticketReplayPriceTickets: effectiveReplay.ticketReplayPriceTickets,
      }
    );

    return {
      ok: true as const,
      pid,
      created: true as const,
      jwtSecret,
      embedMethod,
      partnerSlug,
      games,
      adReplayDailyCap: effectiveReplay.adReplayDailyCap,
    };
  },
});
