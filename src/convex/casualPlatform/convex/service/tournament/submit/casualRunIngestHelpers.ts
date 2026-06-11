import type { CasualTournamentDefinition } from "../../../data/casualTournamentConfigs";
import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  CASUAL_REPLAY_REQUIRE_NEAR_MISS,
  isCasualDevAutoReplayTokensEnabled,
} from "../../../data/casualPlayerStrategyTypes";
import {
  countUnusedReplayTokens,
  grantReplayTokens,
  isNearMissTableSummary,
} from "../replay/casualReplayTokens";
import type { CasualAsyncTableSummary } from "../settle/casualRunSettlementFill";
import {
  allHumansSubmitted,
  canUseReplayForTemplate,
  getReplayWindowEndsAt,
  isReplayableFinished,
} from "../shared/casualPlayerMatchStatus";

/** ingest partial 响应：仅是否还有待提交真人（榜与再战由 query 拉取） */
export async function buildPartialIngestResponse(
  ctx: MutationCtx,
  args: {
    humanPms: Doc<"casual_run_player_matches">[];
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

/** 客户端 `getCasualAsyncTableSummaryForGame`：再战窗口与 near-miss 判定 */
export async function buildCasualReplayOfferForPlayer(
  ctx: QueryCtx,
  args: {
    def: CasualTournamentDefinition;
    pm: Doc<"casual_run_player_matches">;
    uid: string;
    now: number;
    tableSummary: CasualAsyncTableSummary | null;
  }
): Promise<CasualReplayOffer> {
  const { def, pm, uid, now, tableSummary } = args;
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

/** dev：首次进入再战窗口时自动补令牌（mutation ingest 路径） */
export async function maybeGrantDevReplayTokensOnSubmit(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    pm: Doc<"casual_run_player_matches">;
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
