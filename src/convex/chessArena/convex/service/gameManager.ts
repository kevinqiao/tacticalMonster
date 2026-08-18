import { v } from "convex/values";
import { CHESS_HERO_CATALOG } from "../data/heroCatalog";
import { expandHourlySeed } from "./seedBoss";
import { createGameState, scoreFinishedGame } from "./createGame";
import {
  assertOwnedLoadout,
  catalogAlbum,
  grantRankRoadRoster,
} from "./teamService";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";

async function loadGameDoc(ctx: any, gameId: string) {
  return await ctx.db.query("ca_games").withIndex("by_gameId", (q: any) => q.eq("gameId", gameId)).unique();
}

async function loadOwned(ctx: any, uid: string) {
  return await ctx.db.query("ca_player_heroes").withIndex("by_uid", (q: any) => q.eq("uid", uid)).collect();
}

async function ensureRoster(ctx: any, uid: string) {
  const existing = await loadOwned(ctx, uid);
  const granted = grantRankRoadRoster(uid, existing);
  for (const row of granted) {
    const found = existing.find((item: any) => item.heroId === row.heroId);
    if (!found) {
      await ctx.db.insert("ca_player_heroes", row);
    }
  }
  const dust = await ctx.db.query("ca_player_dust").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
  if (!dust) {
    await ctx.db.insert("ca_player_dust", { uid, dust: 0 });
  }
  return grantRankRoadRoster(uid, existing);
}

export const previewSeed = query({
  args: { seedId: v.string() },
  handler: async (_ctx, { seedId }) => {
    return { ok: true, preview: expandHourlySeed(seedId) };
  },
});

export const getCatalog = query({
  args: {},
  handler: async () => ({ ok: true, heroes: CHESS_HERO_CATALOG }),
});

export const getCodex = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const owned = await loadOwned(ctx, uid);
    const dustRow = await ctx.db.query("ca_player_dust").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
    return {
      ok: true,
      arenaId: "chessArena",
      dust: dustRow?.dust ?? 0,
      cards: catalogAlbum(owned),
    };
  },
});

export const ensurePlayer = mutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const owned = await ensureRoster(ctx, uid);
    return { ok: true, loadout: owned.filter((row) => row.source === "rank_road").map((row) => row.heroId) };
  },
});

export const freezeLoadout = mutation({
  args: { uid: v.string(), loadout: v.array(v.string()) },
  handler: async (ctx, { uid, loadout }) => {
    const owned = await ensureRoster(ctx, uid);
    const frozen = assertOwnedLoadout(owned, loadout);
    return { ok: true, loadout: frozen };
  },
});

export const createGame = internalMutation({
  args: {
    gameId: v.string(),
    seed: v.string(),
    loadout: v.array(v.string()),
    uid: v.optional(v.string()),
    matchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await loadGameDoc(ctx, args.gameId);
    if (existing) {
      const { _id, _creationTime, ...data } = existing;
      return { ok: true, data };
    }
    const game = createGameState({
      gameId: args.gameId,
      seed: args.seed,
      loadout: args.loadout,
      uid: args.uid,
      matchId: args.matchId,
    });
    await ctx.db.insert("ca_games", game);
    await ctx.db.insert("ca_game_events", {
      gameId: game.gameId,
      name: "gameInit",
      time: Date.now(),
      data: { seedId: game.seedId, bossId: game.boss.bossId },
    });
    return { ok: true, data: game };
  },
});

export const createGamePublic = mutation({
  args: {
    gameId: v.string(),
    seed: v.string(),
    loadout: v.array(v.string()),
    uid: v.optional(v.string()),
    matchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await loadGameDoc(ctx, args.gameId);
    if (existing) {
      const { _id, _creationTime, ...data } = existing;
      return { ok: true, data };
    }
    const game = createGameState(args);
    await ctx.db.insert("ca_games", game);
    return { ok: true, data: game };
  },
});

export const findGame = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const game = await loadGameDoc(ctx, gameId);
    if (!game) return null;
    const { _id, _creationTime, ...data } = game;
    return data;
  },
});

export const getGameStatus = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const game = await loadGameDoc(ctx, gameId);
    if (!game) return { status: -1 };
    return { status: game.status, gameId: game.gameId };
  },
});

export const loadGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const game = await loadGameDoc(ctx, gameId);
    if (!game) return { ok: false };
    const { _id, _creationTime, ...data } = game;
    return { ok: true, data };
  },
});

export const findEvents = query({
  args: { gameId: v.string(), lastTime: v.optional(v.number()) },
  handler: async (ctx, { gameId, lastTime }) => {
    const events = await ctx.db.query("ca_game_events").withIndex("by_gameId", (q: any) => q.eq("gameId", gameId)).collect();
    return events.filter((event: any) => !lastTime || event.time > lastTime);
  },
});

export const findReport = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const game = await loadGameDoc(ctx, gameId);
    if (!game) return { ok: false };
    return {
      ok: true,
      data: {
        gameId,
        baseScore: game.score,
        totalScore: game.score,
      },
    };
  },
});

export const finishGame = mutation({
  args: { gameId: v.string(), rounds: v.optional(v.number()) },
  handler: async (ctx, { gameId, rounds }) => {
    const game = await loadGameDoc(ctx, gameId);
    if (!game) return { ok: false };
    const { _id, _creationTime, ...data } = game;
    const score = scoreFinishedGame(data, rounds ?? 4);
    await ctx.db.patch(game._id, { score, status: 3, lastUpdate: new Date().toISOString() });
    return { ok: true, score, data: { ...data, score, status: 3 } };
  },
});

export const grantDust = mutation({
  args: { uid: v.string(), amount: v.number() },
  handler: async (ctx, { uid, amount }) => {
    const row = await ctx.db.query("ca_player_dust").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
    if (!row) {
      await ctx.db.insert("ca_player_dust", { uid, dust: Math.max(0, amount) });
      return { ok: true, dust: Math.max(0, amount) };
    }
    const dust = row.dust + amount;
    await ctx.db.patch(row._id, { dust });
    return { ok: true, dust };
  },
});

export const craftHero = mutation({
  args: { uid: v.string(), heroId: v.string() },
  handler: async (ctx, { uid, heroId }) => {
    const cost = 100;
    const dustRow = await ctx.db.query("ca_player_dust").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
    if (!dustRow || dustRow.dust < cost) {
      return { ok: false, reason: "dust" };
    }
    const owned = await ctx.db
      .query("ca_player_heroes")
      .withIndex("by_uid_hero", (q: any) => q.eq("uid", uid).eq("heroId", heroId))
      .unique();
    await ctx.db.patch(dustRow._id, { dust: dustRow.dust - cost });
    if (owned) {
      await ctx.db.patch(owned._id, { copies: owned.copies + 1 });
    } else {
      await ctx.db.insert("ca_player_heroes", {
        uid,
        heroId,
        copies: 1,
        source: "craft",
        disenchantable: true,
      });
    }
    return { ok: true };
  },
});
