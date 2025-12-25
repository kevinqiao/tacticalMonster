/**
 * 计分配置数据
 * 包含所有版本的计分配置
 */

export interface ScoringConfig {
    // 行动得分
    actionScores: {
        defeatBoss: number;
        defeatMinion: number;
        attack: number;
        skillUse: number;
        walk: number;
    };
    
    // 效率奖励目标值（固定）
    efficiency: {
        targetTime: number;      // 毫秒
        targetRounds: number;
        maxTimeBonus: number;
        maxRoundBonus: number;
    };
    
    // 存活奖励
    survival: {
        perfectBonus: number;
        survivalRateBonus: number;
        highHpBonus: number;
        highHpThreshold: number;
    };
    
    // 结果得分
    resultScores: {
        win: number;
        draw: number;
        lose: number;
    };
    
    // 时间限制
    timeLimit: {
        totalTime: number;  // 秒
    };
}

/**
 * 计分配置版本
 */
export interface ScoringConfigVersion {
    version: string;              // 版本ID，如 "1.0.0", "1.1.0"
    config: ScoringConfig;
    description?: string;         // 版本说明
    effectiveFrom?: string;       // 生效时间（ISO字符串）
}

/**
 * 所有版本的计分配置
 */
export const SCORING_CONFIG_VERSIONS: Record<string, ScoringConfigVersion> = {
    "1.0.0": {
        version: "1.0.0",
        description: "初始版本",
        effectiveFrom: "2024-01-01T00:00:00Z",
        config: {
            actionScores: {
                defeatBoss: 200,
                defeatMinion: 50,
                attack: 5,
                skillUse: 15,
                walk: 0
            },
            efficiency: {
                targetTime: 60 * 1000,  // 60秒
                targetRounds: 10,
                maxTimeBonus: 200,
                maxRoundBonus: 150
            },
            survival: {
                perfectBonus: 300,
                survivalRateBonus: 200,
                highHpBonus: 100,
                highHpThreshold: 0.8
            },
            resultScores: {
                win: 400,
                draw: 0,
                lose: -100
            },
            timeLimit: {
                totalTime: 300  // 5分钟
            }
        }
    },
    
    "1.1.0": {
        version: "1.1.0",
        description: "提高击败Boss得分，调整效率奖励",
        effectiveFrom: "2024-02-01T00:00:00Z",
        config: {
            actionScores: {
                defeatBoss: 300,  // 从200提高到300
                defeatMinion: 50,
                attack: 5,
                skillUse: 15,
                walk: 0
            },
            efficiency: {
                targetTime: 60 * 1000,
                targetRounds: 10,
                maxTimeBonus: 250,  // 从200提高到250
                maxRoundBonus: 150
            },
            survival: {
                perfectBonus: 300,
                survivalRateBonus: 200,
                highHpBonus: 100,
                highHpThreshold: 0.8
            },
            resultScores: {
                win: 400,
                draw: 0,
                lose: -100
            },
            timeLimit: {
                totalTime: 300
            }
        }
    },
    
    "1.2.0": {
        version: "1.2.0",
        description: "调整存活奖励，提高完美存活奖励",
        effectiveFrom: "2024-03-01T00:00:00Z",
        config: {
            actionScores: {
                defeatBoss: 300,
                defeatMinion: 50,
                attack: 5,
                skillUse: 15,
                walk: 0
            },
            efficiency: {
                targetTime: 60 * 1000,
                targetRounds: 10,
                maxTimeBonus: 250,
                maxRoundBonus: 150
            },
            survival: {
                perfectBonus: 400,  // 从300提高到400
                survivalRateBonus: 200,
                highHpBonus: 100,
                highHpThreshold: 0.8
            },
            resultScores: {
                win: 400,
                draw: 0,
                lose: -100
            },
            timeLimit: {
                totalTime: 300
            }
        }
    }
};

/**
 * 获取当前默认的配置版本ID
 */
export const DEFAULT_SCORING_CONFIG_VERSION = "1.2.0";

/**
 * 获取指定版本的配置
 */
export function getScoringConfig(version: string): ScoringConfig | null {
    const configVersion = SCORING_CONFIG_VERSIONS[version];
    return configVersion?.config || null;
}

/**
 * 获取当前默认配置
 */
export function getDefaultScoringConfig(): ScoringConfig {
    return getScoringConfig(DEFAULT_SCORING_CONFIG_VERSION) || SCORING_CONFIG_VERSIONS["1.0.0"].config;
}

/**
 * 获取所有可用的配置版本列表
 */
export function getAllScoringConfigVersions(): ScoringConfigVersion[] {
    return Object.values(SCORING_CONFIG_VERSIONS);
}

/**
 * 检查配置版本是否存在
 */
export function hasScoringConfigVersion(version: string): boolean {
    return version in SCORING_CONFIG_VERSIONS;
}

