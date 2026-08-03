import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";

/**
 * Persist solo challenge outcome on the player match (SSOT for history / ads).
 */
export async function persistPlayerMatchChallengeOutcome(
  ctx: MutationCtx,
  args: {
    uid: string;
    runTournamentId: string;
    matchId?: string;
    seedScoreThreshold?: number;
    challengeSuccess?: boolean;
    now?: number;
  }
): Promise<Doc<"portal_run_player_matches"> | null> {
  const now = args.now ?? Date.now();
  let pm: Doc<"portal_run_player_matches"> | null = null;

  if (args.matchId) {
    pm = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_match_uid", (q) =>
        q.eq("matchId", args.matchId!).eq("uid", args.uid)
      )
      .unique();
  }
  if (!pm) {
    pm = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_run_uid", (q) =>
        q.eq("tournamentId", args.runTournamentId).eq("uid", args.uid)
      )
      .first();
  }
  if (!pm) return null;

  const patch: Partial<Doc<"portal_run_player_matches">> = { updatedAt: now };
  if (typeof args.seedScoreThreshold === "number" && Number.isFinite(args.seedScoreThreshold)) {
    patch.seedScoreThreshold = Math.floor(args.seedScoreThreshold);
  }
  if (typeof args.challengeSuccess === "boolean") {
    patch.challengeSuccess = args.challengeSuccess;
  }
  if (patch.seedScoreThreshold == null && patch.challengeSuccess == null) {
    return pm;
  }

  await ctx.db.patch(pm._id, patch);
  return (await ctx.db.get(pm._id)) ?? pm;
}

export async function persistPlayerMatchChallengeOutcomeById(
  ctx: MutationCtx,
  pmId: Id<"portal_run_player_matches">,
  args: {
    seedScoreThreshold?: number;
    challengeSuccess?: boolean;
    now?: number;
  }
): Promise<void> {
  const now = args.now ?? Date.now();
  const patch: Partial<Doc<"portal_run_player_matches">> = { updatedAt: now };
  if (typeof args.seedScoreThreshold === "number" && Number.isFinite(args.seedScoreThreshold)) {
    patch.seedScoreThreshold = Math.floor(args.seedScoreThreshold);
  }
  if (typeof args.challengeSuccess === "boolean") {
    patch.challengeSuccess = args.challengeSuccess;
  }
  if (patch.seedScoreThreshold == null && patch.challengeSuccess == null) return;
  await ctx.db.patch(pmId, patch);
}
