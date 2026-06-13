import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { generateTowerSeedFromId } from "../shared/towerSeedCatalog";
import type { TowerRecordedOp } from "../types/TowerArenaTypes";
import { TowerGamePhase, TowerGameStatus } from "../types/TowerArenaTypes";
import { parseCasualRunGameId } from "./casualGameLifecycle";
import { applyTowerOp, buildInitialState } from "./towerOpCodec";
import {
  buildTowerCashGameReport,
  syncScore,
  TOWER_MATCH_TIME_LIMIT_SEC,
} from "./towerScoring";

type DbGame = {
  _id: string;
  gameId: string;
  seedId: string;
  phase: string;
  status: number;
  lives: number;
  gold: number;
  currentWave: number;
  wavesCleared: number;
  towers: Array<{ slotId: string; towerId: string; level: number }>;
  unlockedTowerIds: string[];
  score: number;
  elapsedSimMs: number;
  moves: number;
  playStartedAt?: number;
  dueTime?: number;
  casualTimeoutScheduledId?: string;
};

function rowToState(row: DbGame) {
  const seed = generateTowerSeedFromId(row.seedId);
  return {
    seed,
    phase: row.phase as TowerGamePhase,
    status: row.status as TowerGameStatus,
    lives: row.lives,
    gold: row.gold,
    currentWave: row.currentWave,
    wavesCleared: row.wavesCleared,
    towers: row.towers,
    unlockedTowerIds: row.unlockedTowerIds,
    score: row.score,
    elapsedSimMs: row.elapsedSimMs,
    moves: row.moves,
    playStartedAt: row.playStartedAt,
  };
}

export class GameManager {
  private ctx: any;
  private row: DbGame | null = null;
  private state: ReturnType<typeof rowToState> | null = null;

  constructor(ctx: any) {
    this.ctx = ctx;
  }

  async load(gameId: string) {
    const row = await this.ctx.db
      .query("game")
      .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
      .unique();
    if (!row) return null;
    this.row = row as DbGame;
    this.state = rowToState(this.row);
    return { ...this.row, seed: this.state.seed };
  }

  private ensurePlayStarted() {
    if (this.state && this.state.playStartedAt == null) {
      this.state.playStartedAt = Date.now();
    }
  }

  async persist() {
    if (!this.row || !this.state) return;
    syncScore(this.state);
    await this.ctx.db.patch(this.row._id, {
      phase: this.state.phase,
      status: this.state.status,
      lives: this.state.lives,
      gold: this.state.gold,
      currentWave: this.state.currentWave,
      wavesCleared: this.state.wavesCleared,
      towers: this.state.towers,
      unlockedTowerIds: this.state.unlockedTowerIds,
      score: this.state.score,
      elapsedSimMs: this.state.elapsedSimMs,
      moves: this.state.moves,
      playStartedAt: this.state.playStartedAt,
      lastUpdate: Date.now(),
    });
  }

  progressSnapshot() {
    return {
      score: this.state?.score ?? 0,
      moves: this.state?.moves ?? 0,
      gameStatus: this.state?.status ?? -1,
      phase: this.state?.phase,
      lives: this.state?.lives,
      gold: this.state?.gold,
      currentWave: this.state?.currentWave,
      wavesCleared: this.state?.wavesCleared,
    };
  }

  async applyOp(op: TowerRecordedOp) {
    if (!this.state) return { ok: false as const, error: "no_game" as const };
    this.ensurePlayStarted();
    const res = applyTowerOp(this.state, op);
    if (!res.ok) return res;
    await this.persist();
    return { ok: true as const, ...this.progressSnapshot() };
  }

  buildScoreReport() {
    if (!this.state) {
      return buildTowerCashGameReport({
        lives: 0,
        wavesCleared: 0,
        gold: 0,
        elapsedSimMs: 0,
        seed: generateTowerSeedFromId("tower-pool:v1:0"),
      });
    }
    return buildTowerCashGameReport({
      lives: this.state.lives,
      wavesCleared: this.state.wavesCleared,
      gold: this.state.gold,
      elapsedSimMs: this.state.elapsedSimMs,
      seed: this.state.seed,
    });
  }
}

export const createGame = internalMutation({
  args: { seed: v.optional(v.string()), gameId: v.string() },
  handler: async (ctx, { seed, gameId }) => {
    try {
      const existing = await ctx.db
        .query("game")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      if (existing) {
        return { ok: true as const, data: existing, events: [] };
      }

      const seedId = seed?.trim() || "tower-pool:v1:0";
      const initial = buildInitialState(generateTowerSeedFromId(seedId));
      const gid = await ctx.db.insert("game", {
        gameId,
        seedId,
        phase: initial.phase,
        status: TowerGameStatus.CREATED,
        lives: initial.lives,
        gold: initial.gold,
        currentWave: initial.currentWave,
        wavesCleared: initial.wavesCleared,
        towers: initial.towers,
        unlockedTowerIds: initial.unlockedTowerIds,
        score: initial.score,
        elapsedSimMs: initial.elapsedSimMs,
        moves: initial.moves,
      });

      if (gameId.startsWith("game_")) {
        const parsed = parseCasualRunGameId(gameId);
        if (parsed?.uid) {
          const now = Date.now();
          const dueTime = now + TOWER_MATCH_TIME_LIMIT_SEC * 1000;
          try {
            const jobId = await ctx.scheduler.runAfter(
              TOWER_MATCH_TIME_LIMIT_SEC * 1000,
              internal.service.casualGameTimeoutAction.checkCasualGameTimeoutAndIngest,
              { gameRowId: gid, gameId, uid: parsed.uid }
            );
            await ctx.db.patch(gid, { dueTime, casualTimeoutScheduledId: jobId });
          } catch (e) {
            console.warn("[tower] timeout schedule failed", gameId, e);
          }
        }
      }

      const fresh = await ctx.db.get(gid);
      return { ok: true as const, data: fresh, events: [{ name: "ready" }] };
    } catch (err) {
      console.error("[tower] createGame failed", gameId, err);
      return { ok: false as const, error: "create_failed" as const };
    }
  },
});

export const findGame = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gm = new GameManager(ctx);
    return await gm.load(gameId);
  },
});

export const deleteCasualGameForReplay = internalMutation({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });
    const rows = await ctx.db
      .query("game")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return { ok: true as const, deleted: rows.length };
  },
});

export const getGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gm = new GameManager(ctx);
    return await gm.load(gameId);
  },
});

export const findReport = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gm = new GameManager(ctx);
    await gm.load(gameId);
    return { ok: true as const, data: { gameId, ...gm.buildScoreReport() } };
  },
});

function opMutation(
  name: string,
  buildOp: (args: Record<string, string>) => TowerRecordedOp
) {
  return mutation({
    args: { gameId: v.string(), slotId: v.optional(v.string()), towerId: v.optional(v.string()) },
    handler: async (ctx, args) => {
      const gm = new GameManager(ctx);
      await gm.load(args.gameId);
      if (name === "concede") return gm.applyOp({ op: "concede" });
      if (name === "start_wave") return gm.applyOp({ op: "start_wave" });
      if (name === "place" && args.slotId && args.towerId) {
        return gm.applyOp({ op: "place", slotId: args.slotId, towerId: args.towerId });
      }
      if (name === "upgrade" && args.slotId) {
        return gm.applyOp({ op: "upgrade", slotId: args.slotId });
      }
      if (name === "sell" && args.slotId) {
        return gm.applyOp({ op: "sell", slotId: args.slotId });
      }
      return { ok: false as const, error: "invalid_args" as const };
    },
  });
}

export const placeTower = opMutation("place", () => ({ op: "place", slotId: "", towerId: "" }));
export const upgradeTower = opMutation("upgrade", () => ({ op: "upgrade", slotId: "" }));
export const sellTower = opMutation("sell", () => ({ op: "sell", slotId: "" }));
export const startWave = opMutation("start_wave", () => ({ op: "start_wave" }));
export const concedeGame = opMutation("concede", () => ({ op: "concede" }));
