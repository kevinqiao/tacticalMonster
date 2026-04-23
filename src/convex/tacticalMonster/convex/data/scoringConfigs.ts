/**
 * 对局计分（单一配置，未运营上线前不保留多版本）
 *
 * 总分 = 回合效率分 + 存活分 + 胜败分
 * 局内不累计分；`timeLimit.totalTime` 仅用于超时判局，不参与计分。
 */

export interface ScoringConfig {
    efficiency: {
        targetRounds: number;
        maxRoundBonus: number;
    };
    survival: {
        perfectBonus: number;
        survivalRateBonus: number;
        highHpBonus: number;
        highHpThreshold: number;
    };
    resultScores: {
        win: number;
        draw: number;
        lose: number;
    };
    timeLimit: {
        totalTime: number;
    };
}

/** 唯一计分表 */
export const SCORING_CONFIG: ScoringConfig = {
    efficiency: {
        targetRounds: 12,
        maxRoundBonus: 1000,
    },
    survival: {
        perfectBonus: 1200,
        survivalRateBonus: 600,
        highHpBonus: 400,
        highHpThreshold: 0.8,
    },
    resultScores: {
        win: 1500,
        draw: 0,
        lose: -100,
    },
    timeLimit: {
        totalTime: 300,
    },
};

export const DEFAULT_SCORING_CONFIG_VERSION = "1.0.0";

export function getScoringConfig(_version?: string): ScoringConfig {
    return SCORING_CONFIG;
}

export function getDefaultScoringConfig(): ScoringConfig {
    return SCORING_CONFIG;
}

/** 重播 UI 等：仅一条配置 */
export function getScoringConfigVersionsList(): { version: string; config: ScoringConfig }[] {
    return [{ version: DEFAULT_SCORING_CONFIG_VERSION, config: SCORING_CONFIG }];
}
