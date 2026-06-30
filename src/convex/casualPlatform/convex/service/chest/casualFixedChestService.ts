import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { resolveFixedChestTable } from "../../data/casualFixedChestCatalog";
import { authedMutation } from "../../custom/session";

/**
 * 固定箱直开（Pass/任务等奖池见 `casualFixedChestCatalog`）。
 */
export const openFixedChest = authedMutation({
  args: { chestId: v.string() },
  handler: async (ctx, { chestId }) => {
    const uid = ctx.uid;
    const table = resolveFixedChestTable(chestId);
    if (!table) return { ok: false as const, error: "unknown_chest" };
    const opened = await ctx.db
      .query("casual_fixed_chest_opens")
      .withIndex("by_uid_chest", (q) => q.eq("uid", uid).eq("chestId", chestId))
      .unique();
    if (opened) {
      return { ok: false as const, error: "already_opened" };
    }
    await ctx.db.insert("casual_fixed_chest_opens", {
      uid,
      chestId,
      openedAt: Date.now(),
    });
    for (const g of table) {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: g.kind === "seasonVoucher" ? "seasonVoucher" : g.kind,
        amount: g.amount,
      });
    }
    return { ok: true as const, grants: table };
  },
});
