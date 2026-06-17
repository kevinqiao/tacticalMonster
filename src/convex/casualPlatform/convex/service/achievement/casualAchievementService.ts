/**
 * 成就解锁：peakLeagueTier、晋级、胜场、三合一。
 */
import { internal } from "../../_generated/api";
import {
  CASUAL_ACHIEVEMENT_TEMPLATES,
  leagueTierOrder,
} from "../../data/casualAchievementTemplates";
import { internalMutation, query } from "../../_generated/server";
import { v } from "convex/values";

export type AchievementCheckEvent =
  | {
      kind: "week_close";
      peakLeagueTier: string;
      weeklyPromoteCount: number;
    }
  | {
      kind: "match_settled";
      multiplayerWin?: boolean;
      totalMatchWins: number;
      totalMultiplayerWins: number;
      totalTriathlonCompletes: number;
      peakLeagueTier: string;
    };

export const checkAndUnlockAchievements = internalMutation({
  args: {
    uid: v.string(),
    event: v.union(
      v.object({
        kind: v.literal("week_close"),
        peakLeagueTier: v.string(),
        weeklyPromoteCount: v.number(),
      }),
      v.object({
        kind: v.literal("match_settled"),
        multiplayerWin: v.optional(v.boolean()),
        totalMatchWins: v.number(),
        totalMultiplayerWins: v.number(),
        totalTriathlonCompletes: v.number(),
        peakLeagueTier: v.string(),
      })
    ),
  },
  handler: async (ctx, { uid, event }) => {
    const unlocked: string[] = [];
    const now = Date.now();

    for (const tmpl of CASUAL_ACHIEVEMENT_TEMPLATES) {
      const existing = await ctx.db
        .query("casual_player_achievements")
        .withIndex("by_uid_achievement", (q) =>
          q.eq("uid", uid).eq("achievementId", tmpl.achievementId)
        )
        .unique();
      if (existing) continue;

      let met = false;
      if (event.kind === "week_close") {
        if (tmpl.eventKind === "peak_league_tier") {
          met = leagueTierOrder(event.peakLeagueTier) >= tmpl.threshold;
        } else if (tmpl.eventKind === "weekly_promote_count") {
          met = event.weeklyPromoteCount >= tmpl.threshold;
        }
      } else if (event.kind === "match_settled") {
        if (tmpl.eventKind === "peak_league_tier") {
          met = leagueTierOrder(event.peakLeagueTier) >= tmpl.threshold;
        } else if (tmpl.eventKind === "multiplayer_win") {
          met = event.totalMultiplayerWins >= tmpl.threshold;
        } else if (tmpl.eventKind === "total_match_wins") {
          met = event.totalMatchWins >= tmpl.threshold;
        } else if (tmpl.eventKind === "triathlon_complete") {
          met = event.totalTriathlonCompletes >= tmpl.threshold;
        }
      }
      if (!met) continue;

      await ctx.db.insert("casual_player_achievements", {
        uid,
        achievementId: tmpl.achievementId,
        unlockedAt: now,
      });
      unlocked.push(tmpl.achievementId);

      if (tmpl.skinToken) {
        await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
          uid,
          kind: "skin",
          amount: 1,
          skinToken: tmpl.skinToken,
          source: "achievement",
        });
      }
    }
    return { unlocked };
  },
});

export const listPlayerAchievements = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const rows = await ctx.db
      .query("casual_player_achievements")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const profile = await ctx.db
      .query("casual_weekly_league_profile")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    return {
      achievements: rows.map((r) => ({
        achievementId: r.achievementId,
        unlockedAt: r.unlockedAt,
        metadataJson: r.metadataJson,
      })),
      peakLeagueTier: profile?.peakLeagueTier ?? "bronze",
      seasonPeakLeagueTier: profile?.seasonPeakLeagueTier,
    };
  },
});
