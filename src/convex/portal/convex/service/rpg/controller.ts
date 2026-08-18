import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import {
  buyTickets,
  catalog,
  claimPass,
  createRpgStore,
  DEFAULT_SCOPE,
  ensureHourlySeed,
  ensureWallet,
  findMatchGame as lookupMatchGame,
  hudSnapshot,
  joinRpg,
  leagueBoard,
  previewTable,
  RpgEngineStore,
  settleRpg,
  submitMatchScore,
  weekKeyAt,
} from "./engine";

type DocMaps = {
  walletIds: Map<string, any>;
  seedIds: Map<string, any>;
  runIds: Map<string, any>;
  matchIds: Map<string, any>;
  weeklyIds: Map<string, any>;
  passIds: Map<string, any>;
};

function keyWallet(uid: string, scopeKey: string) {
  return `${uid}|${scopeKey}`;
}
function keySeed(leagueScopeKey: string, tierId: string, gameType: string, hourKey: string) {
  return `${leagueScopeKey}|${tierId}|${gameType}|${hourKey}`;
}
function keyWeekly(uid: string, scopeKey: string, weekKey: string, hourKey: string) {
  return `${uid}|${scopeKey}|${weekKey}|${hourKey}`;
}

async function hydrate(ctx: any): Promise<{ store: RpgEngineStore; docs: DocMaps }> {
  const store = createRpgStore();
  const docs: DocMaps = {
    walletIds: new Map(),
    seedIds: new Map(),
    runIds: new Map(),
    matchIds: new Map(),
    weeklyIds: new Map(),
    passIds: new Map(),
  };

  const wallets = await ctx.db.query("portal_player_wallets").collect();
  for (const row of wallets) {
    const { _id, _creationTime, ...data } = row;
    store.wallets.set(keyWallet(data.uid, data.scopeKey), data);
    docs.walletIds.set(keyWallet(data.uid, data.scopeKey), _id);
  }
  const seeds = await ctx.db.query("rpg_hourly_seeds").collect();
  for (const row of seeds) {
    const { _id, _creationTime, ...data } = row;
    store.seeds.set(keySeed(data.leagueScopeKey, data.tierId, data.gameType, data.hourKey), data);
    docs.seedIds.set(keySeed(data.leagueScopeKey, data.tierId, data.gameType, data.hourKey), _id);
  }
  const runs = await ctx.db.query("rpg_runs").collect();
  for (const row of runs) {
    const { _id, _creationTime, ...data } = row;
    store.runs.set(data.gameId, data);
    docs.runIds.set(data.gameId, _id);
  }
  const matches = await ctx.db.query("player_matches").collect();
  for (const row of matches) {
    docs.matchIds.set(row.gameId, row._id);
  }
  const weekly = await ctx.db.query("portal_weekly_scores").collect();
  for (const row of weekly) {
    const { _id, _creationTime, ...data } = row;
    store.weekly.set(keyWeekly(data.uid, data.scopeKey, data.weekKey, data.hourKey), data);
    docs.weeklyIds.set(keyWeekly(data.uid, data.scopeKey, data.weekKey, data.hourKey), _id);
  }
  const passes = await ctx.db.query("portal_pass").collect();
  for (const row of passes) {
    const { _id, _creationTime, ...data } = row;
    store.pass.set(keyWallet(data.uid, data.scopeKey), data);
    docs.passIds.set(keyWallet(data.uid, data.scopeKey), _id);
  }
  return { store, docs };
}

async function persist(ctx: any, store: RpgEngineStore, docs: DocMaps, extraMatches?: Array<any>) {
  for (const [key, wallet] of store.wallets) {
    const id = docs.walletIds.get(key);
    if (id) await ctx.db.patch(id, wallet);
    else docs.walletIds.set(key, await ctx.db.insert("portal_player_wallets", wallet));
  }
  for (const [key, seed] of store.seeds) {
    const id = docs.seedIds.get(key);
    if (id) await ctx.db.patch(id, seed);
    else docs.seedIds.set(key, await ctx.db.insert("rpg_hourly_seeds", seed));
  }
  for (const [gameId, run] of store.runs) {
    const id = docs.runIds.get(gameId);
    if (id) await ctx.db.patch(id, run);
    else docs.runIds.set(gameId, await ctx.db.insert("rpg_runs", run));
  }
  for (const [key, row] of store.weekly) {
    const id = docs.weeklyIds.get(key);
    if (id) await ctx.db.patch(id, row);
    else docs.weeklyIds.set(key, await ctx.db.insert("portal_weekly_scores", row));
  }
  for (const [key, row] of store.pass) {
    const id = docs.passIds.get(key);
    if (id) await ctx.db.patch(id, row);
    else docs.passIds.set(key, await ctx.db.insert("portal_pass", row));
  }
  if (extraMatches) {
    for (const match of extraMatches) {
      const id = docs.matchIds.get(match.gameId);
      if (id) await ctx.db.patch(id, match);
      else docs.matchIds.set(match.gameId, await ctx.db.insert("player_matches", match));
    }
  }
}

export const getCatalog = query({
  args: {},
  handler: async () => catalog(),
});

export const getHud = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const { store } = await hydrate(ctx);
    ensureWallet(store, uid);
    return hudSnapshot(store, uid);
  },
});

export const getPreview = query({
  args: {
    tableId: v.string(),
    tierId: v.optional(v.string()),
    hourKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { store } = await hydrate(ctx);
    return previewTable(store, args);
  },
});

export const getLeague = query({
  args: { weekKey: v.optional(v.string()) },
  handler: async (ctx, { weekKey }) => {
    const { store } = await hydrate(ctx);
    return {
      scopeKey: DEFAULT_SCOPE,
      weekKey: weekKey ?? weekKeyAt(),
      board: leagueBoard(store, weekKey),
    };
  },
});

export const buyTicketSku = mutation({
  args: { uid: v.string(), skuId: v.string() },
  handler: async (ctx, args) => {
    const { store, docs } = await hydrate(ctx);
    const result = buyTickets(store, args);
    if (result.ok) await persist(ctx, store, docs);
    return result;
  },
});

export const claimPassNodes = mutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const { store, docs } = await hydrate(ctx);
    const result = claimPass(store, uid);
    await persist(ctx, store, docs);
    return result;
  },
});

export const join = mutation({
  args: {
    uid: v.string(),
    tableId: v.string(),
    loadout: v.array(v.string()),
    gameId: v.optional(v.string()),
    tierId: v.optional(v.string()),
    hourKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { store, docs } = await hydrate(ctx);
    const result = joinRpg(store, args);
    if (result.ok && result.match) {
      await persist(ctx, store, docs, [result.match]);
    }
    return result;
  },
});

export const settle = mutation({
  args: {
    gameId: v.string(),
    score: v.number(),
    success: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { store, docs } = await hydrate(ctx);
    const result = settleRpg(store, args);
    if (result.ok) await persist(ctx, store, docs);
    return result;
  },
});

export const findMatchGame = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const { store } = await hydrate(ctx);
    return lookupMatchGame(store, gameId);
  },
});

export const submitGameScore = internalMutation({
  args: { gameId: v.string(), score: v.number() },
  handler: async (ctx, { gameId, score }) => {
    const { store, docs } = await hydrate(ctx);
    const scored = submitMatchScore(store, gameId, score);
    if (!scored.ok) return { ok: false };
    const settled = settleRpg(store, { gameId, score });
    await persist(ctx, store, docs);
    return { ok: true, ...settled };
  },
});

export const ensureHourPointer = mutation({
  args: {
    gameType: v.union(v.literal("chess"), v.literal("tcg")),
    tierId: v.optional(v.string()),
    hourKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { store, docs } = await hydrate(ctx);
    const pointer = ensureHourlySeed(store, args);
    await persist(ctx, store, docs);
    return pointer;
  },
});

export const bootstrapPlayer = mutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const { store, docs } = await hydrate(ctx);
    ensureWallet(store, uid);
    await persist(ctx, store, docs);
    return hudSnapshot(store, uid);
  },
});
