/** 历史：曾用于跳转排行榜全页 Tab；现排行榜仅通过 Play 内弹窗打开。 */
export const CASUAL_LEADERBOARDS_SESSION_TAB_KEY = "casual_leaderboards_initial_tab";

export type CasualLeaderboardsNavTab = "tournament" | "mainSeason" | "cArena";

export function setCasualLeaderboardsNavIntent(tab: CasualLeaderboardsNavTab): void {
  try {
    sessionStorage.setItem(CASUAL_LEADERBOARDS_SESSION_TAB_KEY, tab);
  } catch {
    /* ignore quota / private mode */
  }
}
