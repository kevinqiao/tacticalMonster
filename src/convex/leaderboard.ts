import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { sessionQuery } from "./custom/session";


export const find = internalQuery({
  args: { id: v.id("leaderboard") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
});
export const findRankByScore = internalQuery({
  args: { score: v.number(), tournamentId: v.string(), term: v.number() },
  handler: async (ctx, { score, tournamentId, term }) => {
    const ranks = await ctx.db
      .query("leaderboard").withIndex("by_tournament_term_score", (q) => q.eq("tournamentId", tournamentId).eq("term", term).gte("score", score)).order("desc").collect();
    return ranks.length;
  },
});
export const findUserRank = internalQuery({
  args: { uid: v.string(), tournamentId: v.string(), term: v.number() },
  handler: async (ctx, { uid, tournamentId, term }) => {
    const leaderboard = await ctx.db.query("leaderboard").withIndex("by_tournament_term_uid", (q) => q.eq("tournamentId", tournamentId).eq("term", term).gte("uid", uid)).unique();
    if (leaderboard) {
      const ranks = await ctx.db
        .query("leaderboard").withIndex("by_tournament_term_score", (q) => q.eq("tournamentId", tournamentId).eq("term", term).gte("score", leaderboard.score)).order("desc").collect();
      return ranks.length;
    }
    return null;
  },
});
export const findByUser = internalQuery({
  args: { uid: v.string(), from: v.optional(v.number()), to: v.optional(v.number()), size: v.number() },
  handler: async (ctx, { uid, from, to, size }) => {
    console.log(from + ":" + to + ":" + size)
    let leaderboards: any[] = [];
    const end = to ?? Date.now();
    if (from) {
      leaderboards = await ctx.db.query("leaderboard").withIndex("by_user", (q) => q.eq("uid", uid)).filter((q) => q.and(q.gte(q.field("_creationTime"), from), q.lte(q.field("_creationTime"), end))).order("desc").collect();
    } else {
      leaderboards = await ctx.db.query("leaderboard").withIndex("by_user", (q) => q.eq("uid", uid)).filter((q) => q.lte(q.field("_creationTime"), end)).order("desc").take(size);
      console.log("size:" + leaderboards.length)
    }
    return leaderboards
  },
});

export const update = internalMutation({
  args: { boardId: v.id("leaderboard"), score: v.number() },
  handler: async (ctx, { boardId, score }) => {
    await ctx.db.patch(boardId, { score });
  },
});

export const findByTournament = sessionQuery({
  args: { tournamentId: v.string(), term: v.optional(v.number()) },
  handler: async (ctx, { tournamentId, term }) => {
    console.log("tournamentId:" + tournamentId + " term:" + term)
    // const tournament = await ctx.db.get(tournamentId as Id<"tournament">)
    const tournament = await ctx.db.query("tournament").filter((q) => q.eq(q.field("id"), tournamentId)).unique();
    if (!ctx.user || !tournament) return;
    const result: any = { leadboards: [], rank: -1 };
    const uid = ctx.user.uid;
    const boardItem = await ctx.db
      .query("leaderboard").withIndex("by_tournament_term_uid", (q) => q.eq("tournamentId", tournament.id).eq("term", term ?? tournament.currentTerm).eq("uid", uid)).unique();
    if (boardItem) {
      const ranks = await ctx.db
        .query("leaderboard").withIndex("by_tournament_term_score", (q) => q.eq("tournamentId", tournament.id).eq("term", term ?? tournament.currentTerm).gte("score", boardItem.score)).order("desc").collect();
      result['rank'] = ranks.length;
      result['reward'] = boardItem.reward;
      result['collected'] = boardItem['collected']
    }
    const leadboards = await ctx.db
      .query("leaderboard").withIndex("by_tournament_term_score", (q) => q.eq("tournamentId", tournament.id).eq("term", term ?? tournament.currentTerm)).order("desc").take(20);
    let rank = 0;
    for (const leadboard of leadboards) {
      const player = await ctx.db.get(leadboard.uid as Id<"user">);
      if (player) {
        result['leadboards'].push({ player: { name: player.name, uid: leadboard.uid, avatar: player.avatar }, rank: ++rank, score: leadboard.score })
      }
    }
    return result
  },
});


export const collect = internalMutation({
  args: { uid: v.string(), leaderboardId: v.id("leaderboard") },
  handler: async (ctx, { uid, leaderboardId }) => {
    const leaderboard = await ctx.db.get(leaderboardId);
    if (leaderboard && leaderboard.uid === uid && !leaderboard.collected) {
      await ctx.db.patch(leaderboardId, { collected: 1 })
    }
  },
})
