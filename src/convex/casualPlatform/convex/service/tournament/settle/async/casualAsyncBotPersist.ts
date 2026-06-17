/** ingest 持久化 bot 分 + 按游戏服 revealAt 注册 scheduler（不写 bot 规划 / rank）。 */
import { v } from "convex/values";
import {
  effectiveGameSequence,
  getTournamentDefinition,
  seatGameTypeForTemplate,
  type CasualTournamentDefinition,
} from "../../../../data/casualTournamentConfigs";
import type { Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import { internalMutation } from "../../../../_generated/server";
import { virtualBotUid } from "../../../../data/casualGameRegistry";
import {
  isCasualAsyncVirtualOpponentUid,
  type AsyncBotFill,
  type SeedVirtualOpponentArgs,
} from "./casualAsyncTypes";
import { installBotRevealSchedulersForMatch } from "./casualAsyncBotReveal";
import {
  listPlayerGamesForSeat,
  playerGameId,
  sessionKindFromDef,
} from "../../shared/casualPlayerGameTypes";

export type { AsyncBotFill, SeedVirtualOpponentArgs } from "./casualAsyncTypes";

async function deleteBotSessionsForMatch(ctx: MutationCtx, matchId: string): Promise<void> {
  const seats = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();
  for (const seat of seats) {
    if (!isCasualAsyncVirtualOpponentUid(seat.uid)) continue;
    const games = await listPlayerGamesForSeat(ctx, seat._id);
    for (const g of games) {
      await ctx.db.delete(g._id);
    }
    await ctx.db.delete(seat._id);
  }
}

async function sampleHumanSeedBindings(
  ctx: MutationCtx,
  matchId: string,
  sequence: string[]
) {
  const humanSeat = (
    await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
      .collect()
  ).find((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  if (!humanSeat) {
    throw new Error("missing_human_seat_for_bot_seed");
  }
  const humanGames = await listPlayerGamesForSeat(ctx, humanSeat._id);
  return sequence.map((gameType, gameIndex) => {
    const row = humanGames.find((g) => g.gameIndex === gameIndex);
    if (!row) {
      throw new Error(`missing_human_game_seed:${gameIndex}`);
    }
    return row.seedBinding;
  });
}

/** 同 mutation 内写入虚拟对手（席位 + player_games） */
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
  const def = getTournamentDefinition(templateId);
  if (!def) {
    throw new Error(`unknown_tournament:${templateId}`);
  }
  const sequence = effectiveGameSequence(def);
  const sessionKind = sessionKindFromDef(def);
  const seedBindings = await sampleHumanSeedBindings(ctx, matchId, sequence);

  if (replaceAllVirtual) {
    await deleteBotSessionsForMatch(ctx, matchId);
  }

  for (const fill of botFills) {
    const slot = fill.rank;
    const uid = virtualBotUid(matchId, slot, matchGameType);
    const revealAt = fill.revealAt;
    const botRevealed =
      revealAt != null && Number.isFinite(revealAt) && revealAt <= updatedAt;

    const seatId = await ctx.db.insert("casual_run_player_matches", {
      matchId,
      tournamentId: runTournamentId,
      templateId,
      uid,
      sessionKind,
      gameType: seatGameTypeForTemplate(def),
      gameId: playerGameId(matchId, uid, sequence.length - 1),
      score: fill.score,
      status: "settled",
      createdAt: updatedAt,
      updatedAt,
    });

    for (let gameIndex = 0; gameIndex < sequence.length; gameIndex++) {
      const isLast = gameIndex >= sequence.length - 1;
      const legFill = fill.legs?.find((l) => l.gameIndex === gameIndex);
      const legScore = legFill?.score ?? (isLast ? fill.score : 0);
      await ctx.db.insert("casual_run_player_games", {
        playerMatchId: seatId,
        matchId,
        uid,
        templateId,
        gameIndex,
        gameType: sequence[gameIndex]!,
        gameId: playerGameId(matchId, uid, gameIndex),
        seedBinding: seedBindings[gameIndex]!,
        score: legScore,
        status: "settled",
        ...(isLast && fill.duration != null ? { duration: fill.duration } : {}),
        ...(legFill?.duration != null ? { duration: legFill.duration } : {}),
        ...(legFill?.rolloutIndex != null
          ? { rolloutIndex: legFill.rolloutIndex }
          : isLast && fill.rolloutIndex != null
            ? { rolloutIndex: fill.rolloutIndex }
            : {}),
        ...(isLast && revealAt != null ? { revealAt } : {}),
        ...(isLast && revealAt != null ? { botRevealed } : {}),
        createdAt: updatedAt,
        updatedAt,
      });
    }
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
        legs: v.optional(
          v.array(
            v.object({
              gameIndex: v.number(),
              score: v.number(),
              rolloutIndex: v.optional(v.number()),
              duration: v.optional(v.number()),
            })
          )
        ),
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
