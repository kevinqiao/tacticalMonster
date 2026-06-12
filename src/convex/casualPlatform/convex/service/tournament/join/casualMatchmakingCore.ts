/**
 * 匹配队列共享 helper（matchmaking + open table 共用，避免循环依赖）
 */
import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  CASUAL_DEFAULT_EFFECTIVE_HUMANS,
  CASUAL_DEFAULT_QUEUE_EXPIRE,
  type QueueExpireAction,
} from "../../../data/casualMatchmakingConfig";

export type QueueRow = Doc<"casual_match_queue">;

export function resolveQueueEffectiveHumans(row: QueueRow): number {
  const legacy = row as QueueRow & { effectiveMinHumans?: number };
  const n = row.effectiveHumans ?? legacy.effectiveMinHumans;
  if (typeof n === "number" && Number.isFinite(n) && n >= 1) {
    return Math.floor(n);
  }
  return CASUAL_DEFAULT_EFFECTIVE_HUMANS;
}

export function resolveQueueExpireAction(row: QueueRow): QueueExpireAction {
  const action = row.queueExpireAction;
  if (action === "solo" || action === "exit") return action;
  return CASUAL_DEFAULT_QUEUE_EXPIRE;
}

export function computeMultiTableBatchSize(args: {
  waitingLength: number;
  effectiveHumans: number;
  maxPlayers: number;
}): number {
  if (args.waitingLength < args.effectiveHumans) return 0;
  return Math.min(args.waitingLength, args.maxPlayers);
}

export async function releaseClaimingToWaiting(ctx: MutationCtx, rows: QueueRow[]): Promise<void> {
  const t = Date.now();
  for (const r of rows) {
    const cur = await ctx.db.get(r._id);
    if (cur?.status === "claiming") {
      await ctx.db.patch(r._id, { status: "waiting", updatedAt: t });
    }
  }
}
