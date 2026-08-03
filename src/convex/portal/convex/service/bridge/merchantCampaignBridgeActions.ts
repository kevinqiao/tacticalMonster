"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import {
  notifyMerchantOnRunSettledViaHttp,
  type IssuedCouponFromMerchant,
  type NotifyOnRunSettledArgs,
} from "./merchantCampaignBridge";

/** Delays before snapshot retry attempts 1..N (attempt 0 is immediate). */
const SNAPSHOT_RETRY_DELAYS_MS = [2_000, 10_000, 60_000, 300_000] as const;
/** Delays before full notify retry attempts 1..N. */
const NOTIFY_RETRY_DELAYS_MS = [2_000, 10_000, 60_000, 300_000] as const;

const notifyArgsValidator = {
  campaignId: v.string(),
  partnerId: v.number(),
  uid: v.string(),
  runTournamentId: v.string(),
  matchId: v.optional(v.string()),
  gameType: v.string(),
  mode: v.union(v.literal("solo"), v.literal("multi")),
  score: v.number(),
  rank: v.optional(v.number()),
  isPassed: v.optional(v.boolean()),
  notifyAttempt: v.optional(v.number()),
};

function pickPrimaryIssued(
  issued: IssuedCouponFromMerchant[]
): IssuedCouponFromMerchant | null {
  const withLabel = issued.find((row) => row.rewardLabel.trim().length > 0);
  return withLabel ?? issued[0] ?? null;
}

export const notifyOnRunSettled = internalAction({
  args: notifyArgsValidator,
  handler: async (ctx, args) => {
    const notifyAttempt = args.notifyAttempt ?? 0;
    const notifyPayload: NotifyOnRunSettledArgs = {
      campaignId: args.campaignId,
      partnerId: args.partnerId,
      uid: args.uid,
      runTournamentId: args.runTournamentId,
      matchId: args.matchId,
      gameType: args.gameType,
      mode: args.mode,
      score: args.score,
      rank: args.rank,
      isPassed: args.isPassed,
    };

    const result = await notifyMerchantOnRunSettledViaHttp(notifyPayload);
    if (!result.ok) {
      console.warn(
        "[portal] on-run-settled failed",
        args.runTournamentId,
        result.error,
        "attempt",
        notifyAttempt
      );
      const delay = NOTIFY_RETRY_DELAYS_MS[notifyAttempt];
      if (delay != null) {
        await ctx.scheduler.runAfter(
          delay,
          internal.service.bridge.merchantCampaignBridgeActions.notifyOnRunSettled,
          { ...args, notifyAttempt: notifyAttempt + 1 }
        );
      }
      return result;
    }

    const issued = result.issued ?? [];
    if (issued.length === 0) {
      await ctx.runMutation(
        internal.service.tournament.settle.campaignPassRunRewardSnapshot
          .writePassRunRewardSnapshot,
        {
          runTournamentId: args.runTournamentId,
          uid: args.uid,
          matchId: args.matchId,
          syncStatus: "none",
          attempts: 0,
        }
      );
      return { ok: true as const, issued: [] };
    }

    const primary = pickPrimaryIssued(issued);
    if (!primary?.rewardLabel.trim()) {
      await ctx.runMutation(
        internal.service.tournament.settle.campaignPassRunRewardSnapshot
          .writePassRunRewardSnapshot,
        {
          runTournamentId: args.runTournamentId,
          uid: args.uid,
          matchId: args.matchId,
          syncStatus: "none",
          attempts: 0,
        }
      );
      return { ok: true as const, issued };
    }

    const write = await ctx.runMutation(
      internal.service.tournament.settle.campaignPassRunRewardSnapshot
        .writePassRunRewardSnapshot,
      {
        runTournamentId: args.runTournamentId,
        uid: args.uid,
        matchId: args.matchId,
        syncStatus: "synced",
        rewardLabel: primary.rewardLabel,
        couponId: primary.couponId,
        attempts: 0,
      }
    );

    if (!write.ok) {
      await ctx.scheduler.runAfter(
        SNAPSHOT_RETRY_DELAYS_MS[0],
        internal.service.bridge.merchantCampaignBridgeActions
          .writePassRunRewardSnapshotWithRetry,
        {
          runTournamentId: args.runTournamentId,
          uid: args.uid,
          matchId: args.matchId,
          rewardLabel: primary.rewardLabel,
          couponId: primary.couponId,
          attempt: 1,
        }
      );
    }

    return { ok: true as const, issued };
  },
});

export const writePassRunRewardSnapshotWithRetry = internalAction({
  args: {
    runTournamentId: v.string(),
    uid: v.string(),
    matchId: v.optional(v.string()),
    rewardLabel: v.string(),
    couponId: v.optional(v.string()),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const write = await ctx.runMutation(
      internal.service.tournament.settle.campaignPassRunRewardSnapshot
        .writePassRunRewardSnapshot,
      {
        runTournamentId: args.runTournamentId,
        uid: args.uid,
        matchId: args.matchId,
        syncStatus: "synced",
        rewardLabel: args.rewardLabel,
        couponId: args.couponId,
        attempts: args.attempt,
      }
    );

    if (write.ok) {
      return { ok: true as const };
    }

    console.warn(
      "[portal] writePassRunRewardSnapshot failed",
      args.runTournamentId,
      write.error,
      "attempt",
      args.attempt
    );

    const nextDelay = SNAPSHOT_RETRY_DELAYS_MS[args.attempt];
    if (nextDelay == null) {
      await ctx.runMutation(
        internal.service.tournament.settle.campaignPassRunRewardSnapshot
          .writePassRunRewardSnapshot,
        {
          runTournamentId: args.runTournamentId,
          uid: args.uid,
          matchId: args.matchId,
          syncStatus: "failed",
          rewardLabel: args.rewardLabel,
          couponId: args.couponId,
          attempts: args.attempt,
        }
      );
      return { ok: false as const, error: write.error };
    }

    await ctx.runMutation(
      internal.service.tournament.settle.campaignPassRunRewardSnapshot
        .writePassRunRewardSnapshot,
      {
        runTournamentId: args.runTournamentId,
        uid: args.uid,
        matchId: args.matchId,
        syncStatus: "pending",
        rewardLabel: args.rewardLabel,
        couponId: args.couponId,
        attempts: args.attempt,
      }
    );

    await ctx.scheduler.runAfter(
      nextDelay,
      internal.service.bridge.merchantCampaignBridgeActions
        .writePassRunRewardSnapshotWithRetry,
      { ...args, attempt: args.attempt + 1 }
    );

    return { ok: false as const, error: write.error, scheduledRetry: true as const };
  },
});
