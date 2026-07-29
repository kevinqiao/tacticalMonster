import { v } from "convex/values";

import { sessionPartnerIdFromUid } from "../../../../shared/platformAuth/parsePlatformUid";
import { PORTAL_AD_REPLAY_DAILY_CAP } from "../../data/portalAdReplayConfig";
import {
  defaultPortalReplaySettings,
  pickReplaySettingsPartial,
  sanitizeMaxReplaysPerMatch,
  sanitizeTicketReplayPrice,
  sparseMergeReplaySettings,
  type PortalReplaySettings,
  type PortalReplaySettingsPartial,
  PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT,
  PORTAL_TICKET_REPLAY_PRICE_DEFAULT,
} from "../../data/portalPartnerReplaySettings";
import { internal } from "../../_generated/api";
import { internalMutation, internalQuery } from "../../_generated/server";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { findPlayerGameByGameId } from "../tournament/shared/casualPlayerGameTypes";

const AD_REPLAY_DAILY_CAP_OVERRIDE_MAX = 100;

function sanitizeCachedCap(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return PORTAL_AD_REPLAY_DAILY_CAP;
  }
  const n = Math.floor(value);
  // Unlimited sentinel (default) or explicit 0–100 override.
  if (n >= PORTAL_AD_REPLAY_DAILY_CAP) return PORTAL_AD_REPLAY_DAILY_CAP;
  if (n < 0 || n > AD_REPLAY_DAILY_CAP_OVERRIDE_MAX) {
    return PORTAL_AD_REPLAY_DAILY_CAP;
  }
  return n;
}

export function partnerIdFromUid(uid: string): number {
  return sessionPartnerIdFromUid(uid) ?? 0;
}

async function findPartnerReplaySettings(
  ctx: QueryCtx | MutationCtx,
  partnerId: number
) {
  return await ctx.db
    .query("portal_partner_replay_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .first();
}

function rowToPartial(
  row: Doc<"portal_partner_replay_settings"> | null
): PortalReplaySettingsPartial | undefined {
  if (!row) return undefined;
  return pickReplaySettingsPartial({
    maxReplaysPerMatch: row.maxReplaysPerMatch,
    adReplayEnabled: row.adReplayEnabled,
    adReplayDailyCap: row.adReplayDailyCap,
    ticketReplayEnabled: row.ticketReplayEnabled,
    ticketReplayPriceTickets: row.ticketReplayPriceTickets,
    coinReplayEnabled: row.coinReplayEnabled,
    coinReplayPriceCoins: row.coinReplayPriceCoins,
    coinReplayDailyCap: row.coinReplayDailyCap,
  });
}

function normalizePartnerRow(
  row: Doc<"portal_partner_replay_settings"> | null
): PortalReplaySettings {
  const base = defaultPortalReplaySettings(PORTAL_AD_REPLAY_DAILY_CAP);
  if (!row) return base;
  return sparseMergeReplaySettings(base, {
    maxReplaysPerMatch: row.maxReplaysPerMatch,
    adReplayEnabled: row.adReplayEnabled,
    adReplayDailyCap: sanitizeCachedCap(row.adReplayDailyCap),
    ticketReplayEnabled: row.ticketReplayEnabled,
    ticketReplayPriceTickets: row.ticketReplayPriceTickets,
    coinReplayEnabled: row.coinReplayEnabled,
    coinReplayPriceCoins: row.coinReplayPriceCoins,
    coinReplayDailyCap: row.coinReplayDailyCap,
  });
}

/**
 * Partner baseline + optional campaign stamp on the run.
 * SoT is `portal_partner_replay_settings` (platform admin → Portal).
 * Do not pull from SSO — that would overwrite Portal with stale partner.gameCenter.
 */
export async function resolveReplayConfig(
  ctx: QueryCtx | MutationCtx,
  args: {
    uid: string;
    campaignReplaySettings?: PortalReplaySettingsPartial | null;
  }
): Promise<PortalReplaySettings> {
  const partnerId = partnerIdFromUid(args.uid);
  const cached = await findPartnerReplaySettings(ctx, partnerId);
  const partner = normalizePartnerRow(cached);
  return sparseMergeReplaySettings(partner, args.campaignReplaySettings ?? undefined);
}

/** @deprecated Prefer resolveReplayConfig; kept for call sites that only need daily cap. */
export async function resolveAdReplayDailyCap(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<number> {
  const cfg = await resolveReplayConfig(ctx, { uid });
  return cfg.adReplayEnabled ? cfg.adReplayDailyCap : 0;
}

export async function loadCampaignReplaySettingsForMatchGame(
  ctx: QueryCtx | MutationCtx,
  matchGameId: string
): Promise<PortalReplaySettingsPartial | undefined> {
  const pg = await findPlayerGameByGameId(ctx, matchGameId);
  if (!pg) return undefined;
  const pm = await ctx.db.get(pg.playerMatchId);
  if (!pm) return undefined;
  const run = await ctx.db.get(pm.tournamentId as Id<"portal_run_tournaments">);
  if (!run?.campaignId || !run.campaignReplaySettings) return undefined;
  return pickReplaySettingsPartial(run.campaignReplaySettings as Record<string, unknown>);
}

/** Portal GC ops / internal upsert (full or partial settings). */
export const upsertPartnerAdReplayCapInternal = internalMutation({
  args: {
    partnerId: v.number(),
    adReplayDailyCap: v.number(),
    maxReplaysPerMatch: v.optional(v.number()),
    adReplayEnabled: v.optional(v.boolean()),
    ticketReplayEnabled: v.optional(v.boolean()),
    ticketReplayPriceTickets: v.optional(v.number()),
    coinReplayEnabled: v.optional(v.boolean()),
    coinReplayPriceCoins: v.optional(v.number()),
    coinReplayDailyCap: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const partnerId = Math.floor(args.partnerId);
    if (!Number.isFinite(partnerId) || partnerId < 0) {
      return { ok: false as const, error: "invalid_partner" };
    }
    const cap = sanitizeCachedCap(args.adReplayDailyCap);
    const now = Date.now();
    const patch = {
      adReplayDailyCap: cap,
      updatedAt: now,
      ...(args.maxReplaysPerMatch !== undefined
        ? {
            maxReplaysPerMatch: sanitizeMaxReplaysPerMatch(
              args.maxReplaysPerMatch,
              PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT
            ),
          }
        : {}),
      ...(args.adReplayEnabled !== undefined
        ? { adReplayEnabled: Boolean(args.adReplayEnabled) }
        : {}),
      ...(args.ticketReplayEnabled !== undefined
        ? { ticketReplayEnabled: Boolean(args.ticketReplayEnabled) }
        : {}),
      ...(args.ticketReplayPriceTickets !== undefined
        ? {
            ticketReplayPriceTickets: sanitizeTicketReplayPrice(
              args.ticketReplayPriceTickets,
              PORTAL_TICKET_REPLAY_PRICE_DEFAULT
            ),
          }
        : {}),
      ...(args.coinReplayEnabled !== undefined
        ? { coinReplayEnabled: Boolean(args.coinReplayEnabled) }
        : {}),
      ...(args.coinReplayPriceCoins !== undefined
        ? { coinReplayPriceCoins: Math.max(0, Math.floor(args.coinReplayPriceCoins)) }
        : {}),
      ...(args.coinReplayDailyCap !== undefined
        ? { coinReplayDailyCap: args.coinReplayDailyCap }
        : {}),
    };
    const existing = await findPartnerReplaySettings(ctx, partnerId);
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      const extras = await ctx.db
        .query("portal_partner_replay_settings")
        .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
        .collect();
      for (const row of extras) {
        if (row._id !== existing._id) {
          await ctx.db.delete(row._id);
        }
      }
    } else {
      await ctx.db.insert("portal_partner_replay_settings", {
        partnerId,
        ...patch,
      });
    }
    const row = await findPartnerReplaySettings(ctx, partnerId);
    return {
      ok: true as const,
      partnerId,
      settings: normalizePartnerRow(row),
    };
  },
});

export const getPartnerAdReplayCapCachedInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const row = await findPartnerReplaySettings(ctx, partnerId);
    if (!row) return null;
    const settings = normalizePartnerRow(row);
    return {
      partnerId,
      adReplayDailyCap: settings.adReplayDailyCap,
      maxReplaysPerMatch: settings.maxReplaysPerMatch,
      adReplayEnabled: settings.adReplayEnabled,
      ticketReplayEnabled: settings.ticketReplayEnabled,
      ticketReplayPriceTickets: settings.ticketReplayPriceTickets,
      updatedAt: row.updatedAt,
      settings,
    };
  },
});

export { rowToPartial as partnerReplaySettingsRowToPartial };
