import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  CASUAL_REPLAY_REQUIRE_NEAR_MISS,
  isCasualDevAutoReplayTokensEnabled,
} from "../../../data/portalPlayerStrategyTypes";
import {
  buildPortalAdReplayOffer,
} from "../../ads/portalAdReplayService";
import {
  isPortalAdReplayOfferEligible,
  isPortalSoloP75ChallengeDef,
  resolvePortalSoloChallengeSuccessForPlayerGame,
} from "../../ads/portalAdReplayEligibility";
import { findPlayerGameByGameId } from "../shared/casualPlayerGameTypes";
import { isPortalAdReplayTemplate, PORTAL_AD_REPLAY_ENABLED } from "../../../data/portalAdReplayConfig";
import {
  countUnusedReplayTokens,
  grantReplayTokens,
  isNearMissTableSummary,
} from "../replay/casualReplayTokens";
import {
  buildCasualAsyncTableSummary,
  type CasualAsyncTableSummary,
} from "../settle/casualRunSettlementFill";
import { casualTableSummarySolo } from "../settle/async/casualAsyncTableSummary";
import {
  allHumansSubmitted,
  canUseReplayForTemplate,
  getReplayWindowEndsAt,
  isReplayableFinished,
} from "../shared/casualPlayerMatchStatus";

/** ingest 同步响应：多人桌在交分后立即构建同桌榜（含 bot 补位 matching/playing/scored）。 */
export async function buildIngestTableSummaryForPlayer(
  ctx: MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    templateId: string;
    uid: string;
    matchId: string;
  }
): Promise<CasualAsyncTableSummary | null> {
  if (args.def.maxPlayers <= 1) return null;
  return buildCasualAsyncTableSummary(ctx, {
    templateId: args.templateId,
    uid: args.uid,
    maxPlayers: args.def.maxPlayers,
    matchId: args.matchId,
  });
}

export function attachIngestSyncResponse<T extends Record<string, unknown>>(
  body: T,
  extras: {
    seedScoreThreshold?: number;
    tableSummary?: CasualAsyncTableSummary | null;
    success?: boolean;
  }
): T & { seedScoreThreshold?: number; tableSummary?: CasualAsyncTableSummary; success?: boolean } {
  return {
    ...body,
    ...(extras.seedScoreThreshold != null ? { seedScoreThreshold: extras.seedScoreThreshold } : {}),
    ...(extras.tableSummary ? { tableSummary: extras.tableSummary } : {}),
    ...(typeof extras.success === "boolean" ? { success: extras.success } : {}),
  };
}

/** ingest partial ??:??????????(????? query ??) */
export async function buildPartialIngestResponse(
  ctx: MutationCtx,
  args: {
    humanPms: Doc<"portal_run_player_matches">[];
  }
): Promise<{ pendingOthers: boolean }> {
  return { pendingOthers: !allHumansSubmitted(args.humanPms) };
}

export type CasualReplayOffer = {
  replayOffered: boolean;
  replayMode?: "ad" | "token";
  replayTokenCount: number;
  canReplay: boolean;
  adReplayDailyRemaining?: number;
  replayWindowEndsAt?: number;
};

/** 与 `getCasualAsyncTableSummaryForGame` 对齐；Portal 模板走广告再战。 */
export async function buildCasualReplayOfferForPlayer(
  ctx: QueryCtx,
  args: {
    def: PortalTournamentDefinition;
    pm: Doc<"portal_run_player_matches">;
    uid: string;
    now: number;
    matchGameId: string;
    tableSummary: CasualAsyncTableSummary | null;
    challengeSuccess?: boolean;
  }
): Promise<CasualReplayOffer> {
  const { pm, uid, now, tableSummary, matchGameId, def, challengeSuccess } = args;
  if (!canUseReplayForTemplate(pm.templateId)) {
    return {
      replayOffered: false,
      replayTokenCount: 0,
      canReplay: false,
    };
  }

  if (isPortalAdReplayTemplate(pm.templateId)) {
    const ad = await buildPortalAdReplayOffer(ctx, {
      uid,
      pm,
      now,
      matchGameId,
      tableSummary,
      def,
      challengeSuccess,
    });
    return ad;
  }

  const eligibilityOk = isPortalAdReplayOfferEligible({
    def,
    tableSummary,
    challengeSuccess,
  });
  const freshPm = (await ctx.db.get(pm._id)) ?? pm;
  const replayOffered =
    eligibilityOk &&
    canUseReplayForTemplate(pm.templateId) &&
    isReplayableFinished(freshPm, pm.templateId, now);
  const replayTokenCount = await countUnusedReplayTokens(ctx, uid);
  const canReplay =
    replayOffered &&
    replayTokenCount > 0 &&
    (!CASUAL_REPLAY_REQUIRE_NEAR_MISS ||
      (tableSummary ? isNearMissTableSummary(tableSummary) : false));
  const replayWindowEndsAt = replayOffered
    ? getReplayWindowEndsAt(freshPm, pm.templateId, now)
    : undefined;

  return {
    replayOffered,
    replayMode: "token",
    replayTokenCount,
    canReplay,
    ...(replayWindowEndsAt != null ? { replayWindowEndsAt } : {}),
  };
}

export async function buildDeferredSoloPortalIngestResponse(
  ctx: MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    pm: Doc<"portal_run_player_matches">;
    uid: string;
    now: number;
    matchGameId: string;
    totalScore: number;
    seedScoreThreshold?: number;
  }
): Promise<{
  ok: true;
  deferredSoloSettle: true;
  tableSummary: CasualAsyncTableSummary;
  seedScoreThreshold?: number;
  success?: boolean;
}> {
  const tableSummary = casualTableSummarySolo(args.def.maxPlayers, args.totalScore);
  const pg = await findPlayerGameByGameId(ctx, args.matchGameId);
  let seedScoreThreshold = args.seedScoreThreshold;
  if (seedScoreThreshold == null && pg && isPortalSoloP75ChallengeDef(args.def)) {
    const inlineP75 =
      args.def.seedQuantileSuccess?.quantile === "p75"
        ? pg.seedBinding?.scoreQuantiles?.p75
        : undefined;
    if (typeof inlineP75 === "number" && Number.isFinite(inlineP75)) {
      seedScoreThreshold = Math.floor(inlineP75);
    }
  }
  let challengeSuccess: boolean | undefined;
  if (pg && isPortalSoloP75ChallengeDef(args.def)) {
    challengeSuccess = await resolvePortalSoloChallengeSuccessForPlayerGame(ctx, {
      def: args.def,
      pg,
      score: args.totalScore,
    });
  } else if (typeof seedScoreThreshold === "number") {
    challengeSuccess = args.totalScore >= seedScoreThreshold;
  }
  const replay = await buildCasualReplayOfferForPlayer(ctx, {
    def: args.def,
    pm: args.pm,
    uid: args.uid,
    now: args.now,
    matchGameId: args.matchGameId,
    tableSummary,
    challengeSuccess,
  });
  const enriched: CasualAsyncTableSummary = {
    ...tableSummary,
    replayOffered: replay.replayOffered,
    replayMode: replay.replayMode,
    replayTokenCount: replay.replayTokenCount,
    canReplay: replay.canReplay,
    adReplayDailyRemaining: replay.adReplayDailyRemaining,
    ...(replay.replayWindowEndsAt != null ? { replayWindowEndsAt: replay.replayWindowEndsAt } : {}),
  };
  return {
    ok: true,
    deferredSoloSettle: true,
    tableSummary: enriched,
    ...(typeof seedScoreThreshold === "number"
      ? {
          seedScoreThreshold,
          success:
            typeof challengeSuccess === "boolean"
              ? challengeSuccess
              : args.totalScore >= seedScoreThreshold,
        }
      : typeof challengeSuccess === "boolean"
        ? { success: challengeSuccess }
        : {}),
  };
}

export function shouldDeferSoloSettleForPortalAdReplay(templateId: string): boolean {
  return PORTAL_AD_REPLAY_ENABLED && isPortalAdReplayTemplate(templateId);
}

/** ingest 同桌榜附带 Portal 广告再战 offer */
export async function enrichIngestTableSummaryWithReplay(
  ctx: MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    pm: Doc<"portal_run_player_matches">;
    uid: string;
    now: number;
    matchGameId: string;
    tableSummary: CasualAsyncTableSummary | null;
  }
): Promise<CasualAsyncTableSummary | null> {
  if (!args.tableSummary) return null;
  if (!isPortalAdReplayTemplate(args.pm.templateId)) return args.tableSummary;
  const replay = await buildCasualReplayOfferForPlayer(ctx, {
    def: args.def,
    pm: args.pm,
    uid: args.uid,
    now: args.now,
    matchGameId: args.matchGameId,
    tableSummary: args.tableSummary,
  });
  return {
    ...args.tableSummary,
    replayOffered: replay.replayOffered,
    replayMode: replay.replayMode,
    replayTokenCount: replay.replayTokenCount,
    canReplay: replay.canReplay,
    adReplayDailyRemaining: replay.adReplayDailyRemaining,
    ...(replay.replayWindowEndsAt != null ? { replayWindowEndsAt: replay.replayWindowEndsAt } : {}),
  };
}

/** dev:??????????????(mutation ingest ??) */
export async function maybeGrantDevReplayTokensOnSubmit(
  ctx: MutationCtx,
  args: {
    def: PortalTournamentDefinition;
    pm: Doc<"portal_run_player_matches">;
    uid: string;
    now: number;
  }
): Promise<void> {
  if (args.def.maxPlayers <= 1) return;
  if (isPortalAdReplayTemplate(args.pm.templateId)) return;
  if (!canUseReplayForTemplate(args.pm.templateId)) return;
  if (!isReplayableFinished(args.pm, args.pm.templateId, args.now)) return;
  if (!isCasualDevAutoReplayTokensEnabled()) return;
  const tokens = await countUnusedReplayTokens(ctx, args.uid);
  if (tokens > 0) return;
  await grantReplayTokens(ctx, args.uid, 3);
}
