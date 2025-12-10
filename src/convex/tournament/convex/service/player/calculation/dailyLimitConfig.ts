/**
 * 每日上限配置
 * 统一管理经验值和赛季积分的每日上限
 */

/**
 * 每日上限配置接口
 */
export interface DailyLimitConfig {
    // 经验值每日上限
    exp: {
        totalDailyLimit: {
            fullReward: number;         // 全额奖励阶段：500分
            reducedReward: number;      // 递减奖励阶段：500分
            reductionRate: number;     // 递减率：每100分减少10%
            reductionStep: number;      // 递减阶梯：100分
            minRewardRate: number;      // 最小奖励率：10%
        };
        sourceLimits?: {                // 单个来源的上限
            [source: string]: {
                maxPoints: number;
            };
        };
    };
    
    // 赛季积分每日上限
    seasonPoints: {
        totalDailyLimit: {
            fullReward: number;         // 全额奖励阶段：500分
            reducedReward: number;      // 递减奖励阶段：500分
            reductionRate: number;     // 递减率：每100分减少10%
            reductionStep: number;      // 递减阶梯：100分
            minRewardRate: number;      // 最小奖励率：10%
        };
        sourceLimits?: {                // 单个来源的上限
            [source: string]: {
                maxPoints: number;
            };
        };
    };
}

/**
 * 默认每日上限配置
 */
export const DEFAULT_DAILY_LIMIT_CONFIG: DailyLimitConfig = {
    exp: {
        totalDailyLimit: {
            fullReward: 500,        // 前500分全额奖励
            reducedReward: 500,     // 接下来500分递减奖励
            reductionRate: 0.1,     // 每100分减少10%
            reductionStep: 100,     // 每100分一个递减阶梯
            minRewardRate: 0.1,     // 最低10%奖励
        },
        sourceLimits: {
            tournament: { maxPoints: 300 },      // 锦标赛最多300分
            task: { maxPoints: 200 },            // 任务最多200分
            activity: { maxPoints: 200 },       // 活动最多200分
        },
    },
    seasonPoints: {
        totalDailyLimit: {
            fullReward: 500,        // 前500分全额奖励
            reducedReward: 500,     // 接下来500分递减奖励
            reductionRate: 0.1,     // 每100分减少10%
            reductionStep: 100,     // 每100分一个递减阶梯
            minRewardRate: 0.1,     // 最低10%奖励
        },
        sourceLimits: {
            "tacticalMonster:monster_rumble": { maxPoints: 300 },      // 游戏最多300分
            "tacticalMonster:monster_upgrade": { maxPoints: 200 },    // 升级最多200分
            "tacticalMonster:monster_star_up": { maxPoints: 300 },     // 升星最多300分
            "tacticalMonster:chest_open": { maxPoints: 150 },          // 宝箱最多150分
        },
    },
};

