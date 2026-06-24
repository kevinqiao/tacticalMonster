import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  effectiveGameSequence,
  seatGameTypeForTemplate,
  type CasualTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import type { CasualMatchSeedBinding } from "../join/casualMatchSeedBinding";
import { scheduleOpenRunSettleCheckForPlayerGame } from "../settle/casualOpenRunSettleCheck";
import { isCasualAsyncVirtualOpponentUid } from "../settle/async/casualAsyncTypes";
import {
  playerGameId,
  sessionKindFromDef,
  type CasualPlayerGameStatus,
} from "./casualPlayerGameTypes";

export type SeedBindingByGameIndex = Record<string, CasualMatchSeedBinding>;

export async function insertPlayerSessionForUid(
  ctx: MutationCtx,
  args: {
    matchId: string;
    runTournamentId: string;
    templateId: string;
    def: CasualTournamentDefinition;
    uid: string;
    seedBindingsByIndex: SeedBindingByGameIndex;
    now: number;
  }
): Promise<{ playerMatchId: Id<"casual_run_player_matches">; openGameId: string; openGameType: string }> {
  const { matchId, runTournamentId, templateId, def, uid, seedBindingsByIndex, now } = args;
  const sequence = effectiveGameSequence(def);
  const sessionKind = sessionKindFromDef(def);
  const openGameId = playerGameId(matchId, uid, 0);

  const playerMatchId = await ctx.db.insert("casual_run_player_matches", {
    matchId,
    tournamentId: runTournamentId,
    templateId,
    uid,
    sessionKind,
    gameId: openGameId,
    gameType: seatGameTypeForTemplate(def),
    status: "open",
    createdAt: now,
    updatedAt: now,
  });

  for (let gameIndex = 0; gameIndex < sequence.length; gameIndex++) {
    const gameType = sequence[gameIndex]!;
    const seedBinding = seedBindingsByIndex[String(gameIndex)];
    if (!seedBinding) {
      throw new Error(`missing_seed_binding:${gameIndex}`);
    }
    const status: CasualPlayerGameStatus = gameIndex === 0 ? "open" : "locked";
    const openGameRowId = await ctx.db.insert("casual_run_player_games", {
      playerMatchId,
      matchId,
      uid,
      templateId,
      gameIndex,
      gameType,
      gameId: playerGameId(matchId, uid, gameIndex),
      seedBinding,
      status,
      createdAt: now,
      updatedAt: now,
    });
    if (
      gameIndex === 0 &&
      status === "open" &&
      !isCasualAsyncVirtualOpponentUid(uid)
    ) {
      await scheduleOpenRunSettleCheckForPlayerGame(ctx, {
        playerGameId: openGameRowId,
        gameId: playerGameId(matchId, uid, gameIndex),
        uid,
        gameType,
        createdAt: now,
      });
    }
  }

  return { playerMatchId, openGameId, openGameType: sequence[0]! };
}

export async function deletePlayerSessionsForMatch(
  ctx: MutationCtx,
  matchId: string
): Promise<void> {
  const playerGames = await ctx.db
    .query("casual_run_player_games")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();
  for (const pg of playerGames) {
    await ctx.db.delete(pg._id);
  }

  const playerMatches = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();
  for (const pm of playerMatches) {
    await ctx.db.delete(pm._id);
  }
}
