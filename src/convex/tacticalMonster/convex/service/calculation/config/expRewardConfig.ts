/**
 * 经验值奖励配置
 * 集中管理所有经验值相关的配置
 */

/**
 * 经验值奖励配置接口
 */
export interface ExpRewardConfig {
    // 任务经验配置
    taskExp: {
        daily: {
            base: number;           // 每日任务基础经验：50
            difficultyMultiplier: { // 难度倍数
                easy: number;       // 1.0
                medium: number;     // 1.5
                hard: number;       // 2.0
            };
            valueBonusRate: number; // 奖励价值加成率：每100金币价值+10经验
        };
        weekly: {
            base: number;           // 每周任务基础经验：200
            difficultyMultiplier: {
                easy: number;
                medium: number;
                hard: number;
            };
            valueBonusRate: number;
        };
        achievement: {
            base: number;           // 成就任务基础经验：100
            difficultyMultiplier: {
                easy: number;
                medium: number;
                hard: number;
            };
            valueBonusRate: number;
        };
    };
    
    // 锦标赛经验配置
    tournamentExp: {
        participation: number;     // 参与奖励：50
        rankRewards: {              // 排名奖励
            [rankRange: string]: number; // "1-1": 200, "2-3": 150, "4-10": 100, "11-50": 50, "51+": 30
        };
        tierMultiplier: {           // Tier加成
            bronze: number;         // 1.0
            silver: number;         // 1.2
            gold: number;           // 1.5
            platinum: number;       // 2.0
        };
    };
    
    // 活动经验配置
    activityExp: {
        base: number;               // 活动基础经验：100
        multiplier: number;         // 活动倍数：1.0-2.0
    };
}

/**
 * 默认经验值奖励配置
 */
export const DEFAULT_EXP_REWARD_CONFIG: ExpRewardConfig = {
    taskExp: {
        daily: {
            base: 50,
            difficultyMultiplier: {
                easy: 1.0,
                medium: 1.5,
                hard: 2.0,
            },
            valueBonusRate: 10, // 每100金币价值+10经验
        },
        weekly: {
            base: 200,
            difficultyMultiplier: {
                easy: 1.0,
                medium: 1.5,
                hard: 2.0,
            },
            valueBonusRate: 10,
        },
        achievement: {
            base: 100,
            difficultyMultiplier: {
                easy: 1.0,
                medium: 1.5,
                hard: 2.0,
            },
            valueBonusRate: 10,
        },
    },
    tournamentExp: {
        participation: 50,
        rankRewards: {
            "1-1": 200,      // 第1名
            "2-3": 150,      // 第2-3名
            "4-10": 100,     // 第4-10名
            "11-50": 50,     // 第11-50名
            "51+": 30,       // 第51名及以后
        },
        tierMultiplier: {
            bronze: 1.0,
            silver: 1.2,
            gold: 1.5,
            platinum: 2.0,
        },
    },
    activityExp: {
        base: 100,
        multiplier: 1.0,
    },
};

