import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  CASUAL_REPLAY_REQUIRE_NEAR_MISS,
  isCasualDevAutoReplayTokensEnabled,
} from "../../../data/portalPlayerStrategyTypes";
import {
  countUnusedReplayTokens,
  grantReplayTokens,
  isNearMissTableSummary,
} from "../replay/casualReplayTokens";
import {
  buildCasualAsyncTableSummary,
  type CasualAsyncTableSummary,
} from "../settle/casualRunSettlementFill";
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
  }
): T & { seedScoreThreshold?: number; tableSummary?: CasualAsyncTableSummary } {
  return {
    ...body,
    ...(extras.seedScoreThreshold != null ? { seedScoreThreshold: extras.seedScoreThreshold } : {}),
    ...(extras.tableSummary ? { tableSummary: extras.tableSummary } : {}),
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
  replayTokenCount: number;
  canReplay: boolean;
  replayWindowEndsAt?: number;
};

/** ??? `getCasualAsyncTableSummaryForGame`:????? near-miss ?? */
export async function buildCasualReplayOfferForPlayer(
  ctx: QueryCtx,
  args: {
    def: PortalTournamentDefinition;
    pm: Doc<"portal_run_player_matches">;
    uid: string;
    now: number;
    tableSummary: CasualAsyncTableSummary | null;
  }
): Promise<CasualReplayOffer> {
  const { pm, uid, now, tableSummary } = args;
  if (!canUseReplayForTemplate(pm.templateId)) {
    return {
      replayOffered: false,
      replayTokenCount: 0,
      canReplay: false,
    };
  }
  const freshPm = (await ctx.db.get(pm._id)) ?? pm;
  const replayOffered =
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
    replayTokenCount,
    canReplay,
    ...(replayWindowEndsAt != null ? { replayWindowEndsAt } : {}),
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
  if (!canUseReplayForTemplate(args.pm.templateId)) return;
  if (!isReplayableFinished(args.pm, args.pm.templateId, args.now)) return;
  if (!isCasualDevAutoReplayTokensEnabled()) return;
  const tokens = await countUnusedReplayTokens(ctx, args.uid);
  if (tokens > 0) return;
  await grantReplayTokens(ctx, args.uid, 3);
}
