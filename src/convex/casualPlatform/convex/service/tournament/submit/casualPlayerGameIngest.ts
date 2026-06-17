import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  effectiveGameSequence,
  getTournamentDefinition,
  type CasualTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import {
  findPlayerGameByGameId,
  listPlayerGamesForSeat,
  sumPlayerGameScores,
  type PlayerGameRow,
  type PlayerMatchRow,
} from "../shared/casualPlayerGameTypes";

export type ResolvedPlayerGameContext = {
  pg: PlayerGameRow;
  pm: PlayerMatchRow;
  def: CasualTournamentDefinition;
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
  const def = getTournamentDefinition(pm.templateId);
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
  return (await ctx.db.get(next._id)) ?? next;
}

export async function finalizeSeatScoreFromGames(
  ctx: MutationCtx,
  playerMatchId: Id<"casual_run_player_matches">,
  now: number
): Promise<number> {
  const totalScore = await sumPlayerGameScores(ctx, playerMatchId);
  await ctx.db.patch(playerMatchId, {
    score: totalScore,
    status: "finished",
    finishedAt: now,
    updatedAt: now,
  });
  return totalScore;
}
