import type { Doc } from "../../../../_generated/dataModel";
import { isCasualAsyncVirtualOpponentUid } from "./casualAsyncTypes";

/** 单 bot 完赛时刻：revealAt + duration（ms epoch） */
export function botDueTimeMs(row: {
  revealAt?: number;
  duration?: number;
}): number | null {
  const revealAt = row.revealAt;
  if (revealAt == null || !Number.isFinite(revealAt)) return null;
  return revealAt + Math.max(0, row.duration ?? 0);
}

/** 本桌全部补位 bot 的最晚完赛时刻；无 bot 或无 revealAt 时返回 null */
export function computeMaxBotDueTimeMs(
  rows: Array<Pick<Doc<"casual_run_player_matches">, "uid" | "revealAt" | "duration">>
): number | null {
  let max: number | null = null;
  for (const row of rows) {
    if (!isCasualAsyncVirtualOpponentUid(row.uid)) continue;
    const due = botDueTimeMs(row);
    if (due == null) continue;
    if (max == null || due > max) max = due;
  }
  return max;
}

/** 距最晚 bot 完赛的等待 ms；无 bot due 则 0（可立即清算） */
export function botFinalizeDelayMs(
  rows: Array<Pick<Doc<"casual_run_player_matches">, "uid" | "revealAt" | "duration">>,
  now: number
): number {
  const maxDue = computeMaxBotDueTimeMs(rows);
  if (maxDue == null) return 0;
  return Math.max(maxDue - now, 0);
}
