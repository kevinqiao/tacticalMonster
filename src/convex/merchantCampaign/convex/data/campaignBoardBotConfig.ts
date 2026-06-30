/** 活动累计榜 Bot cohort 静态配置（对齐 Portal 周榜 Bot 思路）。 */

import type { Doc } from "../_generated/dataModel";

export type CampaignBoardMode = Doc<"merchant_campaigns">["mode"];

export const CAMPAIGN_BOARD_BOT_POOL_SIZE = 15;

export const CAMPAIGN_BOARD_BOT_REVEALED_NOW_MIN = 5;
export const CAMPAIGN_BOARD_BOT_REVEALED_NOW_MAX = 10;

/** 活动开放后，其余竞争者在此时窗内陆续入榜（ms） */
export const CAMPAIGN_BOARD_BOT_POST_ANCHOR_REVEAL_MS = 6 * 3600 * 1000;

/** 活动结束目标值区间（solo=bestScore 量级，multi=rankPoints） */
export const CAMPAIGN_BOARD_BOT_VALUE_BAND: Record<
  CampaignBoardMode,
  { min: number; max: number }
> = {
  solo: { min: 4500, max: 32000 },
  multi: { min: 8, max: 120 },
};

/** 无真人或真人很低时，Bot 锚点下限 */
export const CAMPAIGN_BOARD_BOT_HUMAN_ANCHOR_FLOOR: Record<CampaignBoardMode, number> = {
  solo: 3500,
  multi: 6,
};

/** reveal 时即达到的进度比例；余下部分随时间缓升 */
export const CAMPAIGN_BOARD_BOT_RAMP_FLOOR = 0.28;

/** <1 缓升更快（0.55 ≈ 中期已过半） */
export const CAMPAIGN_BOARD_BOT_RAMP_POWER = 0.55;

/** Bot 展示用局数（solo；multi 由每日 session 模拟决定） */
export const CAMPAIGN_BOARD_BOT_AVG_VALUE_PER_PLAY: Record<CampaignBoardMode, number> = {
  solo: 7200,
  multi: 2.2,
};

/** multi 模拟：正常玩家约 10 局/日，persona 分化约 6–14 局 */
export const CAMPAIGN_BOARD_BOT_DAILY_PLAYS_BASE = 10;
export const CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MIN = 6;
export const CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MAX = 14;

/** 每日对局集中在约 5 小时内完成 */
export const CAMPAIGN_BOARD_BOT_SESSION_HOURS = 5;
export const CAMPAIGN_BOARD_BOT_SESSION_MS =
  CAMPAIGN_BOARD_BOT_SESSION_HOURS * 3600 * 1000;

/** 以 reveal 为起点的模拟日长度 */
export const CAMPAIGN_BOARD_BOT_PLAY_DAY_MS = 24 * 3600 * 1000;

/** multi 入榜时已有累计 rankPoints（模拟入榜前已玩过若干局） */
export const CAMPAIGN_BOARD_BOT_MULTI_START_MIN = 1;
export const CAMPAIGN_BOARD_BOT_MULTI_START_MAX = 15;
