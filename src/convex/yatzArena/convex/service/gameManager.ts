import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import {
  YATZ_MATCH_TIME_LIMIT_SEC,
  type YatzCategory,
  YatzGameStatus,
  type YatzGameState,
} from "../types/YatzTypes";
import {
  createInitialGameState,
  pickCategory as applyPickCategory,
  refreshTotalScore,
  rollDice,
  toggleHold as applyToggleHold,
} from "./YatzGameEngine";
import { parseCasualRunGameId } from "./casualGameLifecycle";
import type { YatzRecordedStep } from "./seedPool/yatzRecordedOpTypes";

function appendRecordedStep(game: YatzGameState, step: YatzRecordedStep): void {
  const now = Date.now();
  const pacingMs =
    step.pacingMs ??
    (game.lastOpAt != null ? Math.max(50, now - game.lastOpAt) : undefined);
  const withPacing =
    pacingMs != null && step.pacingMs == null ? { ...step, pacingMs } : step;
  game.recordedOps = [...(game.recordedOps ?? []), withPacing];
  game.lastOpAt = now;
}

function ensurePlayStarted(game: YatzGameState): number {
  if (game.playStartedAt == null) {
    game.playStartedAt = Date.now();
  }
  return game.playStartedAt;
}

export class GameManager {
  private dbCtx: { db: any };
  private game: YatzGameState | null;

  constructor(dbCtx: { db: any }) {
    this.dbCtx = dbCtx;
    this.game = null;
  }

  async load(gameId: string): Promise<YatzGameState | undefined> {
    const game = await this.dbCtx.db
      .query("yatz_game")
      .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
      .unique();
    if (!game) return;
    this.game = {
      ...game,
      _creationTime: undefined,
      recordedOps: game.recordedOps ?? [],
    } as YatzGameState;
    return this.game;
  }

  async save(data: Partial<YatzGameState>) {
    if (!this.game) return;
    Object.assign(this.game, data);
    this.game.lastUpdate = Date.now();
    await this.dbCtx.db.patch(this.game._id, {
      dice: this.game.dice,
      held: this.game.held,
      rollCount: this.game.rollCount,
      roundIndex: this.game.roundIndex,
      categoryScores: this.game.categoryScores,
      yahtzeeBonus: this.game.yahtzeeBonus,
      yahtzeeScored: this.game.yahtzeeScored,
      manifestPolicyVersion: this.game.manifestPolicyVersion,
      score: this.game.score,
      status: this.game.status,
      playStartedAt: this.game.playStartedAt,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
      lastUpdate: this.game.lastUpdate,
    });
  }

  progressSnapshot() {
    return {
      score: this.game?.score ?? 0,
      roundIndex: this.game?.roundIndex ?? 0,
      gameStatus: this.game?.status ?? -1,
    };
  }

  async createGame(seed?: string, gameId?: string): Promise<YatzGameState | null> {
    const resolvedSeed = seed ?? gameId ?? "default";
    const game = createInitialGameState(resolvedSeed, gameId ?? "");
    const gid = await this.dbCtx.db.insert("yatz_game", {
      ...game,
      categoryScores: {},
      recordedOps: [],
    });
    if (!gid) return null;
    this.game = { ...game, _id: gid, recordedOps: [] } as YatzGameState;
    return this.game;
  }

  async roll() {
    if (!this.game) return { ok: false as const, error: "no_game" };
    const result = rollDice(this.game);
    if (!result.ok) return result;
    Object.assign(this.game, result.state);
    appendRecordedStep(this.game, { op: "roll" });
    const playStartedAt = ensurePlayStarted(this.game);
    await this.save({
      dice: this.game.dice,
      held: this.game.held,
      rollCount: this.game.rollCount,
      playStartedAt,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
    });
    return { ok: true as const, ...this.progressSnapshot(), dice: this.game.dice, held: this.game.held, rollCount: this.game.rollCount };
  }

  async toggleHoldIndex(index: number) {
    if (!this.game) return { ok: false as const, error: "no_game" };
    const result = applyToggleHold(this.game, index);
    if (!result.ok) return result;
    Object.assign(this.game, result.state);
    appendRecordedStep(this.game, { op: "toggle_hold", index });
    await this.save({
      held: this.game.held,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
    });
    return { ok: true as const, held: this.game.held, ...this.progressSnapshot() };
  }

  async pickCategoryForRound(category: YatzCategory) {
    if (!this.game) return { ok: false as const, error: "no_game" };
    const result = applyPickCategory(this.game, category);
    if (!result.ok) return result;
    Object.assign(this.game, result.state);
    appendRecordedStep(this.game, { op: "pick_category", category });
    await this.save({
      dice: this.game.dice,
      held: this.game.held,
      rollCount: this.game.rollCount,
      roundIndex: this.game.roundIndex,
      categoryScores: this.game.categoryScores,
      yahtzeeBonus: this.game.yahtzeeBonus,
      yahtzeeScored: this.game.yahtzeeScored,
      score: this.game.score,
      status: this.game.status,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
    });
    return {
      ok: true as const,
      ...this.progressSnapshot(),
      categoryScores: this.game.categoryScores,
      completed: this.game.status === YatzGameStatus.COMPLETED,
    };
  }

  async concedeGame() {
    if (!this.game) return { ok: false as const };
    const st = this.game.status;
    if (st === YatzGameStatus.COMPLETED || st === YatzGameStatus.CANCELLED) {
      return { ok: true as const, ...this.progressSnapshot() };
    }
    appendRecordedStep(this.game, { op: "concede" });
    this.game.score = refreshTotalScore(this.game);
    await this.save({
      status: YatzGameStatus.CANCELLED,
      score: this.game.score,
      recordedOps: this.game.recordedOps,
      lastOpAt: this.game.lastOpAt,
    });
    return { ok: true as const, ...this.progressSnapshot() };
  }
}

const yatzCategoryArg = v.union(
  v.literal("ones"),
  v.literal("twos"),
  v.literal("threes"),
  v.literal("fours"),
  v.literal("fives"),
  v.literal("sixes"),
  v.literal("three_kind"),
  v.literal("four_kind"),
  v.literal("full_house"),
  v.literal("small_straight"),
  v.literal("large_straight"),
  v.literal("yahtzee"),
  v.literal("chance")
);

export const createGame = internalMutation({
  args: {
    seed: v.optional(v.string()),
    gameId: v.string(),
  },
  handler: async (ctx, { seed, gameId }) => {
    try {
      let existing = await ctx.db
        .query("yatz_game")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      if (existing) {
        if (existing.recordedOps === undefined) {
          await ctx.db.patch(existing._id, { recordedOps: [] });
          existing = { ...existing, recordedOps: [] };
        }
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
          const dueTime = now + YATZ_MATCH_TIME_LIMIT_SEC * 1000;
          try {
            const jobId = await ctx.scheduler.runAfter(
              YATZ_MATCH_TIME_LIMIT_SEC * 1000,
              internal.service.casualGameTimeoutAction.checkCasualGameTimeoutAndIngest,
              { gameRowId: game._id, gameId, uid: parsed.uid }
            );
            await ctx.db.patch(game._id, {
              dueTime,
              casualTimeoutScheduledId: jobId,
            });
          } catch (scheduleErr) {
            console.warn("[yatz] casual timeout schedule failed", gameId, scheduleErr);
          }
        }
      }

      const fresh = await gameManager.load(gameId);
      return { ok: true as const, data: fresh ?? game, events: [] };
    } catch (err) {
      console.error("[yatz] createGame failed", gameId, err);
      return { ok: false as const, error: "create_failed" as const };
    }
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
      .query("yatz_game")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { ok: true as const, deleted: rows.length };
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
      .query("yatz_game")
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
      status: row.status,
    };
  },
});

export const roll = mutation({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const gameManager = new GameManager(ctx);
    await gameManager.load(gameId);
    return await gameManager.roll();
  },
});

export const toggleHold = mutation({
  args: { gameId: v.string(), index: v.number() },
  handler: async (ctx, { gameId, index }) => {
    const gameManager = new GameManager(ctx);
    await gameManager.load(gameId);
    return await gameManager.toggleHoldIndex(index);
  },
});

export const pickCategory = mutation({
  args: { gameId: v.string(), category: yatzCategoryArg },
  handler: async (ctx, { gameId, category }) => {
    const gameManager = new GameManager(ctx);
    await gameManager.load(gameId);
    return await gameManager.pickCategoryForRound(category);
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

export default GameManager;
