import { applyRules } from "../ruleEngine";
import { getTorontoDate } from "../utils";
import { baseHandler, TournamentHandler } from "./base";

export const multiAttemptRankedHandler: TournamentHandler = {
  ...baseHandler,
  async settle(ctx, tournamentId) {
    const now = getTorontoDate();
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) throw new Error("无效锦标赛");

    await ctx.db.patch(tournament._id, { status: "completed", updatedAt: now.iso });
    const matches = await ctx.db
      .query("matches")
      .filter((q: any) => q.eq(q.field("tournamentId"), tournamentId))
      .collect();

    const playerUids = Array.from(new Set(matches.map((m: any) => m.uid)));
    for (const uid of playerUids) {
      const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
      const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
      const playerSeason = await ctx.db
        .query("player_seasons")
        .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", tournament.seasonId))
        .first();
      const playerMatches = matches.filter((m: any) => m.uid === uid);

      await applyRules(ctx, { tournament, uid, matches: playerMatches, player, inventory, playerSeason });
    }
  },
};