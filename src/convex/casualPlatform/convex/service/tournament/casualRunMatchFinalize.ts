/**
 * 异步 run 桌：过期 promote + 全桌可终局时 finalize（cron / confirm 共用）。
 */
import { getTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  allHumansSubmitted,
  isReplayableFinished,
  promoteExpiredFinishedInMatch,
} from "./casualPlayerMatchStatus";
import { isCasualAsyncVirtualOpponentUid } from "./casualRunSettlementFill";
import { finalizeCasualAsyncMatchIngest } from "./casualTournamentService";

function canonicalCasualRunSessionExternalId(matchId: string): string {
  return `casual_sess:${matchId}`;
}

/** 将 `matchId` 上过期的 `finished` 升为 `confirmed`，若全桌可终局则 `settled` 发奖。 */
export async function tryFinalizeCasualAsyncMatch(
  ctx: MutationCtx,
  matchId: string,
  now: number
): Promise<{ finalized: boolean; promotedOnly: boolean }> {
  const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
  if (!matchDoc || matchDoc.completed) {
    return { finalized: false, promotedOnly: false };
  }

  const def = getTournamentDefinition(matchDoc.templateId);
  if (!def || def.maxPlayers <= 1) {
    return { finalized: false, promotedOnly: false };
  }

  await promoteExpiredFinishedInMatch(ctx, matchId, now);

  const refreshed = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();
  const humanPms = refreshed.filter((p) => !isCasualAsyncVirtualOpponentUid(p.uid));
  if (humanPms.length === 0) {
    return { finalized: false, promotedOnly: false };
  }

  const anyHumanInReplayWindow = humanPms.some(
    (p) => p.status === "finished" && isReplayableFinished(p, p.templateId, now)
  );
  if (!allHumansSubmitted(humanPms) || anyHumanInReplayWindow) {
    return { finalized: false, promotedOnly: true };
  }

  const anchor =
    humanPms.find((p) => p.score != null && (p.status === "confirmed" || p.status === "settled")) ??
    humanPms.find((p) => p.score != null) ??
    humanPms[0]!;
  const pmFresh = (await ctx.db.get(anchor._id)) ?? anchor;
  const canonicalSessionId = canonicalCasualRunSessionExternalId(String(matchId));
  const humanCountPlanned = Math.max(1, matchDoc.humanPlayerCount ?? 1);
  const gameId = pmFresh.gameType === "block_blast" ? "block_blast" : "solitaire";

  await finalizeCasualAsyncMatchIngest(ctx, {
    def,
    pm: pmFresh,
    uid: anchor.uid,
    now,
    gameId,
    humanPms,
    matchDoc,
    canonicalSessionId,
    humanCountPlanned,
  });
  return { finalized: true, promotedOnly: false };
}
