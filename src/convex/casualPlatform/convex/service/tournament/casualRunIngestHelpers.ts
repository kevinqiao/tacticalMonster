import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { countUnusedReplayTokens } from "./casualBotDifficultyService";
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

const CASUAL_NEAR_MISS_GAP_RATIO = 0.1;

function isNearMissTableSummary(summary: CasualAsyncTableSummary | null): boolean {
  if (!summary?.rows?.length) return false;
  const you = summary.rows.find((r) => r.isYou && r.rowState !== "playing");
  const first = summary.rows.find((r) => r.rowState !== "playing" && r.rank === 1);
  if (!you || !first || you.rank === 1) return false;
  const yourScore = you.score;
  const firstScore = first.score;
  if (yourScore == null || firstScore == null || firstScore <= 0) return false;
  const gap = (firstScore - yourScore) / firstScore;
  return gap >= 0 && gap <= CASUAL_NEAR_MISS_GAP_RATIO;
}

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
  let canReplay = false;
  if (
    canUseReplayForTemplate(pm.templateId) &&
    isReplayableFinished(freshPm, pm.templateId, now)
  ) {
    const tokenCount = await countUnusedReplayTokens(ctx, uid);
    if (tokenCount > 0) {
      canReplay = tableSummary ? isNearMissTableSummary(tableSummary) : true;
    }
  }

  return { tableSummary, pendingOthers, canReplay };
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
