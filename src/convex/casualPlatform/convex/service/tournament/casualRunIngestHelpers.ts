import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  CASUAL_REPLAY_REQUIRE_NEAR_MISS,
  isCasualDevAutoReplayTokensEnabled,
} from "../../data/casualBotDifficultyConfig";
import {
  countUnusedReplayTokens,
  grantReplayTokens,
  isNearMissTableSummary,
} from "./casualBotDifficultyService";
import {
  buildCasualAsyncTableSummary,
  type CasualAsyncTableSummary,
  finalizeCasualAsyncTableSummaryForPlayer,
} from "./casualRunSettlementFill";
import {
  allHumansSubmitted,
  canUseReplayForTemplate,
  isReplayableFinished,
  matchAllHumansSettled,
} from "./casualPlayerMatchStatus";

export async function buildPartialIngestResponse(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    pm: Doc<"casual_run_player_matches">;
    uid: string;
    canonicalSessionId: string;
    humanPms: Doc<"casual_run_player_matches">[];
    now: number;
  }
): Promise<{
  tableSummary: CasualAsyncTableSummary | null;
  pendingOthers: boolean;
  /** 模板 + `finished` 窗口内（与是否有令无关，供 UI 展示灰态按钮） */
  replayOffered: boolean;
  replayTokenCount: number;
  canReplay: boolean;
}> {
  const { def, pm, uid, canonicalSessionId, humanPms, now } = args;
  const freshPm = (await ctx.db.get(pm._id)) ?? pm;
  const allSettled = matchAllHumansSettled(humanPms);

  let tableSummary: CasualAsyncTableSummary | null = null;
  if (canonicalSessionId.trim().length > 0) {
    if (allSettled) {
      tableSummary = await finalizeCasualAsyncTableSummaryForPlayer(ctx, {
        def,
        templateId: pm.templateId,
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        sessionExternalId: canonicalSessionId,
        uid,
        updatedAt: now,
      });
    } else {
      tableSummary = await buildCasualAsyncTableSummary(ctx, {
        templateId: pm.templateId,
        sessionExternalId: canonicalSessionId,
        uid,
        maxPlayers: def.maxPlayers,
        matchId: pm.matchId,
        allHumansSettled: false,
      });
    }
  }

  const pendingOthers = !allHumansSubmitted(humanPms);
  const replayOffered =
    canUseReplayForTemplate(pm.templateId) &&
    isReplayableFinished(freshPm, pm.templateId, now);

  let replayTokenCount = await countUnusedReplayTokens(ctx, uid);
  if (
    replayOffered &&
    replayTokenCount === 0 &&
    isCasualDevAutoReplayTokensEnabled() &&
    def.maxPlayers > 1
  ) {
    await grantReplayTokens(ctx, uid, 3);
    replayTokenCount = await countUnusedReplayTokens(ctx, uid);
  }

  const canReplay =
    replayOffered &&
    replayTokenCount > 0 &&
    (!CASUAL_REPLAY_REQUIRE_NEAR_MISS ||
      (tableSummary ? isNearMissTableSummary(tableSummary) : true));

  return { tableSummary, pendingOthers, replayOffered, replayTokenCount, canReplay };
}

export async function buildConfirmedDedupeResponse(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    pm: Doc<"casual_run_player_matches">;
    uid: string;
    now: number;
  }
): Promise<{ tableSummary?: CasualAsyncTableSummary; canReplay: false }> {
  const ext =
    typeof args.pm.externalGameId === "string" &&
    args.pm.externalGameId.trim().startsWith("casual_sess:")
      ? args.pm.externalGameId.trim()
      : `casual_sess:${args.pm.matchId}`;
  const tableSummary = await buildCasualAsyncTableSummary(ctx, {
    templateId: args.pm.templateId,
    sessionExternalId: ext,
    uid: args.uid,
    maxPlayers: args.def.maxPlayers,
    matchId: args.pm.matchId,
    allHumansSettled: false,
  });
  return {
    ...(tableSummary ? { tableSummary } : {}),
    canReplay: false as const,
  };
}
