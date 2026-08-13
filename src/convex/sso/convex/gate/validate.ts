import { v } from "convex/values";
import { sessionMutation, sessionQuery } from "../custom/session";
import { COIN_AID, getBuilding, getTier } from "../town/config";

export const validateEntry = sessionQuery({
  args: {
    uid: v.string(),
    token: v.optional(v.string()),
    buildingId: v.string(),
    modeId: v.string(),
    tierId: v.string(),
  },
  handler: async (ctx, { uid, buildingId, modeId, tierId }) => {
    if (!ctx.user || ctx.user.uid !== uid) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    const building = getBuilding(buildingId);
    if (!building || !building.ssaKey) {
      return { ok: false, error: "NOT_A_PORTAL" };
    }

    if (building.ssaKey === "poker") {
      return { ok: false, error: "SSA_NOT_READY", message: "Poker Saloon coming soon" };
    }

    const mode = building.modes.find((m) => m.id === modeId);
    if (!mode) {
      return { ok: false, error: "INVALID_MODE" };
    }

    const tier = getTier(buildingId, tierId);
    if (!tier) {
      return { ok: false, error: "INVALID_TIER" };
    }

    const progress = await ctx.db
      .query("townProgress")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    if (!progress) {
      return { ok: false, error: "NO_PROGRESS" };
    }

    if (!progress.unlockedTierIds.includes(tierId)) {
      return { ok: false, error: "TIER_LOCKED", tierId };
    }

    const coinAsset = await ctx.db
      .query("asset")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid).eq("aid", COIN_AID))
      .unique();

    const balance = coinAsset?.balance ?? 0;
    if (balance < tier.buyIn) {
      return { ok: false, error: "INSUFFICIENT_FUNDS", balance, buyIn: tier.buyIn };
    }

    return {
      ok: true,
      ssaKey: building.ssaKey,
      buildingId,
      modeId,
      tierId,
      buyIn: tier.buyIn,
      balance,
    };
  },
});

export const recordEntry = sessionMutation({
  args: {
    uid: v.string(),
    token: v.string(),
    buildingId: v.string(),
    modeId: v.string(),
    tierId: v.string(),
  },
  handler: async (ctx, { uid, buildingId, modeId, tierId }) => {
    if (!ctx.user || ctx.user.uid !== uid) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    const building = getBuilding(buildingId);
    const tier = getTier(buildingId, tierId);
    if (!building?.ssaKey || !tier) {
      return { ok: false, error: "INVALID_REQUEST" };
    }

    if (building.ssaKey === "poker") {
      return { ok: false, error: "SSA_NOT_READY" };
    }

    const progress = await ctx.db
      .query("townProgress")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    if (!progress || !progress.unlockedTierIds.includes(tierId)) {
      return { ok: false, error: "TIER_LOCKED" };
    }

    const coinAsset = await ctx.db
      .query("asset")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid).eq("aid", COIN_AID))
      .unique();

    if (!coinAsset || coinAsset.balance < tier.buyIn) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }

    if (tier.buyIn > 0) {
      await ctx.db.patch(coinAsset._id, { balance: coinAsset.balance - tier.buyIn });
    }

    const entryToken = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const entryId = await ctx.db.insert("gateEntry", {
      uid,
      entryToken,
      buildingId,
      modeId,
      tierId,
      buyIn: tier.buyIn,
      ssaKey: building.ssaKey,
      status: "entered",
      createdAt: Date.now(),
    });

    return {
      ok: true,
      entryToken,
      entryId,
      ssaKey: building.ssaKey,
      buyIn: tier.buyIn,
      balance: coinAsset.balance - tier.buyIn,
    };
  },
});
