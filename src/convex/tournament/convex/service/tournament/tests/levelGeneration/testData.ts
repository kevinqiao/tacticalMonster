/**
 * 关卡生成测试数据
 * 包含测试用的生成规则配置和预期的关卡配置结果
 */

import { TournamentConfig } from "../../../../data/tournamentConfigs";

/**
 * 测试用的生成规则ID
 */
export const TEST_RULE_IDS = {
    BRONZE: "challenge_bronze_generation",
    SILVER: "challenge_silver_generation",
    GOLD: "challenge_gold_generation",
    PLATINUM: "challenge_platinum_generation",
    INVALID: "invalid_rule_id",
} as const;

/**
 * 预期的关卡配置验证结果
 */
export interface ExpectedLevelConfig {
    typeId: string;
    name: string;
    levelNumber: number;
    bossId?: string;
    difficultyMultiplier?: number;
    hasPerformanceRewards: boolean;
    hasRankRewards: boolean;
    previousLevels?: string[];
    nextLevels?: string[];
}

/**
 * Bronze Tier 预期的关卡配置
 */
export const EXPECTED_BRONZE_LEVELS: ExpectedLevelConfig[] = [
    {
        typeId: "monster_rumble_challenge_bronze_boss_1",
        name: "青铜挑战 - Boss 1",
        levelNumber: 1,
        bossId: "boss_bronze_1",
        difficultyMultiplier: 1.0,
        hasPerformanceRewards: true,
        hasRankRewards: false,
        previousLevels: [],
        nextLevels: ["monster_rumble_challenge_bronze_boss_2"],
    },
    {
        typeId: "monster_rumble_challenge_bronze_boss_2",
        name: "青铜挑战 - Boss 2",
        levelNumber: 2,
        bossId: "boss_bronze_2",
        difficultyMultiplier: 1.1,
        hasPerformanceRewards: true,
        hasRankRewards: false,
        previousLevels: ["monster_rumble_challenge_bronze_boss_1"],
        nextLevels: ["monster_rumble_challenge_bronze_boss_3"],
    },
    {
        typeId: "monster_rumble_challenge_bronze_boss_3",
        name: "青铜挑战 - Boss 3",
        levelNumber: 3,
        bossId: "boss_bronze_1",
        difficultyMultiplier: 1.2,
        hasPerformanceRewards: true,
        hasRankRewards: false,
        previousLevels: ["monster_rumble_challenge_bronze_boss_2"],
        nextLevels: ["monster_rumble_challenge_bronze_boss_4"],
    },
    {
        typeId: "monster_rumble_challenge_bronze_boss_4",
        name: "青铜挑战 - Boss 4",
        levelNumber: 4,
        bossId: "boss_bronze_2",
        difficultyMultiplier: 1.3,
        hasPerformanceRewards: true,
        hasRankRewards: false,
        previousLevels: ["monster_rumble_challenge_bronze_boss_3"],
        nextLevels: ["monster_rumble_challenge_bronze_boss_5"],
    },
    {
        typeId: "monster_rumble_challenge_bronze_boss_5",
        name: "青铜挑战 - Boss 5",
        levelNumber: 5,
        bossId: "boss_bronze_1",
        difficultyMultiplier: 1.5,
        hasPerformanceRewards: true,
        hasRankRewards: false,
        previousLevels: ["monster_rumble_challenge_bronze_boss_4"],
        nextLevels: ["monster_rumble_challenge_silver_boss_1"],
    },
];

/**
 * 验证关卡配置是否符合预期
 */
export function validateLevelConfig(
    level: TournamentConfig,
    expected: ExpectedLevelConfig
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证基础字段
    if (level.typeId !== expected.typeId) {
        errors.push(`typeId 不匹配: 期望 ${expected.typeId}, 实际 ${level.typeId}`);
    }

    if (level.name !== expected.name) {
        errors.push(`name 不匹配: 期望 ${expected.name}, 实际 ${level.name}`);
    }

    if (level.soloChallenge?.levelNumber !== expected.levelNumber) {
        errors.push(`levelNumber 不匹配: 期望 ${expected.levelNumber}, 实际 ${level.soloChallenge?.levelNumber}`);
    }

    // 验证 Boss 配置
    if (expected.bossId && level.soloChallenge?.levelContent?.bossConfig?.bossId !== expected.bossId) {
        errors.push(`bossId 不匹配: 期望 ${expected.bossId}, 实际 ${level.soloChallenge?.levelContent?.bossConfig?.bossId}`);
    }

    // 验证难度倍数
    if (expected.difficultyMultiplier !== undefined) {
        const actualMultiplier = level.soloChallenge?.levelContent?.difficultyAdjustment?.difficultyMultiplier;
        if (actualMultiplier !== expected.difficultyMultiplier) {
            errors.push(`difficultyMultiplier 不匹配: 期望 ${expected.difficultyMultiplier}, 实际 ${actualMultiplier}`);
        }
    }

    // 验证奖励配置
    if (expected.hasPerformanceRewards && !level.rewards.performanceRewards) {
        errors.push("缺少 performanceRewards 配置");
    }

    if (!expected.hasPerformanceRewards && level.rewards.performanceRewards) {
        errors.push("不应该有 performanceRewards 配置");
    }

    if (expected.hasRankRewards && (!level.rewards.rankRewards || level.rewards.rankRewards.length === 0)) {
        errors.push("缺少 rankRewards 配置");
    }

    if (!expected.hasRankRewards && level.rewards.rankRewards && level.rewards.rankRewards.length > 0) {
        errors.push("不应该有 rankRewards 配置");
    }

    // 验证关卡链关系
    const actualPreviousLevels = level.soloChallenge?.levelChain?.previousLevels || [];
    const actualNextLevels = level.soloChallenge?.levelChain?.nextLevels || [];

    if (expected.previousLevels) {
        const missing = expected.previousLevels.filter(id => !actualPreviousLevels.includes(id));
        const extra = actualPreviousLevels.filter(id => !expected.previousLevels!.includes(id));
        if (missing.length > 0) {
            errors.push(`缺少前置关卡: ${missing.join(", ")}`);
        }
        if (extra.length > 0) {
            errors.push(`多余的前置关卡: ${extra.join(", ")}`);
        }
    }

    if (expected.nextLevels) {
        const missing = expected.nextLevels.filter(id => !actualNextLevels.includes(id));
        const extra = actualNextLevels.filter(id => !expected.nextLevels!.includes(id));
        if (missing.length > 0) {
            errors.push(`缺少下一关卡: ${missing.join(", ")}`);
        }
        if (extra.length > 0) {
            errors.push(`多余的下一关卡: ${extra.join(", ")}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

