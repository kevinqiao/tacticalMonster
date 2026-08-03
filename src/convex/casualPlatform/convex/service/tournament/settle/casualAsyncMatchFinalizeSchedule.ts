import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  asyncMatchFinalizeDelayMs,
  computeAsyncMatchSettleDueTimeMs,
} from "./async/casualAsyncBotDueTime";

type MatchDoc = Doc<"casual_run_matches">;
type HumanRow = Pick<Doc<"casual_run_player_matches">, "uid" | "finishedAt" | "updatedAt">;
type BotRow = Pick<Doc<"casual_run_player_games">, "uid" | "revealAt" | "duration">;

/** 幂等调度异步桌结算：同一 dueAt 不重复 runAfter */
export async function scheduleAsyncMatchFinalizeIfNeeded(
  ctx: MutationCtx,
  args: {
    matchDoc: MatchDoc;
    matchId: string;
    humanRows: HumanRow[];
    botRows: BotRow[];
    now: number;
  }
): Promise<{ scheduled: boolean; skippedDuplicate?: boolean }> {
  const interval = asyncMatchFinalizeDelayMs({
    humanRows: args.humanRows,
    botRows: args.botRows,
    now: args.now,
  });
  if (interval <= 0) return { scheduled: false };

  const dueAt = computeAsyncMatchSettleDueTimeMs({
    humanRows: args.humanRows,
    botRows: args.botRows,
  });
  if (dueAt == null) return { scheduled: false };

  const existingDueAt = args.matchDoc.asyncMatchFinalizeDueAt;
  const existingJobId = args.matchDoc.asyncMatchFinalizeScheduledId;
  if (
    existingJobId != null &&
    existingDueAt != null &&
    existingDueAt >= dueAt
  ) {
    return { scheduled: false, skippedDuplicate: true };
  }

  if (existingJobId != null) {
    try {
      await ctx.scheduler.cancel(existingJobId);
    } catch (e) {
      console.warn("[casual] cancel asyncMatchFinalize job", args.matchId, e);
    }
  }

  const jobId = await ctx.scheduler.runAfter(
    interval,
    internal.service.tournament.settle.casualRunMatchFinalize.runScheduledCasualAsyncMatchFinalize,
    { matchId: args.matchId }
  );

  await ctx.db.patch(args.matchDoc._id, {
    asyncMatchFinalizeScheduledId: jobId,
    asyncMatchFinalizeDueAt: dueAt,
    updatedAt: args.now,
  });

  return { scheduled: true };
}

export async function clearAsyncMatchFinalizeSchedule(
  ctx: MutationCtx,
  matchDocId: Id<"casual_run_matches">,
  updatedAt: number
): Promise<void> {
  await ctx.db.patch(matchDocId, {
    asyncMatchFinalizeScheduledId: undefined,
    asyncMatchFinalizeDueAt: undefined,
    updatedAt,
  });
}
