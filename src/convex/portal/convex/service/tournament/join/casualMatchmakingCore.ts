/**
 * 匹配队列共享 helper（matchmaking + open table 共用，避免循环依赖）
 */
import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  CASUAL_DEFAULT_EFFECTIVE_HUMANS,
  CASUAL_DEFAULT_QUEUE_EXPIRE,
  type QueueExpireAction,
} from "../../../data/portalMatchmakingConfig";
import { refundAbandonedQueuePlayEntry } from "../../ads/portalPlayEntryQueueRefund";

export type QueueRow = Doc<"portal_match_queue">;

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

/** 开桌 action 超时/崩溃后，释放卡在 claiming 的队列行以便重试 */
export async function recoverStaleClaimingQueueRow(
  ctx: MutationCtx,
  queueRowId: QueueRow["_id"],
  staleMs = 15_000
): Promise<{ recovered: boolean }> {
  const row = await ctx.db.get(queueRowId);
  if (!row || row.status !== "claiming") {
    return { recovered: false };
  }
  if (Date.now() - row.updatedAt <= staleMs) {
    return { recovered: false };
  }
  await ctx.db.patch(queueRowId, { status: "waiting", updatedAt: Date.now() });
  return { recovered: true };
}

/** 清掉 uid+template 下多余的 waiting/claiming 行（保留 keepRowId） */
export async function purgeExtraCasualMatchQueueRows(
  ctx: MutationCtx,
  args: {
    uid: string;
    templateId: string;
    keepRowId?: QueueRow["_id"];
    now?: number;
  }
): Promise<number> {
  const now = args.now ?? Date.now();
  const rows = await ctx.db
    .query("portal_match_queue")
    .withIndex("by_uid", (q) => q.eq("uid", args.uid))
    .collect();
  let removed = 0;
  for (const row of rows) {
    if (row.templateId !== args.templateId) continue;
    if (row.status !== "waiting" && row.status !== "claiming") continue;
    if (args.keepRowId && row._id === args.keepRowId) continue;
    if (row.status === "claiming") {
      await ctx.db.patch(row._id, { status: "waiting", updatedAt: now });
    }
    const fresh = await ctx.db.get(row._id);
    if (!fresh) continue;
    await refundAbandonedQueuePlayEntry(ctx, fresh);
    const cur = await ctx.db.get(row._id);
    if (cur) await ctx.db.delete(cur._id);
    removed++;
  }
  return removed;
}

/**
 * join 前整理队列：释放 stale claiming、合并重复行，返回应沿用的 row（若有）。
 */
export async function reconcileCasualMatchQueueForJoin(
  ctx: MutationCtx,
  uid: string,
  templateId: string,
  now: number
): Promise<QueueRow | null> {
  const rows = await ctx.db
    .query("portal_match_queue")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  const active = rows.filter(
    (r) =>
      r.templateId === templateId && (r.status === "waiting" || r.status === "claiming")
  );
  if (active.length === 0) return null;

  for (const row of active) {
    if (row.status === "claiming") {
      await recoverStaleClaimingQueueRow(ctx, row._id, 15_000);
    }
  }

  const refreshed = (
    await ctx.db
      .query("portal_match_queue")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect()
  ).filter(
    (r) =>
      r.templateId === templateId && (r.status === "waiting" || r.status === "claiming")
  );
  refreshed.sort((a, b) => b.updatedAt - a.updatedAt);

  const keep = refreshed[0] ?? null;
  if (!keep) return null;

  for (const row of refreshed.slice(1)) {
    if (row.status === "claiming") {
      await ctx.db.patch(row._id, { status: "waiting", updatedAt: now });
    }
    const fresh = await ctx.db.get(row._id);
    if (!fresh) continue;
    await refundAbandonedQueuePlayEntry(ctx, fresh);
    const cur = await ctx.db.get(row._id);
    if (cur) await ctx.db.delete(cur._id);
  }

  return (await ctx.db.get(keep._id)) ?? keep;
}
