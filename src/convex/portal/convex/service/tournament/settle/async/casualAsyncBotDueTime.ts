import type { Doc } from "../../../../_generated/dataModel";
import { isCasualAsyncVirtualOpponentUid } from "./casualAsyncTypes";

type BotTimingRow = Pick<
  Doc<"portal_run_player_games">,
  "uid" | "revealAt" | "duration"
>;

type HumanTimingRow = Pick<
  Doc<"portal_run_player_matches">,
  "uid" | "finishedAt" | "updatedAt"
>;

/** 单 bot 完赛时刻：revealAt + duration（ms epoch） */
export function botDueTimeMs(row: {
  revealAt?: number;
  duration?: number;
}): number | null {
  const revealAt = row.revealAt;
  if (revealAt == null || !Number.isFinite(revealAt)) return null;
  return revealAt + Math.max(0, row.duration ?? 0);
}

/** 真人完赛时刻（交分 finishedAt，兜底 updatedAt） */
export function humanDueTimeMs(row: {
  finishedAt?: number;
  updatedAt?: number;
}): number | null {
  const at = row.finishedAt ?? row.updatedAt;
  if (at == null || !Number.isFinite(at)) return null;
  return at;
}

/** 本桌全部补位 bot 的最晚完赛时刻；无 bot 或无 revealAt 时返回 null */
export function computeMaxBotDueTimeMs(rows: BotTimingRow[]): number | null {
  let max: number | null = null;
  for (const row of rows) {
    if (!isCasualAsyncVirtualOpponentUid(row.uid)) continue;
    const due = botDueTimeMs(row);
    if (due == null) continue;
    if (max == null || due > max) max = due;
  }
  return max;
}

/** 异步桌结算时刻：max(真人 finishedAt, bot revealAt+duration) */
export function computeAsyncMatchSettleDueTimeMs(args: {
  humanRows: HumanTimingRow[];
  botRows: BotTimingRow[];
}): number | null {
  let max: number | null = null;
  for (const row of args.humanRows) {
    if (isCasualAsyncVirtualOpponentUid(row.uid)) continue;
    const due = humanDueTimeMs(row);
    if (due == null) continue;
    if (max == null || due > max) max = due;
  }
  for (const row of args.botRows) {
    if (!isCasualAsyncVirtualOpponentUid(row.uid)) continue;
    const due = botDueTimeMs(row);
    if (due == null) continue;
    if (max == null || due > max) max = due;
  }
  return max;
}

/** 距异步桌结算时刻的等待 ms；无 due 则 0（可立即清算） */
export function asyncMatchFinalizeDelayMs(args: {
  humanRows: HumanTimingRow[];
  botRows: BotTimingRow[];
  now: number;
}): number {
  const maxDue = computeAsyncMatchSettleDueTimeMs(args);
  if (maxDue == null) return 0;
  return Math.max(maxDue - args.now, 0);
}

/** @deprecated 仅 bot 窗口；异步桌请用 asyncMatchFinalizeDelayMs */
export function botFinalizeDelayMs(rows: BotTimingRow[], now: number): number {
  return asyncMatchFinalizeDelayMs({ humanRows: [], botRows: rows, now });
}

export async function loadBotTimingRowsForMatch(
  ctx: { db: { query: Function } },
  matchId: string
): Promise<BotTimingRow[]> {
  const games = await ctx.db
    .query("portal_run_player_games")
    .withIndex("by_matchId", (q: { eq: (field: string, val: string) => unknown }) =>
      q.eq("matchId", matchId)
    )
    .collect();
  return games as BotTimingRow[];
}
