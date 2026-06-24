import { v } from "convex/values";

import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import type { CasualReferenceScoreQuantiles, PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
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

export function effectiveGameSequence(def: PortalTournamentDefinition): string[] {
  if (def.gameSequence && def.gameSequence.length > 0) {
    return [...def.gameSequence];
  }
  return [def.gameType];
}

export function sessionKindFromDef(def: PortalTournamentDefinition): CasualSessionKind {
  return effectiveGameSequence(def).length > 1 ? "triathlon" : "single";
}

export function isTriathlonTemplate(def: PortalTournamentDefinition): boolean {
  return sessionKindFromDef(def) === "triathlon";
}

export function seatGameTypeForDef(def: PortalTournamentDefinition): string {
  return isTriathlonTemplate(def) ? "triathlon" : def.gameType;
}

export function playerGameId(matchId: string, uid: string, gameIndex: number): string {
  return `game_${matchId}_${uid}_g${gameIndex}`;
}

export type PlayerGameRow = Doc<"portal_run_player_games">;
export type PlayerMatchRow = Doc<"portal_run_player_matches">;

export async function findPlayerGameByGameId(
  ctx: QueryCtx | MutationCtx,
  gameId: string
): Promise<PlayerGameRow | null> {
  return await ctx.db
    .query("portal_run_player_games")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
}

export async function listPlayerGamesForSeat(
  ctx: QueryCtx | MutationCtx,
  playerMatchId: Id<"portal_run_player_matches">
): Promise<PlayerGameRow[]> {
  const rows = await ctx.db
    .query("portal_run_player_games")
    .withIndex("by_playerMatch_gameIndex", (q) => q.eq("playerMatchId", playerMatchId))
    .collect();
  rows.sort((a, b) => a.gameIndex - b.gameIndex);
  return rows;
}

export async function findOpenPlayerGameForSeat(
  ctx: QueryCtx | MutationCtx,
  playerMatchId: Id<"portal_run_player_matches">
): Promise<PlayerGameRow | null> {
  const rows = await listPlayerGamesForSeat(ctx, playerMatchId);
  return rows.find((r) => r.status === "open" || r.status === "replaying") ?? null;
}

export async function sumPlayerGameScores(
  ctx: QueryCtx | MutationCtx,
  playerMatchId: Id<"portal_run_player_matches">
): Promise<number> {
  const rows = await listPlayerGamesForSeat(ctx, playerMatchId);
  return rows.reduce((sum, row) => {
    if (row.score == null || !Number.isFinite(row.score)) return sum;
    return sum + row.score;
  }, 0);
}

/** 取该 seat 首个带 seed 分位的 game 快照（异步分位奖阈值用）。 */
export async function loadSeedScoreQuantilesForSeat(
  ctx: QueryCtx | MutationCtx,
  playerMatchId: Id<"portal_run_player_matches">
): Promise<CasualReferenceScoreQuantiles | undefined> {
  const rows = await listPlayerGamesForSeat(ctx, playerMatchId);
  for (const row of rows) {
    const q = row.seedBinding?.scoreQuantiles;
    if (q) return q;
  }
  return undefined;
}

export { casualMatchSeedBindingValidator };
