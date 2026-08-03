/**
 * 玩家等级配置
 * 定义等级上限、经验值公式等配置
 *
 * 产品定位「平台规则向」时：用 `globalExpGainMultiplier` 放慢入账，用 `baseExp` 拉高每级需求；
 * 任务/锦标赛等渠道的数值可保持语义不变，由这里统一节流。
 */

/**
 * 玩家等级配置接口
 */
export interface PlayerLevelConfig {
    maxLevel: number; // 最大等级
    baseExp: number; // 基础经验值（影响每级所需总经验曲线）
    expGrowthFactor: number; // 经验增长因子（等级^factor）
    /**
     * 所有写入 `PlayerLevelService.addExperience` 的经验在入账前乘以该系数（再 floor）。
     * 1 = 不额外节流；0.2 = 只保留 20% 作为账号经验（适合「慢成长、非主养成」）。
     */
    globalExpGainMultiplier: number;
}

/**
 * 默认玩家等级配置
 */
export const DEFAULT_PLAYER_LEVEL_CONFIG: PlayerLevelConfig = {
    maxLevel: 100,
    /** 升级曲线；若需整体「更难升级」再调大，注意与存量 `players.exp` 展示一致 */
    baseExp: 100,
    expGrowthFactor: 1.5,
    /** 账号经验全局放慢；调大则更慢，调为 1 则关闭该层节流 */
    globalExpGainMultiplier: 0.2,
};

