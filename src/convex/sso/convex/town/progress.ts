import { v } from "convex/values";
import { sessionMutation, sessionQuery } from "../custom/session";
import { BUILDINGS, COIN_AID, GEM_AID, STARTING_COINS } from "./config";

async function ensureWallet(ctx: { db: any }, uid: string) {
  const coinAsset = await ctx.db
    .query("asset")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid).eq("aid", COIN_AID))
    .unique();

  if (!coinAsset) {
    await ctx.db.insert("asset", { uid, aid: COIN_AID, balance: STARTING_COINS });
  }

  const gemAsset = await ctx.db
    .query("asset")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid).eq("aid", GEM_AID))
    .unique();

  if (!gemAsset) {
    await ctx.db.insert("asset", { uid, aid: GEM_AID, balance: 0 });
  }
}

async function getBalance(ctx: { db: any }, uid: string, aid: number) {
  const asset = await ctx.db
    .query("asset")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid).eq("aid", aid))
    .unique();
  return asset?.balance ?? 0;
}

export const getProgress = sessionQuery({
  args: { uid: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, { uid }) => {
    if (!ctx.user || ctx.user.uid !== uid) {
      return null;
    }

    await ensureWallet(ctx, uid);

    let progress = await ctx.db
      .query("townProgress")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    if (!progress) {
      const id = await ctx.db.insert("townProgress", {
        uid,
        townId: "mayfield",
        currentDistrict: "D0",
        unlockedDistricts: ["D0"],
        unlockedTierIds: ["parlor_t1", "saloon_t1"],
        questIds: [],
      });
      progress = await ctx.db.get(id);
    }

    const coins = await getBalance(ctx, uid, COIN_AID);
    const gems = await getBalance(ctx, uid, GEM_AID);

    return {
      ...progress,
      coins,
      gems,
      buildings: BUILDINGS,
    };
  },
});

export const unlockTier = sessionMutation({
  args: {
    uid: v.string(),
    token: v.string(),
    tierId: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, { uid, tierId, cost }) => {
    if (!ctx.user || ctx.user.uid !== uid) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    const progress = await ctx.db
      .query("townProgress")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    if (!progress) {
      return { ok: false, error: "NO_PROGRESS" };
    }

    if (progress.unlockedTierIds.includes(tierId)) {
      return { ok: true, alreadyUnlocked: true };
    }

    const coinAsset = await ctx.db
      .query("asset")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid).eq("aid", COIN_AID))
      .unique();

    if (!coinAsset || coinAsset.balance < cost) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }

    await ctx.db.patch(coinAsset._id, { balance: coinAsset.balance - cost });
    await ctx.db.patch(progress._id, {
      unlockedTierIds: [...progress.unlockedTierIds, tierId],
    });

    return { ok: true };
  },
});
