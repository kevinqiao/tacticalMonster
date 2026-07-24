import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import {
  clampTicketEntryDailyCap,
  clampTicketEntryPrice,
  PORTAL_TICKET_ENTRY_DEFAULTS,
  resolveTicketEntryEnabled,
  type PortalTicketEntryMode,
} from "../../data/portalTicketEntryConfig";
import {
  clampFreePlayDailyCap,
  type PortalDailyPlayMode,
} from "../../data/portalDailyPlayLimits";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { partnerIdFromUid } from "./partnerAdReplayConfig";
import { readPortalTicketBalance } from "../tournament/replay/casualReplayTokens";
import {
  getPortalTournamentDefinition,
} from "../../data/portalTournamentConfigs";

export type TicketEntryModeOffer = {
  enabled: boolean;
  remaining: number;
  cap: number;
  usedToday: number;
  priceTickets: number;
};

export async function resolveTicketEntryConfig(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  mode: PortalTicketEntryMode
) {
  const row = await ctx.db
    .query("portal_partner_play_entry_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerIdFromUid(uid)))
    .first();
  const enabled = resolveTicketEntryEnabled(row?.ticketEntryEnabled, mode);
  return mode === "solo"
    ? {
        enabled,
        priceTickets: clampTicketEntryPrice(row?.ticketEntrySoloPriceTickets, mode),
        dailyCap: clampTicketEntryDailyCap(row?.ticketEntrySoloDailyCap, mode),
      }
    : {
        enabled,
        priceTickets: clampTicketEntryPrice(row?.ticketEntryMultiPriceTickets, mode),
        dailyCap: clampTicketEntryDailyCap(row?.ticketEntryMultiDailyCap, mode),
      };
}

export async function resolveFreePlayDailyCap(
  ctx: QueryCtx | MutationCtx, uid: string, mode: PortalDailyPlayMode
): Promise<number> {
  const row = await ctx.db.query("portal_partner_play_entry_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerIdFromUid(uid))).first();
  return clampFreePlayDailyCap(
    mode === "solo" ? row?.freePlaySoloDailyCap : row?.freePlayMultiDailyCap, mode
  );
}

export async function readTicketEntryUsedToday(
  ctx: QueryCtx | MutationCtx, uid: string, dayKey: string, mode: PortalTicketEntryMode
) {
  const row = await ctx.db.query("portal_ticket_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) => q.eq("uid", uid).eq("dayKey", dayKey).eq("mode", mode))
    .unique();
  return Math.max(0, Math.floor(row?.usedCount ?? 0));
}

export async function getPortalTicketEntryOfferCore(
  ctx: QueryCtx | MutationCtx, uid: string
): Promise<{ solo: TicketEntryModeOffer; multi: TicketEntryModeOffer }> {
  const key = dailyPeriodKey(Date.now());
  const make = async (mode: PortalTicketEntryMode) => {
    const [cfg, used] = await Promise.all([resolveTicketEntryConfig(ctx, uid, mode), readTicketEntryUsedToday(ctx, uid, key, mode)]);
    return {
      enabled: cfg.enabled && cfg.dailyCap > 0,
      cap: cfg.dailyCap,
      usedToday: used,
      remaining: Math.max(0, cfg.dailyCap - used),
      priceTickets: cfg.priceTickets,
    };
  };
  const [solo, multi] = await Promise.all([make("solo"), make("multi")]);
  return { solo, multi };
}

/** Atomically charge a ticket entry after the free quota is exhausted. */
export async function useTicketEntryForJoin(
  ctx: MutationCtx, args: { uid: string; mode: PortalTicketEntryMode; now?: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = args.now ?? Date.now();
  const cfg = await resolveTicketEntryConfig(ctx, args.uid, args.mode);
  if (!cfg.enabled) return { ok: false, error: "ticket_entry_not_available" };
  const key = dailyPeriodKey(now);
  const used = await readTicketEntryUsedToday(ctx, args.uid, key, args.mode);
  if (cfg.dailyCap <= 0 || used >= cfg.dailyCap) return { ok: false, error: "ticket_entry_limit_reached" };
  if ((await readPortalTicketBalance(ctx, args.uid)) < cfg.priceTickets) {
    return { ok: false, error: "insufficient_tickets" };
  }
  const charged = await ctx.runMutation(internal.service.reward.casualRewardRegistry.spendPortalTickets, {
    uid: args.uid, amount: cfg.priceTickets, reason: `ticket_entry:${args.mode}`,
  });
  if (!charged.ok) return { ok: false, error: charged.error };
  const usage = await ctx.db.query("portal_ticket_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) => q.eq("uid", args.uid).eq("dayKey", key).eq("mode", args.mode)).unique();
  if (usage) await ctx.db.patch(usage._id, { usedCount: usage.usedCount + 1, updatedAt: now });
  else await ctx.db.insert("portal_ticket_entry_daily_usage", {
    uid: args.uid, dayKey: key, mode: args.mode, usedCount: 1, createdAt: now, updatedAt: now,
  });
  return { ok: true };
}

export { PORTAL_TICKET_ENTRY_DEFAULTS };

export const consumeTicketEntryForJoin = internalMutation({
  args: { uid: v.string(), templateId: v.string() },
  handler: async (ctx, args) => {
    const def = getPortalTournamentDefinition(args.templateId);
    const mode = def?.matchType === "solo_p75" ? "solo" : def?.matchType === "multi_ranked" ? "multi" : null;
    if (!mode) return { ok: false as const, error: "invalid_mode" };
    return await useTicketEntryForJoin(ctx, { uid: args.uid, mode });
  },
});

/** SSO bridge write for partner free-play and ticket-entry overrides. */
export const upsertPartnerPlayEntrySettingsInternal = internalMutation({
  args: {
    partnerId: v.number(),
    freePlaySoloDailyCap: v.optional(v.number()),
    freePlayMultiDailyCap: v.optional(v.number()),
    ticketEntryEnabled: v.optional(v.boolean()),
    ticketEntrySoloPriceTickets: v.optional(v.number()),
    ticketEntrySoloDailyCap: v.optional(v.number()),
    ticketEntryMultiPriceTickets: v.optional(v.number()),
    ticketEntryMultiDailyCap: v.optional(v.number()),
    adEntryEnabled: v.optional(v.boolean()),
    adEntrySoloDailyCap: v.optional(v.number()),
    adEntryMultiDailyCap: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const partnerId = Math.floor(args.partnerId);
    if (!Number.isFinite(partnerId) || partnerId < 0) return { ok: false as const, error: "invalid_partner" };
    const rows = await ctx.db.query("portal_partner_play_entry_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId)).collect();
    const data = { ...args, partnerId, updatedAt: Date.now() };
    delete (data as Partial<typeof data>).partnerId;
    if (rows[0]) {
      await ctx.db.patch(rows[0]._id, data);
      for (const duplicate of rows.slice(1)) await ctx.db.delete(duplicate._id);
    } else {
      await ctx.db.insert("portal_partner_play_entry_settings", { partnerId, ...data });
    }
    return { ok: true as const };
  },
});
