import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  getPortalTournamentDefinition,
  seatGameTypeForTemplate,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import { isCasualAsyncVirtualOpponentUid } from "../settle/casualRunSettlementFill";

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

export type InferredPortalRunMatchShell = {
  humanPlayerCount: number;
  botsSeeded: boolean;
  maxPlayers: number;
  completed: boolean;
  templateId: string;
  tournamentId: Id<"portal_run_tournaments">;
};

export async function listSeatsForMatchId(ctx: DbCtx, matchId: string) {
  return await ctx.db
    .query("portal_run_player_matches")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();
}

export async function inferPortalRunMatchShell(
  ctx: DbCtx,
  matchId: string,
  def: PortalTournamentDefinition,
  fallbackTournamentId: Id<"portal_run_tournaments">
): Promise<InferredPortalRunMatchShell> {
  const seats = await listSeatsForMatchId(ctx, matchId);
  const humanSeats = seats.filter((s) => !isCasualAsyncVirtualOpponentUid(s.uid));
  return {
    humanPlayerCount: Math.max(1, humanSeats.length),
    botsSeeded: seats.some((s) => isCasualAsyncVirtualOpponentUid(s.uid)),
    maxPlayers: def.maxPlayers,
    completed: false,
    templateId: def.tournamentId,
    tournamentId: humanSeats[0]?.tournamentId ?? fallbackTournamentId,
  };
}

/** Read match row, or rebuild it when missing (e.g. table cleared in dashboard). */
export async function getOrRepairPortalRunMatchDoc(
  ctx: MutationCtx,
  matchId: string,
  def: PortalTournamentDefinition,
  fallbackTournamentId: Id<"portal_run_tournaments">
): Promise<Doc<"portal_run_matches"> | null> {
  const existing = await ctx.db.get(matchId as Id<"portal_run_matches">);
  if (existing) return existing;

  const seats = await listSeatsForMatchId(ctx, matchId);
  if (seats.length === 0) return null;

  const inferred = await inferPortalRunMatchShell(ctx, matchId, def, fallbackTournamentId);
  const now = Date.now();
  const doc = {
    tournamentId: inferred.tournamentId,
    templateId: inferred.templateId,
    gameType: seatGameTypeForTemplate(def),
    completed: inferred.completed,
    botsSeeded: inferred.botsSeeded,
    minPlayers: inferred.humanPlayerCount,
    maxPlayers: inferred.maxPlayers,
    humanPlayerCount: inferred.humanPlayerCount,
    openPhase: "ready" as const,
    createdAt: seats[0]?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    await ctx.db.replace(matchId as Id<"portal_run_matches">, doc);
  } catch (e) {
    console.warn("[portal] unable to repair portal_run_matches row", matchId, e);
    return null;
  }

  return await ctx.db.get(matchId as Id<"portal_run_matches">);
}

export async function backfillAllMissingPortalRunMatchShells(ctx: MutationCtx): Promise<{
  scanned: number;
  repaired: number;
  failed: number;
}> {
  const seats = await ctx.db.query("portal_run_player_matches").collect();
  const matchIds = [...new Set(seats.map((s) => s.matchId).filter(Boolean))];
  let repaired = 0;
  let failed = 0;

  for (const matchId of matchIds) {
    const existing = await ctx.db.get(matchId as Id<"portal_run_matches">);
    if (existing) continue;

    const sample = seats.find((s) => s.matchId === matchId);
    if (!sample) continue;

    const def = getPortalTournamentDefinition(sample.templateId);
    if (!def) {
      failed += 1;
      continue;
    }

    const doc = await getOrRepairPortalRunMatchDoc(
      ctx,
      matchId,
      def,
      sample.tournamentId as Id<"portal_run_tournaments">
    );
    if (doc && String(doc._id) === matchId) repaired += 1;
    else failed += 1;
  }

  return { scanned: matchIds.length, repaired, failed };
}
