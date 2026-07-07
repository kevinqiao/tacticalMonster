import i18n from "@/i18n";

import type { PortalWeeklyLeaderboardRow } from "../service/usePortalManager";
import { leaveMatchQueueErrorText } from "../shared/portalErrorMessage";

export { leaveMatchQueueErrorText };

export function formatWeekRemaining(endsAt: number | null | undefined): string {
  if (!endsAt) return "";
  const ms = Math.max(0, endsAt - Date.now());
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d > 0) {
    return i18n.t("lobby.weekRemaining", {
      ns: "portal.player",
      days: d,
      hours: rh,
    });
  }
  return i18n.t("lobby.weekRemainingHours", { ns: "portal.player", hours: rh });
}

/**
 * @deprecated Phase 1 已改为后端 `getPortalWeeklyTotalLeaderboard`；保留供测试/对照。
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
