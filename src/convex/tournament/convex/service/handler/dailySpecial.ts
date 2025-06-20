import { applyRules, deductProps } from "../ruleEngine";
import { getTorontoDate } from "../utils";
import { baseHandler, TournamentHandler } from "./base";

export const dailySpecialHandler: TournamentHandler = {
  ...baseHandler,
  async submitScore(ctx, args) {
    const now = getTorontoDate();
    const tournament = await ctx.db.get(args.tournamentId);
    const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", args.uid)).first();
    await deductProps(ctx, { uid: args.uid, gameType: args.gameType, propsUsed: args.propsUsed, inventory });

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", args.tournamentId).eq("uid", args.uid))
      .collect();
    const currentAttempt = matches.find((m: any) => !m.completed);
    if (!currentAttempt) throw new Error("未找到未完成尝试");

    await ctx.db.patch(currentAttempt._id, {
      score: args.score,
      completed: true,
      gameData: args.gameData,
      propsUsed: args.propsUsed,
      updatedAt: now.iso,
    });

    await ctx.db.patch(tournament._id, { status: "completed", updatedAt: now.iso });
    const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", args.uid)).first();
    const playerSeason = await ctx.db
      .query("player_seasons")
      .withIndex("by_uid_season", (q: any) => q.eq("uid", args.uid).eq("seasonId", tournament.seasonId))
      .first();

    await applyRules(ctx, { tournament, uid: args.uid, matches, player, inventory, playerSeason });

    return { success: true, attemptNumber: currentAttempt.attemptNumber };
  },
};