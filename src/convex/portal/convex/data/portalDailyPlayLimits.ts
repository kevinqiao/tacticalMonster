/**
 * Portal 每日场次上限（单人挑战 / 多人竞技）。
 * 真人入场校验与周联赛 Bot 虚拟轨迹共用；改这里 Bot 日程会跟着变。
 */
export type PortalDailyPlayLimits = {
  solo: number;
  multi: number;
};

/** 默认：单人每天 3 场，多人每天 10 场 */
export const PORTAL_DAILY_PLAY_LIMITS: PortalDailyPlayLimits = {
  solo: 3,
  multi: 10,
};

export function getPortalDailyPlayLimits(): PortalDailyPlayLimits {
  return {
    solo: PORTAL_DAILY_PLAY_LIMITS.solo,
    multi: PORTAL_DAILY_PLAY_LIMITS.multi,
  };
}
