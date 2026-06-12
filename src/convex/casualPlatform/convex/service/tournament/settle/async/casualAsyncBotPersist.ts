/** ingest 持久化 bot 分 + 按游戏服 revealAt 注册 scheduler（不写 bot 规划 / rank）。 */
import { v } from "convex/values";
import type { CasualTournamentDefinition } from "../../../../data/casualTournamentConfigs";
import type { Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import { internalMutation } from "../../../../_generated/server";
import {
  getCasualGameRegistration,
  virtualBotGameId,
  virtualBotUid,
} from "../../../../data/casualGameRegistry";
import {
  isCasualAsyncVirtualOpponentUid,
  type AsyncBotFill,
  type SeedVirtualOpponentArgs,
} from "./casualAsyncTypes";
import { installBotRevealSchedulersForMatch } from "./casualAsyncBotReveal";

export type { AsyncBotFill, SeedVirtualOpponentArgs } from "./casualAsyncTypes";

/** 同 mutation 内写入虚拟对手（勿 `runMutation`，否则父事务读榜可能缺行） */
export async function seedCasualAsyncVirtualOpponentsCore(
  ctx: MutationCtx,
  args: SeedVirtualOpponentArgs
): Promise<void> {
  const {
    templateId,
    runTournamentId,
    matchId,
    matchGameType,
    botFills,
    updatedAt,
    replaceAllVirtual = true,
  } = args;
  const reg = getCasualGameRegistration(matchGameType);
  if (!reg) {
    throw new Error(`unregistered_game_type:${matchGameType}`);
  }

  if (replaceAllVirtual) {
    const prior = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
      .collect();
    for (const row of prior) {
      if (isCasualAsyncVirtualOpponentUid(row.uid)) {
        await ctx.db.delete(row._id);
      }
    }
  }

  for (const fill of botFills) {
    const slot = fill.rank;
    const score = fill.score;
    const uid = virtualBotUid(matchId, slot, matchGameType);
    const gameId = virtualBotGameId(matchId, slot, matchGameType);
    const existing = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    const revealAt = fill.revealAt;
    const botRevealed =
      revealAt != null && Number.isFinite(revealAt) && revealAt <= updatedAt;
    if (existing) {
      await ctx.db.patch(existing._id, {
        score,
        status: "settled",
        updatedAt,
        ...(fill.duration != null ? { duration: fill.duration } : {}),
        rolloutIndex: fill.rolloutIndex,
        ...(revealAt != null ? { revealAt } : {}),
        ...(revealAt != null ? { botRevealed } : {}),
      });
      continue;
    }
    await ctx.db.insert("casual_run_player_matches", {
      matchId,
      tournamentId: runTournamentId,
      templateId,
      uid,
      gameId,
      gameType: matchGameType,
      score,
      status: "settled",
      ...(fill.duration != null ? { duration: fill.duration } : {}),
      ...(fill.rolloutIndex != null ? { rolloutIndex: fill.rolloutIndex } : {}),
      ...(revealAt != null ? { revealAt } : {}),
      ...(revealAt != null ? { botRevealed } : {}),
      createdAt: updatedAt,
      updatedAt,
    });
  }
}

export const seedCasualAsyncVirtualOpponents = internalMutation({
  args: {
    templateId: v.string(),
    runTournamentId: v.string(),
    matchId: v.string(),
    matchGameType: v.string(),
    botFills: v.array(
      v.object({
        rank: v.number(),
        score: v.number(),
        duration: v.optional(v.number()),
        rolloutIndex: v.optional(v.number()),
        revealAt: v.optional(v.number()),
      })
    ),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await seedCasualAsyncVirtualOpponentsCore(ctx, args);
    return { ok: true as const };
  },
});

/** ingest：写入 bot 分（rank 由分数排序在展示/发奖时计算） */
export async function applyAsyncBotFillPlanToMatch(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    matchGameType: string;
    botFills: AsyncBotFill[];
    updatedAt: number;
    replaceAllVirtual?: boolean;
  }
): Promise<void> {
  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  if (!matchDoc) return;

  await seedCasualAsyncVirtualOpponentsCore(ctx, {
    templateId: args.templateId,
    runTournamentId: args.runTournamentId,
    matchId: args.matchId,
    matchGameType: args.matchGameType,
    botFills: args.botFills,
    updatedAt: args.updatedAt,
    replaceAllVirtual: args.replaceAllVirtual ?? true,
  });
  if (!matchDoc.botsSeeded) {
    await ctx.db.patch(matchDoc._id, {
      botsSeeded: true,
      updatedAt: args.updatedAt,
    });
  }

  if (args.def.maxPlayers > 1) {
    await installBotRevealSchedulersForMatch(ctx, {
      matchId: args.matchId,
      updatedAt: args.updatedAt,
    });
  }
}
