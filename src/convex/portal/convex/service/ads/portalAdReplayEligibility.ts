import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { PortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import {
  isPortalP75Success,
  resolveSoloSeedSuccessThreshold,
} from "../../data/portalTournamentConfigs";
import { isPortalSuccessQuantile } from "../../data/portalSeedTierPolicy";
import { resolvePlatformSeedScoreThreshold } from "../botFill/computeBotFillsCore";
import type { CasualAsyncTableSummary } from "../tournament/settle/casualRunSettlementFill";

export function isPortalSoloP75ChallengeDef(def: PortalTournamentDefinition): boolean {
  return def.maxPlayers <= 1 || def.matchType === "solo_p75";
}

/** 单人挑战：仅未达标（success === false）时可提供再战。 */
export function isSoloChallengeEligibleForAdReplay(
  def: PortalTournamentDefinition,
  challengeSuccess?: boolean
): boolean {
  if (!isPortalSoloP75ChallengeDef(def)) return true;
  return challengeSuccess === false;
}

/** 多人：同桌全员已出分且本人第一时不提供再战。 */
export function isMultiplayerWinnerAllScoredSuppressAdReplay(
  def: PortalTournamentDefinition,
  tableSummary: CasualAsyncTableSummary | null | undefined
): boolean {
  if (def.maxPlayers <= 1) return false;
  if (!tableSummary?.rows?.length) return false;

  const you = tableSummary.rows.find((r) => r.isYou);
  if (!you || you.rank !== 1) return false;

  const allScored = tableSummary.rows.every(
    (r) =>
      r.rowState === "scored" &&
      r.score != null &&
      Number.isFinite(r.score)
  );
  if (!allScored) return false;

  return tableSummary.isBoardStable === true;
}

export function isPortalAdReplayOfferEligible(args: {
  def: PortalTournamentDefinition;
  tableSummary: CasualAsyncTableSummary | null | undefined;
  challengeSuccess?: boolean;
}): boolean {
  if (!isSoloChallengeEligibleForAdReplay(args.def, args.challengeSuccess)) {
    return false;
  }
  if (isMultiplayerWinnerAllScoredSuppressAdReplay(args.def, args.tableSummary)) {
    return false;
  }
  return true;
}

export function resolvePortalSoloChallengeSuccess(
  def: PortalTournamentDefinition,
  score: number,
  seedScoreThreshold?: number
): boolean | undefined {
  if (!isPortalSoloP75ChallengeDef(def)) return undefined;
  if (typeof seedScoreThreshold !== "number" || !Number.isFinite(seedScoreThreshold)) {
    return undefined;
  }
  return isPortalP75Success(def, score, seedScoreThreshold);
}

/** 与 ingest / HTTP bridge 对齐：优先 seedBinding 内联分位，缺失时从 seed pool 解析。 */
export async function resolvePortalSoloSeedScoreThresholdForPlayerGame(
  ctx: QueryCtx | MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    pg: Doc<"portal_run_player_games">;
  }
): Promise<number | undefined> {
  if (!isPortalSoloP75ChallengeDef(args.def)) return undefined;

  const binding = args.pg.seedBinding;
  if (binding?.ritualOneLineClear) {
    return resolveSoloSeedSuccessThreshold({
      gameType: args.pg.gameType,
      ritualOneLineClear: true,
    });
  }

  const bindingQuantile = binding?.successQuantile;
  const quantile = isPortalSuccessQuantile(bindingQuantile)
    ? bindingQuantile
    : args.def.seedQuantileSuccess?.quantile;
  if (!isPortalSuccessQuantile(quantile)) return undefined;

  const inline = binding?.scoreQuantiles?.[quantile];
  if (typeof inline === "number" && Number.isFinite(inline)) {
    return resolveSoloSeedSuccessThreshold({
      gameType: args.pg.gameType,
      quantiles: binding?.scoreQuantiles,
      successQuantile: quantile,
      seedQuantileSuccess: args.def.seedQuantileSuccess,
    });
  }
  if (binding) {
    const resolved = await resolvePlatformSeedScoreThreshold(ctx, {
      successThresholdQuantile: quantile,
      seedBinding: binding,
      gameType: args.pg.gameType,
      ritualOneLineClear: binding.ritualOneLineClear,
      seedQuantileSuccess: args.def.seedQuantileSuccess,
    });
    if (typeof resolved === "number" && Number.isFinite(resolved)) {
      return resolved;
    }
  }
  return undefined;
}

/** 与 ingest / HTTP bridge 对齐：inline P75 缺失时从 seed pool 解析阈值。 */
export async function resolvePortalSoloChallengeSuccessForPlayerGame(
  ctx: QueryCtx | MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    pg: Doc<"portal_run_player_games">;
    score: number;
  }
): Promise<boolean | undefined> {
  if (!isPortalSoloP75ChallengeDef(args.def)) return undefined;
  const threshold = await resolvePortalSoloSeedScoreThresholdForPlayerGame(ctx, {
    def: args.def,
    pg: args.pg,
  });
  return resolvePortalSoloChallengeSuccess(args.def, args.score, threshold);
}
