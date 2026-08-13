import { v } from "convex/values";
import { authedQuery } from "../../custom/session";
import { getPlayerWalletBalances } from "../economy/portalWalletDao";
import { BUILDINGS } from "./config";

const DEFAULT_UNLOCKED_TIERS = ["parlor_t1", "saloon_t1"];

async function ensureTownProgress(ctx: { db: any; uid: string }) {
  let progress = await ctx.db
    .query("town_progress")
    .withIndex("by_uid", (q: any) => q.eq("uid", ctx.uid))
    .unique();

  if (!progress) {
    const now = Date.now();
    const id = await ctx.db.insert("town_progress", {
      uid: ctx.uid,
      townId: "mayfield",
      currentDistrict: "D0",
      unlockedDistricts: ["D0"],
      unlockedTierIds: DEFAULT_UNLOCKED_TIERS,
      questIds: [],
      updatedAt: now,
    });
    progress = await ctx.db.get(id);
  }
  return progress;
}

/** Town shell progress + shared wallet snapshot for Gate Card. */
export const getProgress = authedQuery({
  args: {},
  handler: async (ctx) => {
    const progress = await ensureTownProgress(ctx);
    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, "shared");
    return {
      townId: progress!.townId,
      currentDistrict: progress!.currentDistrict,
      unlockedDistricts: progress!.unlockedDistricts,
      unlockedTierIds: progress!.unlockedTierIds,
      questIds: progress!.questIds,
      coins: wallet.coins,
      gems: wallet.gems,
      tickets: wallet.tickets,
      buildings: BUILDINGS,
    };
  },
});
