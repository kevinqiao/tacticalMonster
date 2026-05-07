import { v } from "convex/values";
import { DEFAULT_CASUAL_ACTIVITIES } from "../data/casualActivityCatalog";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery, query, type QueryCtx } from "../_generated/server";

type SeasonActivityModifiers = {
  voucherCostMultiplier: number;
  voucherCostDelta: number;
  passXpMultiplier: number;
  passXpDelta: number;
  coinsCostMultiplier: number;
  coinsCostDelta: number;
  gemsCostMultiplier: number;
  gemsCostDelta: number;
  iapGrantGemsMultiplier: number;
  iapGrantGemsDelta: number;
  activityIds: string[];
};

function inWindow(now: number, startsAt: number, endsAt: number): boolean {
  return startsAt <= now && now <= endsAt;
}

async function loadActiveCasualActivities(ctx: QueryCtx, now: number) {
  const rows = await ctx.db
    .query("casual_activities")
    .withIndex("by_active_startsAt", (q) => q.eq("active", true).lte("startsAt", now))
    .collect();
  return rows.filter((r) => inWindow(now, r.startsAt, r.endsAt));
}

function foldEffectsIntoModifiers(
  out: SeasonActivityModifiers,
  fx: {
    voucherCostMultiplier?: number;
    voucherCostDelta?: number;
    passXpMultiplier?: number;
    passXpDelta?: number;
    coinsCostMultiplier?: number;
    coinsCostDelta?: number;
    gemsCostMultiplier?: number;
    gemsCostDelta?: number;
    iapGrantGemsMultiplier?: number;
    iapGrantGemsDelta?: number;
  }
): void {
  if (typeof fx.voucherCostMultiplier === "number") {
    out.voucherCostMultiplier *= fx.voucherCostMultiplier;
  }
  if (typeof fx.voucherCostDelta === "number") {
    out.voucherCostDelta += fx.voucherCostDelta;
  }
  if (typeof fx.passXpMultiplier === "number") {
    out.passXpMultiplier *= fx.passXpMultiplier;
  }
  if (typeof fx.passXpDelta === "number") {
    out.passXpDelta += fx.passXpDelta;
  }
  if (typeof fx.coinsCostMultiplier === "number") {
    out.coinsCostMultiplier *= fx.coinsCostMultiplier;
  }
  if (typeof fx.coinsCostDelta === "number") {
    out.coinsCostDelta += fx.coinsCostDelta;
  }
  if (typeof fx.gemsCostMultiplier === "number") {
    out.gemsCostMultiplier *= fx.gemsCostMultiplier;
  }
  if (typeof fx.gemsCostDelta === "number") {
    out.gemsCostDelta += fx.gemsCostDelta;
  }
  if (typeof fx.iapGrantGemsMultiplier === "number") {
    out.iapGrantGemsMultiplier *= fx.iapGrantGemsMultiplier;
  }
  if (typeof fx.iapGrantGemsDelta === "number") {
    out.iapGrantGemsDelta += fx.iapGrantGemsDelta;
  }
}

function targetMatches(
  target: Doc<"casual_activities">["target"],
  args: { matchId?: string; skuId?: string; tournamentId?: string; shopSkuId?: string }
): boolean {
  if (target.type === "global") return true;
  if (target.type === "tournament_match") {
    const tid = args.tournamentId ?? args.matchId;
    if (!tid) return false;
    const bound = target.tournamentId;
    return !bound || bound === tid;
  }
  if (target.type === "season_shelf_sku") {
    if (!args.skuId) return false;
    const bound = target.shelfSkuId;
    return !bound || bound === args.skuId;
  }
  if (target.type === "casual_shop_sku") {
    if (!args.shopSkuId) return false;
    const bound = target.shopSkuId;
    return !bound || bound === args.shopSkuId;
  }
  return false;
}

export const listActiveActivities = query({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    const rows = await loadActiveCasualActivities(ctx, now);
    return rows.map((r) => ({
      activityId: r.activityId,
      title: r.title,
      target: r.target,
      seasonId: r.seasonId,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      effects: r.effects,
    }));
  },
});

export const resolveSeasonActivityModifiers = internalQuery({
  args: {
    matchId: v.optional(v.string()),
    tournamentId: v.optional(v.string()),
    skuId: v.optional(v.string()),
    shopSkuId: v.optional(v.string()),
    nowMs: v.optional(v.number()),
  },
  handler: async (ctx, { matchId, tournamentId, skuId, shopSkuId, nowMs }) => {
    const now = nowMs ?? Date.now();
    const active = await loadActiveCasualActivities(ctx, now);

    const out: SeasonActivityModifiers = {
      voucherCostMultiplier: 1,
      voucherCostDelta: 0,
      passXpMultiplier: 1,
      passXpDelta: 0,
      coinsCostMultiplier: 1,
      coinsCostDelta: 0,
      gemsCostMultiplier: 1,
      gemsCostDelta: 0,
      iapGrantGemsMultiplier: 1,
      iapGrantGemsDelta: 0,
      activityIds: [],
    };

    for (const r of active) {
      if (!targetMatches(r.target, { matchId, skuId, tournamentId, shopSkuId })) continue;
      out.activityIds.push(r.activityId);
      foldEffectsIntoModifiers(out, r.effects);
    }
    return out;
  },
});

export const seedActivitiesIfEmpty = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("casual_activities").take(1);
    if (existing.length > 0) return { ok: true as const, inserted: 0 };
    let inserted = 0;
    for (const a of DEFAULT_CASUAL_ACTIVITIES) {
      await ctx.db.insert("casual_activities", {
        activityId: a.activityId,
        title: a.title,
        target: a.target,
        seasonId: a.seasonId,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        active: a.active,
        effects: a.effects,
        updatedAt: Date.now(),
      });
      inserted += 1;
    }
    return { ok: true as const, inserted };
  },
});
