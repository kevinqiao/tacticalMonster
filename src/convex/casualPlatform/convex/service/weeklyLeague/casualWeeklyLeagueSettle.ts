/**
 * 结算钩子：League XP + profile 计数 + 成就检查。
 */
import { internal } from "../../_generated/api";
import { isTriathlonTemplate, type CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { MutationCtx } from "../../_generated/server";
import { addLeagueXp, type WeeklyLeagueSettlePayload } from "./casualWeeklyLeagueService";

export async function applyWeeklyLeagueOnMatchSettle(
  ctx: MutationCtx,
  args: {
    uid: string;
    def: CasualTournamentDefinition;
    seasonXpOnSettle: number;
    multiplayerFinalRank?: number;
    sessionKind?: "single" | "triathlon";
    now?: number;
    /** 当日 async/专场 bucket League XP 递减乘子（p75 不使用）。 */
    xpDecayMultiplier?: number;
    p75ChallengeSuccess?: boolean;
  }
): Promise<WeeklyLeagueSettlePayload | null> {
  const settle = await addLeagueXp(ctx, {
    uid: args.uid,
    def: args.def,
    seasonXpOnSettle: args.seasonXpOnSettle,
    multiplayerFinalRank: args.multiplayerFinalRank,
    now: args.now,
    xpDecayMultiplier: args.xpDecayMultiplier,
    p75ChallengeSuccess: args.p75ChallengeSuccess,
  });

  const profile = await ctx.db
    .query("casual_weekly_league_profile")
    .withIndex("by_uid", (q) => q.eq("uid", args.uid))
    .unique();
  if (!profile) return settle;

  const now = args.now ?? Date.now();
  const mpRank = args.multiplayerFinalRank;
  const isWin = typeof mpRank === "number" && mpRank === 1;
  const isTriathlon = args.sessionKind === "triathlon" || isTriathlonTemplate(args.def);

  const totalMatchWins = (profile.totalMatchWins ?? 0) + (isWin ? 1 : 0);
  const totalMultiplayerWins =
    (profile.totalMultiplayerWins ?? 0) +
    (isWin && args.def.maxPlayers > 1 ? 1 : 0);
  const totalTriathlonCompletes =
    (profile.totalTriathlonCompletes ?? 0) + (isTriathlon && isWin ? 1 : 0);

  await ctx.db.patch(profile._id, {
    totalMatchWins,
    totalMultiplayerWins,
    totalTriathlonCompletes,
    updatedAt: now,
  });

  await ctx.runMutation(
    internal.service.achievement.casualAchievementService.checkAndUnlockAchievements,
    {
      uid: args.uid,
      event: {
        kind: "match_settled",
        multiplayerWin: isWin && args.def.maxPlayers > 1,
        totalMatchWins,
        totalMultiplayerWins,
        totalTriathlonCompletes,
        peakLeagueTier: profile.peakLeagueTier,
      },
    }
  );

  return settle;
}
