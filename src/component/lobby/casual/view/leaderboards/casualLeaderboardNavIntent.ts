/** Play 等入口跳转排行榜 Tab 时写入，由 {@link CasualLeaderboardsTab} 消费后清除。 */
export const CASUAL_LEADERBOARDS_SESSION_TAB_KEY = "casual_leaderboards_initial_tab";

export type CasualLeaderboardsNavTab = "tournament" | "mainSeason" | "cArena";

export function setCasualLeaderboardsNavIntent(tab: CasualLeaderboardsNavTab): void {
  try {
    sessionStorage.setItem(CASUAL_LEADERBOARDS_SESSION_TAB_KEY, tab);
  } catch {
    /* ignore quota / private mode */
  }
}
