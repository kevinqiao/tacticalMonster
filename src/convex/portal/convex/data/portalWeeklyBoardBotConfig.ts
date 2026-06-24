/** Portal 周榜 Bot 补位静态配置（参考 casual 周联赛 cohort 量级）。 */

export type PortalWeeklyBoardMode = "solo" | "multi";

export const PORTAL_WEEKLY_BOARD_BOT_POOL_SIZE = 15;

export const PORTAL_WEEKLY_BOARD_BOT_REVEALED_NOW_MIN = 5;
export const PORTAL_WEEKLY_BOARD_BOT_REVEALED_NOW_MAX = 10;

/** 首真人入榜后，其余 bot 在此窗口内陆续入榜（ms） */
export const PORTAL_WEEKLY_BOARD_BOT_POST_ANCHOR_REVEAL_MS = 1 * 3600 * 1000;

/** 周尾目标 weekly points 区间（按 mode） */
export const PORTAL_WEEKLY_BOARD_BOT_POINTS_BAND: Record<
  PortalWeeklyBoardMode,
  { min: number; max: number }
> = {
  solo: { min: 12, max: 72 },
  multi: { min: 18, max: 95 },
};

/** 估算 bot 展示用局数（与 points 解耦，仅 UI） */
export const PORTAL_WEEKLY_BOARD_BOT_AVG_POINTS_PER_MATCH: Record<
  PortalWeeklyBoardMode,
  number
> = {
  solo: 2,
  multi: 2.5,
};
