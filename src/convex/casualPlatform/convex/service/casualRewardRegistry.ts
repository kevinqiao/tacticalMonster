import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

/**
 * 休闲奖励分发占位：按类型写入 `casual_players`。
 * 后续接 battle-pass 文档中的 handler registry / 皮肤等扩展点。
 */
export const grantCasualReward = internalMutation({
  args: {
    uid: v.string(),
    kind: v.union(
      v.literal("coins"),
      v.literal("gems"),
      v.literal("seasonXp"),
      v.literal("seasonVoucher")
    ),
    amount: v.number(),
  },
  handler: async (ctx, { uid, kind, amount }) => {
    const row = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };

    const patch: Record<string, number> = {};
    if (kind === "coins") patch.coins = (row.coins ?? 0) + delta;
    if (kind === "gems") patch.gems = (row.gems ?? 0) + delta;
    if (kind === "seasonXp") patch.seasonXp = (row.seasonXp ?? 0) + delta;
    if (kind === "seasonVoucher") {
      patch.gems = (row.gems ?? 0) + delta;
    }
    await ctx.db.patch(row._id, { ...patch, updatedAt: Date.now() });
    return { ok: true as const };
  },
});
