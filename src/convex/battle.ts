import { v } from "convex/values";
import { GAME_STATUS } from "../model/Constants";
import * as GameEngine from "../service/GameEngine";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { sessionAction } from "./custom/session";
export interface Leaderboard {
  _creationTime: undefined;
  _id: undefined;
  tournamentId: string;
  term?: number;
  uid: string;
  score: number;
  lastUpdate: number;
  reward?: { asset: number; amount: number }[];
  collected?: number;//0-to collect 1-collected
}
export const create = internalMutation({
  args: { tournamentId: v.string(), participants: v.number(), startTime: v.number(), duration: v.number(), dueTime: v.number(), diffcult: v.string(), type: v.optional(v.number()) },
  handler: async (ctx, { tournamentId, participants, startTime, duration, dueTime, diffcult, type }) => {
    return await ctx.db.insert("battle", { status: 0, startTime, tournamentId, participants, duration, dueTime, diffcult, type: type ?? 0 });
  },
});
export const findById = internalQuery({
  args: { battleId: v.id("battle") },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.db.get(battleId);
    return battle
  },
});
export const findDueBattles = internalQuery({
  args: { type: v.number() },
  handler: async (ctx, { type }) => {
    const tosettles = await ctx.db.query("battle").withIndex("by_type_status_duetime", (q) => q.eq("type", type).eq("status", 0).lt("dueTime", Date.now())).order("desc").collect();
    return tosettles
  },
});
export const find = internalQuery({
  args: { battleId: v.id("battle") },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.db.get(battleId);
    if (battle && battle.diffcult) {
      const diffcult = await ctx.db.query("diffcult")
        .filter((q) => q.eq(q.field("id"), battle.diffcult)).unique();
      if (!diffcult) return;
      const games = await ctx.db
        .query("games")
        .filter((q) => q.eq(q.field("battleId"), battleId))
        .collect();
      const gameModels = games.map((game) => {
        if (game) return { ...game, gameId: game._id, _id: undefined, _creationTime: undefined };
      })

      return { ...battle, games: gameModels, id: battleId, _id: undefined, _creationTime: undefined, data: diffcult.data }
    }
  },
});


export const findMyBattles = sessionAction({
  args: { to: v.optional(v.number()) },
  handler: async (ctx, { to }) => {

    const mybattles: { tournamentId: string; type: number; battleId?: string; leaderboard?: Leaderboard, time: number; reward?: any; participants: number; status: number }[] = [];
    if (ctx.user) {

      const { uid } = ctx.user;
      const games = await ctx.runQuery(internal.games.findUserGames, { uid, type: 0, status: GAME_STATUS.SETTLED, to });

      for (const game of games) {
        const battle = await ctx.runQuery(internal.battle.findById, { battleId: game.battleId as Id<"battle"> })

        // const battle = await ctx.runMutation(internal.battle.settle, { battleId: game.battleId as Id<"battle"> })
        if (!battle) continue;
        if (battle.rewards && battle.rewards.length > 0) {
          const reward = battle.rewards.find((r: { uid: string; gameId: string; rank: number; collected?: number; assets: { asset: number; amount: number }[] }) => r.uid === uid);
          mybattles.push({ tournamentId: battle.tournamentId, type: 0, battleId: battle._id, time: game.startTime ?? battle._creationTime, reward, participants: battle.rewards.length, status: 1 })
        } else
          mybattles.push({ tournamentId: battle.tournamentId, type: 0, battleId: battle._id, time: game.startTime ?? battle._creationTime, participants: battle.participants, status: 0 })
      }
      // console.log("game size:" + games.length + " battle size:" + mybattles.length)
      const tournaments = await ctx.runQuery(internal.tournaments.findByType, { type: 0 })
      games?.sort((a, b) => b._creationTime - a._creationTime);

      const from = games.length >= 20 ? games[games.length - 1]._creationTime : undefined
      const leaderboards: any[] = await ctx.runQuery(internal.leaderboard.findByUser, { uid, from, to, size: 20 - games.length })

      for (const leaderboard of leaderboards) {
        const tournament = tournaments.find((t) => t.id === leaderboard.tournamentId);
        if (!tournament) continue;
        const { tournamentId, term, score } = leaderboard;
        leaderboard.rank = await ctx.runQuery(internal.leaderboard.findRankByScore, { score, tournamentId, term })
        const status = tournament.currentTerm === leaderboard.term ? (tournament.settled ?? 0) : 1
        mybattles.push({ tournamentId: leaderboard.tournamentId, type: tournament.type, battleId: leaderboard._id, time: leaderboard.lastUpdate, leaderboard: { ...leaderboard, _creationTime: undefined, id: leaderboard._id, _id: undefined }, participants: -1, status })
      }

      return mybattles
    }
  },
});

export const findReport = sessionAction({
  args: { battleId: v.string() },
  handler: async (ctx, { battleId }): Promise<any> => {
    const bid = battleId as Id<"battle">;
    const battle: any = await ctx.runMutation(internal.battle.settle, { battleId: bid });
    const res: any = { id: bid, toCollect: 0 };
    if (battle) {
      const reports: { player?: { name: string; avatar: number }; uid: string; gameId: string; score?: number; rank?: number; points?: number; assets?: { asset: number; amount: number }[] }[] = [];
      if (battle.rewards && battle.rewards.length > 0) {
        for (const reward of battle.rewards) {
          const gameReport: any = { ...reward }
          if (reward.uid) {
            const player = await ctx.runQuery(internal.user.find, { id: reward.uid as Id<"user"> });
            if (player) {
              gameReport['player'] = { name: player.name, avatar: player.avatar };
            }
          }
          reports.push(gameReport)
        }
      } else {
        for (const game of battle.games) {
          const gameReport: any = { gameId: game._id, score: game.score }
          if (game.uid) {
            const player = await ctx.runQuery(internal.user.find, { id: game.uid as Id<"user"> });
            if (player) {
              gameReport['player'] = { name: player.name, avatar: player.avatar };
              gameReport['uid'] = player.uid;
              gameReport['gameId'] = game._id;
            }
          }
          reports.push(gameReport)
        }
      }
      return { ...res, games: reports, leaderboards: battle.leaderboards }
    }
  },
});


export const findBattle = sessionAction({
  args: { battleId: v.string() },
  handler: async (ctx, { battleId }): Promise<any> => {
    const bid = battleId as Id<"battle">;
    const battle: any = await ctx.runMutation(internal.battle.settle, { battleId: bid });
    if (battle) {
      battle.games.forEach((g: any) => {
        g.gameId = g._id;
        g._id = undefined;
      })
      const difficult = await ctx.runQuery(internal.diffcult.find, { id: battle.diffcult });
      battle.data = difficult?.data;
      const tournament = await ctx.runQuery(internal.tournaments.findById, { id: battle.tournamentId });
      if (!tournament) throw new Error("tournament not found");
      const players: { uid: string; name?: string; avatar?: number; gameId: string }[] = [];
      for (const game of battle.games) {
        const player = await ctx.runQuery(internal.user.find, { id: game.uid as Id<"user"> });
        if (player && player.uid) {
          const { uid, name, avatar } = player
          players.push({ uid, name, avatar, gameId: game.gameId })
        }
      }
      battle.players = players;
      if (tournament.battle.players !== 2) {
        const game = battle.games.find((game: any) => game.uid === ctx.user.uid);
        battle.games = [game];
      }
      return { ...battle, id: bid, _id: undefined, _creationTime: undefined }
    }
  },
});
export const schedule = action({
  handler: async (ctx) => {
    const types = [0, 1, 2];
    for (const type of types) {
      const battles = await ctx.runQuery(internal.battle.findDueBattles, { type });
      console.log(type + ":" + battles.length)
      for (const battle of battles) {
        await ctx.runMutation(internal.battle.settle, { battleId: battle._id })
      }
    }
  },
});

export const settle = internalMutation({
  args: { battleId: v.string() },
  handler: async (ctx, { battleId }) => {
    const battle: any = await ctx.db.get(battleId as Id<"battle">);
    battle.games = await ctx.db
      .query("games").withIndex("by_battle", (q) => q.eq("battleId", battleId)).collect();
    if (battle && !battle.rewards) {
      const tournament = await ctx.db.query("tournament").filter((q) => q.eq(q.field("id"), battle.tournamentId)).order("asc").unique();
      if (!tournament) return;
      const timeout = (battle.startTime + battle.duration) <= Date.now() ? 1 : 0;
      if (timeout || battle.games.every((game: any) => game.result)) {
        const games = await ctx.db
          .query("games")
          .filter((q) => q.eq(q.field("battleId"), battle._id))
          .collect();
        for (const game of games) {
          if (!game.result) {
            GameEngine.settleGame(game);
            await ctx.db.patch(game._id, { result: game.result, score: game.score, status: GAME_STATUS.SETTLED });
          } else
            await ctx.db.patch(game._id, { status: GAME_STATUS.SETTLED });
        }
        const leaderboards: { type: number; score: number; rank: number; uid: string }[] = [];
        if (tournament.type === 0) {
          const settledRewards: { uid: string; gameId: string; rank: number, score: number, assets: { asset: number; amount: number }[] }[] = [];
          games.sort((a: any, b: any) => b.score - a.score).forEach((r: any, index: number) => {
            const reward = tournament.rewards.find((w) => w.rank === index);
            if (reward) {
              settledRewards.push({ uid: r.uid, gameId: r._id, rank: index + 1, score: r.score, assets: reward.assets });
            } else
              settledRewards.push({ uid: r.uid, gameId: r._id, rank: index + 1, score: r.score, assets: [] });
          })
          battle.rewards = settledRewards;
        } else if (tournament.type === 1 && games.length === 2 && typeof games[0].score !== 'undefined' && typeof games[1].score !== 'undefined') {
          const gamescores: { uid: string, score: number }[] = [];
          const battleReward = tournament.battle.reward;
          if (battleReward)
            if (games[0]['score'] > games[1]['score']) {
              gamescores.push({ uid: games[0]['uid'], score: battleReward.win });
              gamescores.push({ uid: games[1]['uid'], score: battleReward.fail });
            } else if (games[0]['score'] < games[1]['score']) {
              gamescores.push({ uid: games[0]['uid'], score: battleReward.fail });
              gamescores.push({ uid: games[1]['uid'], score: battleReward.win });
            } else {
              gamescores.push({ uid: games[0]['uid'], score: battleReward.draw });
              gamescores.push({ uid: games[1]['uid'], score: battleReward.draw });
            }
          for (const gamescore of gamescores) {
            const board = { type: 1, score: 0, rank: -1, uid: gamescore.uid };
            const leaderboard = await ctx.db
              .query("leaderboard").withIndex("by_tournament_term_uid", (q) => q.eq("tournamentId", tournament.id).eq("term", tournament.currentTerm).eq("uid", gamescore.uid)).unique();
            if (leaderboard) {
              board.score = leaderboard.score + gamescore.score
              await ctx.db.patch(leaderboard._id, { score: board.score, lastUpdate: Date.now() })
            } else {
              board.score = gamescore.score;
              await ctx.db.insert("leaderboard", { tournamentId: tournament.id, uid: gamescore.uid, score: gamescore.score, term: tournament.currentTerm, lastUpdate: Date.now() });
            }
            const ranks = await ctx.db
              .query("leaderboard").withIndex("by_tournament_term_score", (q) => q.eq("tournamentId", tournament.id).eq("term", tournament.currentTerm).gte("score", board.score)).order("desc").collect();
            board.rank = ranks.length - 1;
            leaderboards.push(board)
          }
          battle.leaderboards = leaderboards;
        } else if (tournament.type === 2 && games.length === 1) {
          const board = { type: 1, score: 0, rank: -1, uid: games[0].uid };
          const leaderboard = await ctx.db
            .query("leaderboard").withIndex("by_tournament_term_uid", (q) => q.eq("tournamentId", tournament.id).eq("term", tournament.currentTerm).eq("uid", games[0]['uid'])).unique();
          if (leaderboard) {
            board.score = Math.max(games[0].score ?? 0, leaderboard.score);
            await ctx.db.patch(leaderboard._id, { score: board.score, lastUpdate: Date.now() })
          } else {
            board.score = games[0]['score'] ?? 0;
            await ctx.db.insert("leaderboard", { tournamentId: tournament.id, uid: games[0]['uid'], score: board.score, term: tournament.currentTerm, lastUpdate: Date.now() });
          }
          const ranks = await ctx.db
            .query("leaderboard").withIndex("by_tournament_term_score", (q) => q.eq("tournamentId", tournament.id).eq("term", tournament.currentTerm).gte("score", board.score)).order("desc").collect();
          board.rank = ranks.length - 1;
          leaderboards.push(board);
          battle.leaderboards = leaderboards;
        }
        await ctx.db.patch(battle._id, { rewards: battle.rewards, leaderboards: battle.leaderboards, status: GAME_STATUS.SETTLED })
      }

    }
    return battle
  },
});
