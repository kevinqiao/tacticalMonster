import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { parseCasualRunGameId } from "./casualGameLifecycle";
import { Match3GameStatus, Match3GameState, Match3TurnStep } from "../types/Match3Types";
import { Match3GameEngine } from "./Match3GameEngine";
import { Match3RuleManager } from "./Match3RuleManager";
import {
  buildMatch3GameReport,
  MATCH3_MATCH_TIME_LIMIT_SEC,
} from "./match3Scoring";
import { GameInteractionPhase } from "../types/Match3Types";
import type { Match3RecordedStep } from "./seedPool/match3RecordedOpTypes";

function ensurePlayStarted(game: Match3GameState): number {
  if (game.playStartedAt == null) {
    game.playStartedAt = Date.now();
  }
  return game.playStartedAt;
}

function appendRecordedStep(game: Match3GameState, step: Match3RecordedStep): void {
  const now = Date.now();
  const pacingMs =
    step.pacingMs ??
    (game.lastOpAt != null ? Math.max(50, now - game.lastOpAt) : undefined);
  const withPacing =
    pacingMs != null && step.pacingMs == null ? { ...step, pacingMs } : step;
  game.recordedOps = [...(game.recordedOps ?? []), withPacing];
  game.lastOpAt = now;
}

export class GameManager {
  private dbCtx: any;
  private game: Match3GameState | null;

  constructor(dbCtx: any) {
    this.dbCtx = dbCtx;
    this.game = null;
  }

  async load(gameId: string): Promise<Match3GameState | undefined> {
    const game = await this.dbCtx.db
      .query("match3_game")
      .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
      .unique();
    if (!game) return;
    this.game = { ...game, _creationTime: undefined } as Match3GameState;
    return this.game;
  }

  async save(data: Partial<Match3GameState>) {
    if (!this.game) return;
    if (data.grid) this.game.grid = data.grid;
    if (data.status !== undefined) this.game.status = data.status;
    if (data.moves !== undefined) this.game.moves = data.moves;
    if (data.score !== undefined) this.game.score = data.score;
    if (data.playStartedAt !== undefined) this.game.playStartedAt = data.playStartedAt;
    if (data.refillCounter !== undefined) this.game.refillCounter = data.refillCounter;
    if (data.recordedOps !== undefined) this.game.recordedOps = data.recordedOps;
    if (data.lastOpAt !== undefined) this.game.lastOpAt = data.lastOpAt;
    this.game.lastUpdate = Date.now();

    await this.dbCtx.db.patch(this.game._id, {
      grid: this.game.grid,
      status: this.game.status,
      moves: this.game.moves,
      score: this.game.score,
      playStartedAt: this.game.playStartedAt,
      refillCounter: this.game.refillCounter,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
      lastUpdate: this.game.lastUpdate,
    });
  }

  progressSnapshot(): { score: number; moves: number; gameStatus: number } {
    return {
      score: this.game?.score ?? 0,
      moves: this.game?.moves ?? 0,
      gameStatus: this.game?.status ?? -1,
    };
  }

  async createGame(seed?: string, gameId?: string): Promise<Match3GameState | null> {
    const game = Match3GameEngine.createGame(seed, gameId ?? "");
    const gid = await this.dbCtx.db.insert("match3_game", {
      ...game,
      recordedOps: [],
    });
    if (!gid) return null;
    this.game = { ...game, _id: gid, recordedOps: [] } as Match3GameState;
    return this.game;
  }

  async swap(
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ): Promise<
    | ({ ok: true; turnScript: Match3TurnStep[] } & ReturnType<GameManager["progressSnapshot"]>)
    | { ok: false; error: string }
  > {
    if (!this.game) return { ok: false, error: "no_game" };

    const rm = new Match3RuleManager(this.game, GameInteractionPhase.idle);
    if (!rm.isValidSwap(r1, c1, r2, c2)) {
      return { ok: false, error: "invalid_swap" };
    }

    const result = Match3GameEngine.applySwap(this.game, r1, c1, r2, c2);
    if (!result.ok) return result;

    appendRecordedStep(this.game, { op: "swap", r1, c1, r2, c2 });

    const playStartedAt = ensurePlayStarted(this.game);
    await this.save({
      grid: result.grid,
      moves: result.moves,
      score: result.score,
      refillCounter: result.refillCounter,
      status: Match3GameStatus.PLAYING,
      playStartedAt,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
    });

    const rmAfter = new Match3RuleManager(this.game, GameInteractionPhase.idle);
    if (rmAfter.isGameOver()) {
      await this.save({ status: Match3GameStatus.COMPLETED });
    }

    return {
      ok: true,
      turnScript: result.turnScript,
      ...this.progressSnapshot(),
    };
  }

  async concedeGame(): Promise<
    ({ ok: true } & ReturnType<GameManager["progressSnapshot"]>) | { ok: false }
  > {
    if (!this.game) return { ok: false };
    const st = this.game.status;
    if (st === Match3GameStatus.COMPLETED || st === Match3GameStatus.CANCELLED) {
      return { ok: true, ...this.progressSnapshot() };
    }
    appendRecordedStep(this.game, { op: "concede" });
    await this.save({
      status: Match3GameStatus.CANCELLED,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
    });
    return { ok: true, ...this.progressSnapshot() };
  }

  buildScoreReport(nowMs: number = Date.now()) {
    const baseScore = Math.max(0, Math.floor(this.game?.score ?? 0));
    const playStartedAt = this.game?.playStartedAt;
    const elapsedSec =
      playStartedAt == null
        ? 0
        : Math.max(0, Math.min(MATCH3_MATCH_TIME_LIMIT_SEC, (nowMs - playStartedAt) / 1000));
    return buildMatch3GameReport(baseScore, elapsedSec);
  }
}

export const createGame = internalMutation({
  args: {
    seed: v.optional(v.string()),
    gameId: v.string(),
  },
  handler: async (ctx, { seed, gameId }) => {
    try {
      const existing = await ctx.db
        .query("match3_game")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      if (existing) {
        return { ok: true as const, data: existing, events: [] };
      }

      const gameManager = new GameManager(ctx);
      const game = await gameManager.createGame(seed, gameId);
      if (!game) {
        return { ok: false as const, error: "insert_failed" as const };
      }

      if (gameId.startsWith("game_")) {
        const parsed = parseCasualRunGameId(gameId);
        if (parsed?.uid && game._id) {
          const now = Date.now();
          const dueTime = now + MATCH3_MATCH_TIME_LIMIT_SEC * 1000;
          try {
            const jobId = await ctx.scheduler.runAfter(
              MATCH3_MATCH_TIME_LIMIT_SEC * 1000,
              internal.service.casualGameTimeoutAction.checkCasualGameTimeoutAndIngest,
              { gameRowId: game._id, gameId, uid: parsed.uid }
            );
            await ctx.db.patch(game._id, {
              dueTime,
              casualTimeoutScheduledId: jobId,
            });
          } catch (scheduleErr) {
            console.warn("[match3] casual timeout schedule failed", gameId, scheduleErr);
          }
        }
      }

      const fresh = await gameManager.load(gameId);
      return { ok: true as const, data: fresh ?? game, events: [] };
    } catch (err) {
      console.error("[match3] createGame failed", gameId, err);
      return { ok: false as const, error: "create_failed" as const };
    }
  },
});

export const loadGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gameManager = new GameManager(ctx);
    const game = await gameManager.load(gameId);
    return { ok: !!game, data: game };
  },
});

export const findGame = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gameManager = new GameManager(ctx);
    return await gameManager.load(gameId);
  },
});

export const deleteCasualGameForReplay = internalMutation({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, {
      gameId,
    });
    const rows = await ctx.db
      .query("match3_game")
      .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { ok: true as const, deleted: rows.length };
  },
});

export const findReport = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gameManager = new GameManager(ctx);
    const game = await gameManager.load(gameId);
    if (!game) return { ok: false as const };
    const report = gameManager.buildScoreReport();
    return { ok: true as const, data: { gameId, ...report } };
  },
});

export const getGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gameManager = new GameManager(ctx);
    return await gameManager.load(gameId);
  },
});

export const getRecordedOps = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const row = await ctx.db
      .query("match3_game")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!row) {
      return { ok: false as const, error: "not_found" as const };
    }
    return {
      ok: true as const,
      gameId: row.gameId,
      seedId: row.seed,
      steps: row.recordedOps ?? [],
      score: row.score,
      moves: row.moves,
      status: row.status,
    };
  },
});

export const getGameStatus = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gameManager = new GameManager(ctx);
    const game = await gameManager.load(gameId);
    return { status: game?.status ?? -1 };
  },
});

export const concedeGame = mutation({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gameManager = new GameManager(ctx);
    await gameManager.load(gameId);
    return await gameManager.concedeGame();
  },
});

export const swap = mutation({
  args: {
    gameId: v.string(),
    r1: v.number(),
    c1: v.number(),
    r2: v.number(),
    c2: v.number(),
  },
  handler: async (ctx, { gameId, r1, c1, r2, c2 }) => {
    const gameManager = new GameManager(ctx);
    await gameManager.load(gameId);
    return await gameManager.swap(r1, c1, r2, c2);
  },
});

export default GameManager;
