import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { authedMutation } from "../../../custom/session";
import { prunePendingWalletRewards } from "./casualRunScoreEffects";
export const claimCasualRunRewards = authedMutation({
  args: {
    playerTournamentId: v.id("portal_run_player_tournaments"),
  },
  handler: async (ctx, { playerTournamentId }) => {
    const uid = ctx.uid;
    const pt = await ctx.db.get(playerTournamentId);
    if (!pt || pt.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (pt.runRewardsClaimedAt != null) {
      return { ok: false as const, error: "already_claimed" as const };
    }
    const pending = pt.pendingRunRewards;
    const pr = prunePendingWalletRewards({
      coins: pending?.coins,
      gems: pending?.gems,
      seasonVoucher: pending?.seasonVoucher,
    });
    if (!pr) {
      return { ok: false as const, error: "nothing_to_claim" as const };
    }
    const now = Date.now();
    if ((pr.coins ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: pr.coins!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    if ((pr.gems ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: pr.gems!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    if ((pr.seasonVoucher ?? 0) > 0) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "seasonVoucher",
        amount: pr.seasonVoucher!,
      });
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }
    await ctx.db.patch(pt._id, {
      pendingRunRewards: undefined,
      runRewardsClaimedAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});
