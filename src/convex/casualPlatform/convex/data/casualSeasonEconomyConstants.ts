/**
 * 赛季尺度经济锚点（Pass / 券任务对齐用；与 casual_seasons 日历应对齐）。
 * 平衡脚本 `scripts/casual/economy-balance.mjs` 应与此处常量保持一致。
 */

export const PASS_XP_PER_LEVEL = 1000;
export const PASS_MAX_LEVEL = 20;

/** 设计假设：单赛季约 12 个日历周（调参锚点，非硬编码赛季切分） */
export const CASUAL_SEASON_NOMINAL_WEEKS = 12;

/** F2P 免费轨一季目标 Pass 等级（满级 20；Standard/Deluxe 另计） */
export const CASUAL_F2P_PASS_TARGET_LEVELS = 12;

/** 平衡脚本「中度画像」Pass 级数允许带（约 12 级封顶锚点） */
export const CASUAL_F2P_PASS_TARGET_BAND = { min: 11, max: 13 } as const;

/** 一季 F2P 目标 Pass XP ≈ TARGET_LEVELS × XP_PER_LEVEL（任务 + 对局共同达成） */
export const CASUAL_F2P_PASS_TARGET_XP =
  CASUAL_F2P_PASS_TARGET_LEVELS * PASS_XP_PER_LEVEL;

/** p75 单人挑战：当日钱包金币软顶（参与+成功合计；League/Pass 不受影响） */
export const DAILY_P75_COINS_SOFT_CAP = 200;

/** Play 异步 A/B/C 入场与 B 底奖（`economy-balance.mjs` 与 `casualTournamentConfigs` 应对齐） */
export const ASYNC_ENTRY_COINS_A = 35;
export const ASYNC_ENTRY_COINS_B = 45;
export const ASYNC_ENTRY_GEMS_C = 7;
export const ASYNC_BASE_COINS_A = 23;
export const ASYNC_BASE_COINS_B = 52;
export const ASYNC_BASE_GEMS_C = 6;

/**
 * 平衡脚本「discretionary 商店消耗」假设（再战令/外观等，非强制；金币/钻分轨、无钻→币包）。
 * 周上限见 `casualShopCatalog.weeklyPurchaseLimit`；Town 建设点不可购买，故无 Town coin sink。
 */
export const ECONOMY_SHOP_SINK_BY_PROFILE = {
  casual: { coinsPerWeek: 35, gemsPerWeek: 6 },
  active: { coinsPerWeek: 55, gemsPerWeek: 8 },
  grinder: { coinsPerWeek: 75, gemsPerWeek: 12 },
} as const;
