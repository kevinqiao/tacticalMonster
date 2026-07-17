import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";

const campaignRewardSyncStatusValidator = v.union(
  v.literal("none"),
  v.literal("pending"),
  v.literal("synced"),
  v.literal("failed")
);

/**
 * Idempotent: write Campaign pass_run reward display snapshot onto player match.
 */
export const writePassRunRewardSnapshot = internalMutation({
  args: {
    runTournamentId: v.string(),
    uid: v.string(),
    matchId: v.optional(v.string()),
    syncStatus: campaignRewardSyncStatusValidator,
    rewardLabel: v.optional(v.string()),
    couponId: v.optional(v.string()),
    attempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let pm: Doc<"portal_run_player_matches"> | null = null;

    if (args.matchId) {
      pm = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_match_uid", (q) =>
          q.eq("matchId", args.matchId!).eq("uid", args.uid)
        )
        .unique();
    }
    if (!pm) {
      pm = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_run_uid", (q) =>
          q.eq("tournamentId", args.runTournamentId).eq("uid", args.uid)
        )
        .first();
    }
    if (!pm) {
      return { ok: false as const, error: "player_match_not_found" as const };
    }

    const label = args.rewardLabel?.trim() || undefined;
    if (
      pm.campaignRewardSyncStatus === "synced" &&
      args.syncStatus === "synced" &&
      (!label || pm.campaignRewardLabel === label)
    ) {
      return { ok: true as const, already: true as const };
    }

    const now = Date.now();
    await ctx.db.patch(pm._id, {
      campaignRewardSyncStatus: args.syncStatus,
      ...(label ? { campaignRewardLabel: label } : {}),
      ...(args.couponId != null ? { campaignRewardCouponId: args.couponId } : {}),
      ...(args.syncStatus === "synced" ? { campaignRewardSyncedAt: now } : {}),
      campaignRewardSyncAttempts: args.attempts ?? pm.campaignRewardSyncAttempts ?? 0,
      updatedAt: now,
    });

    return { ok: true as const };
  },
});
