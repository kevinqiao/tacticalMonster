/**
 * Portal join charging — free entry only, no wallet/activity/season.
 */
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  effectiveEntryBilling,
  getPortalTournamentDefinition,
  isPeriodScopedTournament,
  type PortalTournamentDefinition,
  type EntryCost,
} from "../../../data/portalTournamentConfigs";
import { effectiveGameSequence } from "../../../data/portalTournamentConfigs";
import { insertPlayerSessionForUid } from "../shared/casualSessionOpenCore";
import type { CasualMatchSeedBinding } from "./casualMatchSeedBinding";

export const RUN_TOURNAMENT_OPEN = 0;
export const RUN_TOURNAMENT_COMPLETED = 1;
export const RUN_PLAYER_TOURNAMENT_OPEN = 0;
export const RUN_PLAYER_TOURNAMENT_COMPLETED = 1;

export async function applyCasualJoinEntryCharge(
  ctx: MutationCtx,
  uid: string,
  _tournamentId: string,
  def: PortalTournamentDefinition,
  opts?: { skipEntryCharge?: boolean }
): Promise<
  | { ok: true; vouchersCharged?: number; coinsCharged?: number; gemsCharged?: number }
  | { ok: false; error: string }
> {
  const player = await ctx.runQuery(internal.dao.portalPlayerDao.findByUid, { uid });
  if (!player) return { ok: false as const, error: "no_player" };
  if (def.entry.kind !== "none" && !opts?.skipEntryCharge) {
    return { ok: false as const, error: "entry_not_free" };
  }
  return { ok: true as const };
}

export async function applyCasualJoinEntryChargeWithInstance(
  ctx: MutationCtx,
  uid: string,
  tournamentId: string,
  def: PortalTournamentDefinition,
  opts?: { skipEntryCharge?: boolean }
) {
  return applyCasualJoinEntryCharge(ctx, uid, tournamentId, def, opts);
}

export async function refundCasualJoinEntryCharge(): Promise<void> {
  return;
}

export async function insertCasualRunDocumentsForHumans(
  ctx: MutationCtx,
  args: {
    templateId: string;
    def: PortalTournamentDefinition;
    humanUids: string[];
    matchId: string;
    runTournamentId: Id<"portal_run_tournaments">;
    matchDocId: Id<"portal_run_matches">;
    now: number;
    seedBinding?: CasualMatchSeedBinding;
    seedBindingsByGameIndex?: Map<number, CasualMatchSeedBinding>;
  }
): Promise<void> {
  const { def, humanUids, matchId, runTournamentId, matchDocId, now } = args;
  const gameSequence = effectiveGameSequence(def);

  for (const uid of humanUids) {
    await ctx.db.insert("portal_run_player_tournaments", {
      uid,
      tournamentId: runTournamentId,
      templateId: args.templateId,
      status: RUN_PLAYER_TOURNAMENT_OPEN,
      createdAt: now,
      updatedAt: now,
    });

    const pmId = await ctx.db.insert("portal_run_player_matches", {
      matchId,
      tournamentId: String(runTournamentId),
      templateId: args.templateId,
      uid,
      sessionKind: "single",
      gameType: def.gameType,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    const placeholderSeed: CasualMatchSeedBinding = args.seedBinding ?? {
      seedId: "pending",
      poolVersion: "pending",
      tier: "medium",
    };

    for (let gi = 0; gi < gameSequence.length; gi++) {
      const gt = gameSequence[gi]!;
      const binding = args.seedBindingsByGameIndex?.get(gi) ?? placeholderSeed;
      await insertPlayerSessionForUid(ctx, {
        playerMatchId: pmId,
        matchId,
        uid,
        templateId: args.templateId,
        gameIndex: gi,
        gameType: gt,
        seedBinding: binding,
        now,
      });
    }
  }

  await ctx.db.patch(matchDocId, { updatedAt: now });
}

export function assertJoinAllowedForTemplate(
  _ctx: QueryCtx | MutationCtx,
  def: PortalTournamentDefinition
): { ok: true } | { ok: false; error: string } {
  if (def.status !== "open") return { ok: false, error: "tournament_closed" };
  if (isPeriodScopedTournament(def)) return { ok: false, error: "period_not_supported" };
  return { ok: true };
}

export function effectiveEntryBillingForDef(def: PortalTournamentDefinition) {
  return effectiveEntryBilling(def);
}
