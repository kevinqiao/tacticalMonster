import { v } from "convex/values";

import { authedQuery } from "../../../custom/session";

const DEFAULT_LIMIT = 50;

/** 玩家在某活动下的全部 Portal 对局记录（portal_run_player_matches SSOT）。 */
export const listCampaignPlayHistory = authedQuery({
  args: {
    campaignId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { campaignId, limit }) => {
    const uid = ctx.uid;
    const n = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), 100);

    const rows = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();

    return rows
      .filter((pm) => pm.campaignId === campaignId)
      .sort((a, b) => {
        const aAt = a.finishedAt ?? a.updatedAt ?? a.createdAt;
        const bAt = b.finishedAt ?? b.updatedAt ?? b.createdAt;
        return bAt - aAt;
      })
      .slice(0, n)
      .map((pm) => ({
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        gameType: pm.gameType,
        score: pm.score ?? null,
        rank: pm.rank ?? null,
        status: pm.status,
        playedAt: pm.finishedAt ?? pm.updatedAt ?? pm.createdAt,
        startedAt: pm.createdAt,
      }));
  },
});
