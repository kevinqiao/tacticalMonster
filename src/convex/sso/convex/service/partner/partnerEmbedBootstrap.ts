import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import type { PartnerCapabilities } from "./partnerCapabilities";
import { requirePartnerSlug } from "./partnerCapabilities";
import { readPartnerGames } from "./portalPartnerConfig";
import {
  DEFAULT_AD_REPLAY_DAILY_CAP,
  DEFAULT_MAX_REPLAYS_PER_MATCH,
  DEFAULT_TICKET_REPLAY_PRICE,
  sanitizeAdReplayDailyCapInput,
} from "./partnerAdReplayConfig";
import {
  playerAuthValidator,
  sanitizePlayerAuth,
  type PlayerAuth,
} from "../auth/partnerAuth";
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
      v.union(
        v.literal("jwt_local"),
        v.literal("crazygames_jwt"),
        v.literal("code_exchange"),
        v.literal("session_introspect")
      )
    ),
    /**
     * Player login mode (SSO playerAuth). Default embed.
     * Prefer full `playerAuth` when provided.
     */
    playerAuthMode: v.optional(
      v.union(
        v.literal("clerk"),
        v.literal("embed"),
        v.literal("embed_then_clerk")
      )
    ),
    /** Full playerAuth object; wins over playerAuthMode + embedMethod. */
    playerAuth: v.optional(playerAuthValidator),
    /** When true (default), enable portalGames capability for this partner. */
    portalGames: v.optional(v.boolean()),
    campaignOps: v.optional(v.boolean()),
    /** URL segment for /gc/{partnerSlug}/... (e.g. crazygames). */
    partnerSlug: v.optional(v.string()),
    /** @deprecated Ignored — games come from static catalog (full open). */
    games: v.optional(v.array(v.string())),
    /** Optional Portal ad-replay daily cap override (0..100). Written to Portal SoT. */
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

    const partnerSlug =
      args.partnerSlug != null && args.partnerSlug.trim() !== ""
        ? requirePartnerSlug(args.partnerSlug)
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

    const playerAuthInput: PlayerAuth =
      args.playerAuth ??
      (args.playerAuthMode === "clerk"
        ? { mode: "clerk" }
        : {
            mode: args.playerAuthMode ?? "embed",
            embed: { method: embedMethod },
          });
    const playerAuth = sanitizePlayerAuth(playerAuthInput, partnerDataBase);
    const staffAuth = { mode: "web" as const };
    const name = args.name ?? "Dev Partner Embed";
    const host = args.host ?? "http://localhost:3000";

    const portalFields = {
      ...(partnerSlug !== undefined ? { slug: partnerSlug } : {}),
    };

    // Replay SoT is Portal — seed via GC ops bridge when bootstrap provides a cap.
    const portalCap =
      capInput === undefined
        ? DEFAULT_AD_REPLAY_DAILY_CAP
        : (capInput ?? DEFAULT_AD_REPLAY_DAILY_CAP);
    const seedPortalReplay = async () => {
      if (args.adReplayDailyCap === undefined) return;
      await ctx.scheduler.runAfter(
        0,
        internal.service.bridge.portalGcOpsBridge.upsertPartnerGcOpsToPortal,
        {
          partnerId: pid,
          adReplayDailyCap: portalCap,
          maxReplaysPerMatch: DEFAULT_MAX_REPLAYS_PER_MATCH,
          adReplayEnabled: true,
          ticketReplayEnabled: true,
          ticketReplayPriceTickets: DEFAULT_TICKET_REPLAY_PRICE,
        }
      );
    };

    if (existing) {
      const prior =
        existing.data && typeof existing.data === "object"
          ? (existing.data as Record<string, unknown>)
          : {};
      const { enabledContexts: _drop, ...priorRest } = prior;
      const merged = { ...priorRest, ...partnerDataBase };
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name ?? name,
        host: args.host ?? existing.host ?? host,
        playerAuth,
        staffAuth,
        capabilities,
        data: merged,
        ...portalFields,
      });
      await seedPortalReplay();
      return {
        ok: true as const,
        pid,
        created: false as const,
        jwtSecret,
        embedMethod,
        playerAuth,
        partnerSlug: partnerSlug ?? existing.slug,
        games: readPartnerGames(),
        adReplayDailyCap: portalCap,
      };
    }

    await ctx.db.insert("partner", {
      pid,
      name,
      host,
      playerAuth,
      staffAuth,
      capabilities,
      data: { ...partnerDataBase },
      ...portalFields,
    });

    await seedPortalReplay();

    return {
      ok: true as const,
      pid,
      created: true as const,
      jwtSecret,
      embedMethod,
      playerAuth,
      partnerSlug,
      games: readPartnerGames(),
      adReplayDailyCap: portalCap,
    };
  },
});

/** Ops CLI: read partner row without upsert. */
export const peekPartnerOps = mutation({
  args: {
    bootstrapSecret: v.string(),
    pid: v.optional(v.number()),
    partnerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const secret =
      process.env.PARTNER_EMBED_BOOTSTRAP_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;
    if (args.bootstrapSecret !== secret) {
      throw new Error("forbidden");
    }
    let partner = null;
    if (typeof args.pid === "number" && Number.isFinite(args.pid)) {
      partner = await ctx.db
        .query("partner")
        .withIndex("by_pid", (q) => q.eq("pid", Math.floor(args.pid!)))
        .unique();
    }
    if (!partner && args.partnerSlug) {
      const slug = args.partnerSlug.trim().toLowerCase();
      partner = await ctx.db
        .query("partner")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
    }
    if (!partner) {
      return { ok: false as const, error: "not_found" as const };
    }
    const data =
      partner.data && typeof partner.data === "object"
        ? (partner.data as Record<string, unknown>)
        : {};
    const caps =
      partner.capabilities && typeof partner.capabilities === "object"
        ? (partner.capabilities as { portalGames?: boolean; campaignOps?: boolean })
        : {};
    return {
      ok: true as const,
      pid: partner.pid,
      name: partner.name ?? null,
      host: partner.host ?? null,
      slug: partner.slug ?? null,
      portalGames: caps.portalGames !== false,
      campaignOps: caps.campaignOps === true,
      playerAuth: partner.playerAuth ?? data.playerAuth ?? null,
      embedMethod:
        (data.embed as { method?: string } | undefined)?.method ?? null,
    };
  },
});
