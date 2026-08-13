import { v } from "convex/values";
import { authedMutation, authedQuery } from "../../custom/session";
import { applyWalletDelta, getPlayerWalletBalances } from "../economy/portalWalletDao";
import { getBuilding, getTier } from "./config";

export const validateEntry = authedQuery({
  args: {
    buildingId: v.string(),
    modeId: v.string(),
    tierId: v.string(),
  },
  handler: async (ctx, { buildingId, modeId, tierId }) => {
    const building = getBuilding(buildingId);
    if (!building?.ssaKey) {
      return { ok: false as const, error: "NOT_A_PORTAL" };
    }
    if (building.ssaKey === "poker") {
      return {
        ok: false as const,
        error: "SSA_NOT_READY",
        message: "Poker Saloon coming soon",
      };
    }
    if (!building.modes.some((m) => m.id === modeId)) {
      return { ok: false as const, error: "INVALID_MODE" };
    }
    const tier = getTier(buildingId, tierId);
    if (!tier) {
      return { ok: false as const, error: "INVALID_TIER" };
    }

    const progress = await ctx.db
      .query("town_progress")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();
    if (!progress?.unlockedTierIds.includes(tierId)) {
      return { ok: false as const, error: "TIER_LOCKED", tierId };
    }

    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, "shared");
    if (wallet.coins < tier.buyIn) {
      return {
        ok: false as const,
        error: "INSUFFICIENT_FUNDS",
        balance: wallet.coins,
        buyIn: tier.buyIn,
      };
    }

    return {
      ok: true as const,
      ssaKey: building.ssaKey,
      buildingId,
      modeId,
      tierId,
      buyIn: tier.buyIn,
      balance: wallet.coins,
    };
  },
});

export const recordEntry = authedMutation({
  args: {
    buildingId: v.string(),
    modeId: v.string(),
    tierId: v.string(),
  },
  handler: async (ctx, { buildingId, modeId, tierId }) => {
    const building = getBuilding(buildingId);
    const tier = getTier(buildingId, tierId);
    if (!building?.ssaKey || !tier) {
      return { ok: false as const, error: "INVALID_REQUEST" };
    }
    if (building.ssaKey === "poker") {
      return { ok: false as const, error: "SSA_NOT_READY" };
    }

    const progress = await ctx.db
      .query("town_progress")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();
    if (!progress?.unlockedTierIds.includes(tierId)) {
      return { ok: false as const, error: "TIER_LOCKED" };
    }

    if (tier.buyIn > 0) {
      const debit = await applyWalletDelta(ctx, {
        uid: ctx.uid,
        scopeKey: "shared",
        kind: "coins",
        delta: -tier.buyIn,
        reason: "town_gate_buyin",
        gameType: building.ssaKey,
      });
      if (!debit.ok) {
        return { ok: false as const, error: "INSUFFICIENT_FUNDS" };
      }
    }

    const entryToken = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await ctx.db.insert("town_gate_entries", {
      uid: ctx.uid,
      entryToken,
      buildingId,
      modeId,
      tierId,
      buyIn: tier.buyIn,
      ssaKey: building.ssaKey,
      status: "entered",
      createdAt: Date.now(),
    });

    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, "shared");
    return {
      ok: true as const,
      entryToken,
      ssaKey: building.ssaKey,
      buyIn: tier.buyIn,
      balance: wallet.coins,
    };
  },
});
