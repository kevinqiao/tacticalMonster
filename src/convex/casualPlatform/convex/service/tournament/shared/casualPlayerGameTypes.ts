import { v } from "convex/values";

import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import type { CasualTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { casualMatchSeedBindingValidator } from "../join/casualMatchSeedBinding";

export const casualSessionKindValidator = v.union(v.literal("single"), v.literal("triathlon"));

export type CasualSessionKind = "single" | "triathlon";

export const casualPlayerGameStatusValidator = v.union(
  v.literal("locked"),
  v.literal("open"),
  v.literal("finished"),
  v.literal("confirmed"),
  v.literal("settled"),
  v.literal("replaying")
);

export type CasualPlayerGameStatus =
  | "locked"
  | "open"
  | "finished"
  | "confirmed"
  | "settled"
  | "replaying";

export function effectiveGameSequence(def: CasualTournamentDefinition): string[] {
  if (def.gameSequence && def.gameSequence.length > 0) {
    return [...def.gameSequence];
  }
  return [def.gameType];
}

export function sessionKindFromDef(def: CasualTournamentDefinition): CasualSessionKind {
  return effectiveGameSequence(def).length > 1 ? "triathlon" : "single";
}

export function isTriathlonTemplate(def: CasualTournamentDefinition): boolean {
  return sessionKindFromDef(def) === "triathlon";
}

export function seatGameTypeForDef(def: CasualTournamentDefinition): string {
  return isTriathlonTemplate(def) ? "triathlon" : def.gameType;
}

export function playerGameId(matchId: string, uid: string, gameIndex: number): string {
  return `game_${matchId}_${uid}_g${gameIndex}`;
}

export type PlayerGameRow = Doc<"casual_run_player_games">;
export type PlayerMatchRow = Doc<"casual_run_player_matches">;

export async function findPlayerGameByGameId(
  ctx: QueryCtx | MutationCtx,
  gameId: string
): Promise<PlayerGameRow | null> {
  return await ctx.db
    .query("casual_run_player_games")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
}

export async function listPlayerGamesForSeat(
  ctx: QueryCtx | MutationCtx,
  playerMatchId: Id<"casual_run_player_matches">
): Promise<PlayerGameRow[]> {
  const rows = await ctx.db
    .query("casual_run_player_games")
    .withIndex("by_playerMatch_gameIndex", (q) => q.eq("playerMatchId", playerMatchId))
    .collect();
  rows.sort((a, b) => a.gameIndex - b.gameIndex);
  return rows;
}

export async function findOpenPlayerGameForSeat(
  ctx: QueryCtx | MutationCtx,
  playerMatchId: Id<"casual_run_player_matches">
): Promise<PlayerGameRow | null> {
  const rows = await listPlayerGamesForSeat(ctx, playerMatchId);
  return rows.find((r) => r.status === "open" || r.status === "replaying") ?? null;
}

export async function sumPlayerGameScores(
  ctx: QueryCtx | MutationCtx,
  playerMatchId: Id<"casual_run_player_matches">
): Promise<number> {
  const rows = await listPlayerGamesForSeat(ctx, playerMatchId);
  return rows.reduce((sum, row) => {
    if (row.score == null || !Number.isFinite(row.score)) return sum;
    return sum + row.score;
  }, 0);
}

export { casualMatchSeedBindingValidator };
