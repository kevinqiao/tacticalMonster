/**
 * 赛季积分配置
 * 集中管理所有赛季积分相关的配置
 */

/**
 * 赛季积分配置接口
 */
export interface SeasonPointsConfig {
    // 游戏完成积分配置
    gameExp: {
        rankBasePoints: {           // 排名基础分
            [rank: number]: number;
        };
        tierMultiplier: {           // Tier加成
            bronze: number;
            silver: number;
            gold: number;
            platinum: number;
        };
        scoreMultiplier: {          // 分数加成
            excellent: number;      // >=90分
            good: number;           // >=80分
        };
    };
    
    // 怪物升级积分配置
    upgradeExp: {
        rarityBase: {               // 稀有度基础分
            Common: number;
            Rare: number;
            Epic: number;
            Legendary: number;
        };
        levelBonus: {               // 等级奖励
            per10Levels: number;    // 每10级额外奖励
        };
    };
    
    // 怪物升星积分配置
    starUpExp: {
        rarityBase: {               // 稀有度基础分
            Common: number;
            Rare: number;
            Epic: number;
            Legendary: number;
        };
        starMultiplier: boolean;    // 是否使用星级倍数
        highStarBonus: {            // 高星级额外奖励
            threshold: number;      // 阈值（5星）
            bonusPerStar: number;   // 每星额外奖励
        };
    };
    
    // 宝箱开启积分配置
    chestExp: {
        chestPoints: {              // 宝箱积分
            silver: number;
            gold: number;
            purple: number;
            orange: number;
        };
    };
    
    // Boss击败积分配置
    bossExp: {
        difficultyPoints: {         // 难度积分
            easy: number;
            medium: number;
            hard: number;
            expert: number;
        };
    };
}

/**
 * 默认赛季积分配置
 */
export const DEFAULT_SEASON_POINTS_CONFIG: SeasonPointsConfig = {
    gameExp: {
        rankBasePoints: {
            1: 100,   // 第1名
            2: 80,    // 第2名
            3: 60,    // 第3名
            4: 50,    // 第4-5名
            5: 50,
            6: 40,    // 第6-10名
            7: 40,
            8: 40,
            9: 40,
            10: 40,
        },
        tierMultiplier: {
            bronze: 1.0,
            silver: 1.2,
            gold: 1.5,
            platinum: 2.0,
        },
        scoreMultiplier: {
            excellent: 1.2,  // >=90分
            good: 1.1,      // >=80分
        },
    },
    upgradeExp: {
        rarityBase: {
            Common: 5,
            Rare: 10,
            Epic: 15,
            Legendary: 20,
        },
        levelBonus: {
            per10Levels: 5,  // 每10级额外奖励5分
        },
    },
    starUpExp: {
        rarityBase: {
            Common: 20,
            Rare: 30,
            Epic: 50,
            Legendary: 100,
        },
        starMultiplier: true,  // 使用星级倍数
        highStarBonus: {
            threshold: 5,      // 5星及以上
            bonusPerStar: 50, // 每星额外奖励50分
        },
    },
    chestExp: {
        chestPoints: {
            silver: 10,
            gold: 20,
            purple: 30,
            orange: 50,
        },
    },
    bossExp: {
        difficultyPoints: {
            easy: 30,
            medium: 50,
            hard: 80,
            expert: 120,
        },
    },
};

