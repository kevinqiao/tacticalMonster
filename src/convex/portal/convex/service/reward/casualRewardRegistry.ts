import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

type GrantPortalRewardResult =
  | { ok: true }
  | { ok: false; error: "no_player" | "invalid_amount" };

/** Portal 金币/钻发放（写入 `portal_players` + `portal_coin_ledger`）。 */
export const grantCasualReward = internalMutation({
  args: {
    uid: v.string(),
    kind: v.union(
      v.literal("coins"),
      v.literal("gems"),
      v.literal("seasonVoucher")
    ),
    amount: v.number(),
    reason: v.optional(v.string()),
    gameType: v.optional(v.string()),
    sourceWeekKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { uid, kind, amount, reason, gameType, sourceWeekKey }
  ): Promise<GrantPortalRewardResult> => {
    if (kind === "seasonVoucher") {
      return { ok: true as const };
    }
    const row = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };

    const now = Date.now();
    let balanceAfter = 0;
    const patch: { coins?: number; gems?: number; updatedAt: number } = { updatedAt: now };
    if (kind === "coins") {
      balanceAfter = (row.coins ?? 0) + delta;
      patch.coins = balanceAfter;
    } else {
      balanceAfter = (row.gems ?? 0) + delta;
      patch.gems = balanceAfter;
    }
    await ctx.db.patch(row._id, patch);
    await ctx.db.insert("portal_coin_ledger", {
      uid,
      kind,
      delta,
      balanceAfter,
      reason: reason ?? kind,
      gameType,
      sourceWeekKey,
      createdAt: now,
    });
    return { ok: true as const };
  },
});

type SpendPortalCoinsResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; error: "no_player" | "insufficient_coins" };

export const spendPortalCoins = internalMutation({
  args: {
    uid: v.string(),
    amount: v.number(),
    reason: v.optional(v.string()),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, { uid, amount, reason, gameType }): Promise<SpendPortalCoinsResult> => {
    const row = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const cost = Math.max(0, Math.floor(amount));
    const cur = row.coins ?? 0;
    if (cost > cur) return { ok: false as const, error: "insufficient_coins" };
    if (cost === 0) return { ok: true as const, balanceAfter: cur };

    const now = Date.now();
    const balanceAfter = cur - cost;
    await ctx.db.patch(row._id, { coins: balanceAfter, updatedAt: now });
    await ctx.db.insert("portal_coin_ledger", {
      uid,
      kind: "coins",
      delta: -cost,
      balanceAfter,
      reason: reason ?? "spend",
      gameType,
      createdAt: now,
    });
    return { ok: true as const, balanceAfter };
  },
});
