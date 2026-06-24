import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { prunePendingWalletRewards } from "./casualRunScoreEffects";
export const claimCasualRunRewards = mutation({
  args: {
    uid: v.string(),
    playerTournamentId: v.id("portal_run_player_tournaments"),
  },
  handler: async (ctx, { uid, playerTournamentId }) => {
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

/** 周期场分档预发奖：领取 `portal_score_tier_pending` 写入钱包 */
export const claimCasualScoreTierPendingReward = mutation({
  args: {
    uid: v.string(),
    pendingRewardId: v.id("portal_score_tier_pending"),
  },
  handler: async (ctx, { uid, pendingRewardId }) => {
    const row = await ctx.db.get(pendingRewardId);
    if (!row || row.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (row.status !== "pending") {
      return { ok: false as const, error: "already_claimed" as const };
    }
    const pr = prunePendingWalletRewards({
      coins: row.coins,
      gems: row.gems,
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
    await ctx.db.patch(row._id, {
      status: "claimed",
      claimedAt: now,
    });
    return { ok: true as const };
  },
});

const SCORE_TIER_PENDING_BATCH_MAX = 16;

/** 同一局结算多档合并领取：须为同一 `instanceId + runTournamentId + matchGameId + createdAt` 批次 */
export const claimCasualScoreTierPendingRewardsBatch = mutation({
  args: {
    uid: v.string(),
    pendingRewardIds: v.array(v.id("portal_score_tier_pending")),
  },
  handler: async (ctx, { uid, pendingRewardIds }) => {
    if (pendingRewardIds.length === 0) {
      return { ok: false as const, error: "empty_batch" as const };
    }
    if (pendingRewardIds.length > SCORE_TIER_PENDING_BATCH_MAX) {
      return { ok: false as const, error: "batch_too_large" as const };
    }
    if (new Set(pendingRewardIds.map(String)).size !== pendingRewardIds.length) {
      return { ok: false as const, error: "duplicate_ids" as const };
    }
    const rows = (await Promise.all(pendingRewardIds.map((id) => ctx.db.get(id)))).filter(
      (row): row is NonNullable<typeof row> => row != null
    );
    if (rows.length !== pendingRewardIds.length) {
      return { ok: false as const, error: "forbidden" as const };
    }
    for (const row of rows) {
      if (row.uid !== uid) {
        return { ok: false as const, error: "forbidden" as const };
      }
      if (row.status !== "pending") {
        return { ok: false as const, error: "already_claimed" as const };
      }
    }
    const r0 = rows[0];
    for (const row of rows) {
      if (
        String(row.instanceId) !== String(r0.instanceId) ||
        String(row.runTournamentId) !== String(r0.runTournamentId) ||
        row.matchGameId !== r0.matchGameId ||
        row.createdAt !== r0.createdAt
      ) {
        return { ok: false as const, error: "batch_mismatch" as const };
      }
    }
    let sumCoins = 0;
    let sumGems = 0;
    for (const row of rows) {
      sumCoins += Math.max(0, Math.floor(row.coins ?? 0));
      sumGems += Math.max(0, Math.floor(row.gems ?? 0));
    }
    const pr = prunePendingWalletRewards({
      coins: sumCoins,
      gems: sumGems,
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
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        status: "claimed",
        claimedAt: now,
      });
    }
    return { ok: true as const };
  },
});
