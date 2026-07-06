import type { PortalWeeklyLeaderboardRow } from "../service/usePortalManager";

export function formatWeekRemaining(endsAt: number | null | undefined): string {
  if (!endsAt) return "";
  const ms = Math.max(0, endsAt - Date.now());
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d > 0) return `本周剩余 ${d} 天 ${rh} 小时`;
  return `本周剩余 ${rh} 小时`;
}

/**
 * Phase 1（后端统一总榜/cohort 未就绪）：客户端将 solo/multi 两个周榜按 uid
 * 合并积分与局数后重排名，作为「本周总榜」的过渡数据源。
 */
export function mergePortalWeeklyBoards(
  solo: PortalWeeklyLeaderboardRow[],
  multi: PortalWeeklyLeaderboardRow[]
): PortalWeeklyLeaderboardRow[] {
  const byUid = new Map<string, PortalWeeklyLeaderboardRow>();
  for (const row of [...solo, ...multi]) {
    const cur = byUid.get(row.uid);
    if (cur) {
      cur.points += row.points;
      cur.matchCount += row.matchCount;
    } else {
      byUid.set(row.uid, { ...row });
    }
  }
  return [...byUid.values()]
    .sort((a, b) => b.points - a.points || a.uid.localeCompare(b.uid))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function leaveMatchQueueErrorText(error: string): string {
  if (error === "cannot_leave_claiming") return "正在创建对局，请稍候…";
  if (error === "not_in_queue") return "当前不在匹配队列中。";
  return `退出失败：${error}`;
}

