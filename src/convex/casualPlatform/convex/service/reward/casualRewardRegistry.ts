import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

/**
 * 休闲奖励分发：`coins`/`gems` 写入 `casual_players`；
 * `seasonXp`/赛季券/挑战点写入当前激活赛季的 `casual_pass_progress`。
 */
type GrantCasualRewardResult =
  | { ok: true }
  | { ok: false; error: "no_player" | "no_active_season" | "claim_failed" };

type SeasonWalletDeltaMutationResult =
  | { ok: true }
  | { ok: false; error: "no_season" | "insufficient_vouchers" | "insufficient_challenge_points" };

export const grantCasualReward = internalMutation({
  args: {
    uid: v.string(),
    kind: v.union(
      v.literal("coins"),
      v.literal("gems"),
      v.literal("seasonXp"),
      v.literal("seasonVoucher"),
      v.literal("seasonChallengePoints")
    ),
    amount: v.number(),
  },
  handler: async (ctx, { uid, kind, amount }): Promise<GrantCasualRewardResult> => {
    const row = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!row) return { ok: false as const, error: "no_player" };
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { ok: true as const };

    if (kind === "seasonXp") {
      await ctx.runMutation(internal.service.season.casualSeasonService.addPassXpFromRun, {
        uid,
        deltaXp: delta,
      });
      return { ok: true as const };
    }
    if (kind === "seasonVoucher") {
      const r = (await ctx.runMutation(
        internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta,
        { uid, deltaVouchers: delta }
      )) as SeasonWalletDeltaMutationResult;
      return r.ok
        ? { ok: true as const }
        : {
            ok: false as const,
            error: r.error === "no_season" ? ("no_active_season" as const) : ("claim_failed" as const),
          };
    }
    if (kind === "seasonChallengePoints") {
      const r = (await ctx.runMutation(
        internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta,
        { uid, deltaChallengePoints: delta }
      )) as SeasonWalletDeltaMutationResult;
      return r.ok
        ? { ok: true as const }
        : {
            ok: false as const,
            error: r.error === "no_season" ? ("no_active_season" as const) : ("claim_failed" as const),
          };
    }
    const patch: Record<string, number> = {};
    if (kind === "coins") patch.coins = (row.coins ?? 0) + delta;
    if (kind === "gems") patch.gems = (row.gems ?? 0) + delta;
    await ctx.db.patch(row._id, { ...patch, updatedAt: Date.now() });
    return { ok: true as const };
  },
});
