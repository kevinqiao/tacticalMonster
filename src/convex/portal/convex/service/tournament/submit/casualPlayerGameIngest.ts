import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  effectiveGameSequence,
  getPortalTournamentDefinition,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import {
  findPlayerGameByGameId,
  listPlayerGamesForSeat,
  sumPlayerGameScores,
  type PlayerGameRow,
  type PlayerMatchRow,
} from "../shared/casualPlayerGameTypes";
import { scheduleOpenRunSettleCheckForPlayerGame } from "../settle/casualOpenRunSettleCheck";
import { resolveReplayKeepBestScore } from "../replay/casualReplayKeepBestScore";

export type ResolvedPlayerGameContext = {
  pg: PlayerGameRow;
  pm: PlayerMatchRow;
  def: PortalTournamentDefinition;
  gameType: string;
  sequence: string[];
  isLastGame: boolean;
};

export async function resolvePlayerGameIngestContext(
  ctx: MutationCtx,
  uid: string,
  matchGameId: string
): Promise<
  | { ok: true; ctx: ResolvedPlayerGameContext }
  | { ok: false; error: string }
> {
  const pg = await findPlayerGameByGameId(ctx, matchGameId);
  if (!pg) {
    return { ok: false, error: "unknown_match_game" };
  }
  if (pg.uid !== uid) {
    return { ok: false, error: "forbidden" };
  }
  const pm = await ctx.db.get(pg.playerMatchId);
  if (!pm) {
    return { ok: false, error: "unknown_match_game" };
  }
  const def = getPortalTournamentDefinition(pm.templateId);
  if (!def) {
    return { ok: false, error: "bad_tournament" };
  }
  const sequence = effectiveGameSequence(def);
  const isLastGame = pg.gameIndex >= sequence.length - 1;
  return {
    ok: true,
    ctx: {
      pg,
      pm,
      def,
      gameType: pg.gameType,
      sequence,
      isLastGame,
    },
  };
}

export async function unlockNextPlayerGame(
  ctx: MutationCtx,
  args: {
    pm: PlayerMatchRow;
    pg: PlayerGameRow;
    now: number;
  }
): Promise<PlayerGameRow | null> {
  const games = await listPlayerGamesForSeat(ctx, args.pm._id);
  const next = games.find((g) => g.gameIndex === args.pg.gameIndex + 1);
  if (!next) return null;
  await ctx.db.patch(next._id, { status: "open", updatedAt: args.now });
  await ctx.db.patch(args.pm._id, {
    gameId: next.gameId,
    updatedAt: args.now,
  });
  await scheduleOpenRunSettleCheckForPlayerGame(ctx, {
    playerGameId: next._id,
    gameId: next.gameId,
    uid: next.uid,
    gameType: next.gameType,
    createdAt: args.now,
  });
  return (await ctx.db.get(next._id)) ?? next;
}

export async function finalizeSeatScoreFromGames(
  ctx: MutationCtx,
  playerMatchId: Id<"portal_run_player_matches">,
  now: number
): Promise<number> {
  const pm = await ctx.db.get(playerMatchId);
  const rawTotal = await sumPlayerGameScores(ctx, playerMatchId);
  const { score: finalScore, keptBaseline } = resolveReplayKeepBestScore({
    rawScore: rawTotal,
    replayBaselineScore: pm?.replayBaselineScore,
  });

  // 再战分更低被丢弃时，单腿局把 pg.score 同步回保留分，避免战报/展示仍显示较差分
  if (keptBaseline) {
    const games = await listPlayerGamesForSeat(ctx, playerMatchId);
    if (games.length === 1 && games[0]) {
      await ctx.db.patch(games[0]._id, {
        score: finalScore,
        updatedAt: now,
      });
    }
  }

  await ctx.db.patch(playerMatchId, {
    score: finalScore,
    status: "finished",
    finishedAt: now,
    updatedAt: now,
    replayBaselineScore: undefined,
  });
  return finalScore;
}
