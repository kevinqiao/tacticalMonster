import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getHandler } from "./handler";

import { applyRules } from "./ruleEngine";
import { getTorontoDate } from "./utils";

export const getAvailableTournaments = query({
  args: { gameType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未登录");
    const uid = identity.subject;

    const player = await ctx.db
      .query("players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .first();
    if (!player) throw new Error("玩家不存在");

    const now = getTorontoDate();
    const today = now.localDate.toISOString().split("T")[0];
    const tournamentTypes = await ctx.db.query("tournament_types").collect();
    const limits = await ctx.db
      .query("player_tournament_limits")
      .withIndex("by_uid_game_date", (q) =>
        q.eq("uid", uid).eq("gameType", args.gameType || "solitaire").eq("date", today)
      )
      .collect();

    return tournamentTypes
      .filter((tt) => !tt.defaultConfig.isSubscribedRequired || player.isSubscribed)
      .filter((tt) => !args.gameType || tt.defaultConfig.entryFee?.ticket?.gameType === args.gameType)
      .map((tt) => {
        const limit = limits.find((l) => l.tournamentType === tt.typeId);
        const max = player.isSubscribed
          ? tt.defaultConfig.limits.maxParticipations.subscribed
          : tt.defaultConfig.limits.maxParticipations.default;
        return {
          tournamentType: tt.typeId,
          name: tt.name,
          description: tt.description,
          entryFee: tt.defaultConfig.entryFee,
          remainingParticipations: limit ? max - limit.participationCount : max,
          isSubscribedRequired: tt.defaultConfig.isSubscribedRequired || false,
        };
      });
  },
});

export const joinTournament = mutation({
  args: { uid: v.string(), gameType: v.string(), tournamentType: v.string() },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .first();
    if (!player) throw new Error("玩家不存在");
    const season = await ctx.db
      .query("seasons")
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!season) throw new Error("无有效赛季");

    const handler = getHandler(args.tournamentType);
    await handler.validateJoin(ctx, { ...args, player, season });
    const result = await handler.join(ctx, { ...args, player, season });

    await ctx.db.patch(player._id, { lastActive: getTorontoDate().iso });
    return result;
  },
});

export const submitScore = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    uid: v.string(),
    gameType: v.string(),
    score: v.number(),
    gameData: v.any(),
    propsUsed: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("无效锦标赛");

    const handler = getHandler(tournament.tournamentType);
    await handler.validateScore(ctx, args);
    const result = await handler.submitScore(ctx, args);

    if (tournament.tournamentType === "daily_special") {
      const player = await ctx.db
        .query("players")
        .withIndex("by_uid", (q) => q.eq("uid", args.uid))
        .first();
      const inventory = await ctx.db
        .query("player_inventory")
        .withIndex("by_uid", (q) => q.eq("uid", args.uid))
        .first();
      const playerSeason = await ctx.db
        .query("player_seasons")
        .withIndex("by_uid_season", (q) => q.eq("uid", args.uid).eq("seasonId", tournament.seasonId))
        .first();
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_uid", (q) => q.eq("tournamentId", args.tournamentId).eq("uid", args.uid))
        .collect();

      const { rank, finalReward } = await applyRules(ctx, {
        tournament,
        uid: args.uid,
        matches,
        player,
        inventory,
        playerSeason,
      });

      return { ...result, rank, rewards: finalReward, shared: !!matches.find((m) => m.uid === args.uid && m.score >= tournament.config.rules.scoreThreshold) };
    }

    return result;
  },
});

export const getTournamentHistory = query({
  args: { gameType: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未登录");
    const uid = identity.subject;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .filter((q) => !args.gameType || q.eq(q.field("gameType"), args.gameType))
      .order("desc")
      .take(args.limit || 10)


    const tournamentIds = Array.from(new Set(matches.map((m) => m.tournamentId)));
    const tournaments = await Promise.all(
      tournamentIds.map((id) => ctx.db.get(id))
    );

    return await Promise.all(
      tournamentIds.map(async (tournamentId) => {
        const tournament = tournaments.find((t: any) => t._id === tournamentId);
        if (!tournament) return null;
        const playerMatches = matches.filter((m) => m.tournamentId === tournamentId);
        const highestScore = Math.max(...playerMatches.map((m) => m.score));
        const rank = await getPlayerRank(ctx, tournamentId, uid, tournament.config.rules.ranking);
        const rewards = tournament.config.rewards.find((r: any) =>
          tournament.config.rules.ranking === "threshold"
            ? (highestScore >= tournament.config.rules.scoreThreshold ? r.rankRange[0] === 1 : r.rankRange[0] === 2)
            : rank >= r.rankRange[0] && rank <= r.rankRange[1]
        );

        return {
          tournamentId,
          gameType: tournament.gameType,
          tournamentType: tournament.tournamentType,
          status: tournament.status,
          highestScore,
          rank,
          rewards: rewards || {},
          createdAt: tournament.createdAt,
        };
      })
    ).then((results) => results.filter((r) => r !== null));
  },
});

export const getTournamentLeaderboard = query({
  args: { tournamentId: v.id("tournaments"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("无效锦标赛");

    const matches = await ctx.db
      .query("matches")
      .filter((q: any) => q.eq(q.field("tournamentId"), args.tournamentId))
      .collect();

    const playerScores = new Map<string, { highestScore: number; segmentName: string }>();
    for (const match of matches) {
      const current = playerScores.get(match.uid) || { highestScore: 0, segmentName: "Bronze" };
      if (match.score > current.highestScore) {
        const player = await ctx.db
          .query("players")
          .withIndex("by_uid", (q) => q.eq("uid", match.uid))
          .first();
        playerScores.set(match.uid, { highestScore: match.score, segmentName: player?.segmentName || "Bronze" });
      }
    }

    const sortedPlayers = [...playerScores.entries()]
      .sort((a, b) => b[1].highestScore - a[1].highestScore)
      .slice(0, args.limit || 10)
      .map(([uid, { highestScore, segmentName }], index) => ({
        uid,
        highestScore,
        rank: index + 1,
        segmentName,
      }));

    return sortedPlayers;
  },
});

export const settleTournaments = mutation({
  handler: async (ctx) => {
    const now = getTorontoDate();
    const tournaments = await ctx.db
      .query("tournaments")
      .filter((q) => q.lte(q.field("endTime"), now.iso))
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    let settledCount = 0;
    for (const tournament of tournaments) {
      const handler = getHandler(tournament.tournamentType);
      await handler.settle(ctx, tournament._id);
      settledCount++;
    }

    return { settledCount };
  },
});

async function getPlayerRank(ctx: any, tournamentId: string, uid: string, rankingType: string): Promise<number> {
  const matches = await ctx.db
    .query("matches")
    .filter((q: any) => q.eq(q.field("tournamentId"), tournamentId))
    .collect();

  if (rankingType === "threshold") {
    const playerScore = Math.max(...matches.filter((m: any) => m.uid === uid).map((m: any) => m.score));
    const tournament = await ctx.db.get(tournamentId);
    return playerScore >= tournament.config.rules.scoreThreshold ? 1 : 2;
  } else {
    const playerScores = new Map<string, number>();
    for (const match of matches) {
      const currentScore = playerScores.get(match.uid) || 0;
      playerScores.set(match.uid, Math.max(currentScore, match.score));
    }
    const sortedPlayers = [...playerScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([uid], index) => ({ uid, rank: index + 1 }));
    return sortedPlayers.find((p) => p.uid === uid)?.rank || sortedPlayers.length + 1;
  }
}