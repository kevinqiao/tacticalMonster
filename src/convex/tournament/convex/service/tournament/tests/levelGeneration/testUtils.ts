/**
 * 关卡生成测试工具函数
 * 提供清理测试数据、验证关卡配置等辅助函数
 */

import { TournamentConfig, validateTournamentConfig } from "../../../../data/tournamentConfigs";

/**
 * 清理测试关卡数据
 */
export async function cleanupTestLevels(
    ctx: any,
    typeIds: string[]
): Promise<{ deleted: number; errors: string[] }> {
    let deleted = 0;
    const errors: string[] = [];

    for (const typeId of typeIds) {
        try {
            const existing = await ctx.db
                .query("tournament_types")
                .withIndex("by_typeId", (q: any) => q.eq("typeId", typeId))
                .first();

            if (existing) {
                await ctx.db.delete(existing._id);
                deleted++;
            }
        } catch (error: any) {
            errors.push(`删除关卡 ${typeId} 失败: ${error.message}`);
        }
    }

    return { deleted, errors };
}

/**
 * 验证关卡配置的完整性
 */
export function validateLevelConfigCompleteness(level: TournamentConfig): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // 基础验证
    if (!level.typeId) errors.push("缺少 typeId");
    if (!level.name) errors.push("缺少 name");
    if (!level.gameType) errors.push("缺少 gameType");

    // 单人关卡验证
    const isSinglePlayer = level.matchRules.minPlayers === 1 && level.matchRules.maxPlayers === 1;
    if (isSinglePlayer) {
        if (!level.soloChallenge) {
            errors.push("单人关卡缺少 soloChallenge 配置");
        } else {
            if (!level.soloChallenge.levelType) {
                errors.push("缺少 soloChallenge.levelType");
            }
            if (level.soloChallenge.levelNumber === undefined) {
                errors.push("缺少 soloChallenge.levelNumber");
            }
        }

        // 验证奖励配置
        if (!level.rewards.performanceRewards) {
            errors.push("单人关卡缺少 performanceRewards");
        }
        if (level.rewards.rankRewards && level.rewards.rankRewards.length > 0) {
            errors.push("单人关卡不应配置 rankRewards");
        }
    } else {
        // 多人比赛验证
        if (!level.rewards.rankRewards || level.rewards.rankRewards.length === 0) {
            errors.push("多人比赛缺少 rankRewards");
        }
        if (level.rewards.performanceRewards) {
            errors.push("多人比赛不应配置 performanceRewards");
        }
    }

    // 使用官方验证函数
    const officialValidation = validateTournamentConfig(level);
    if (!officialValidation.valid) {
        errors.push(...officialValidation.errors);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * 验证关卡链关系
 */
export function validateLevelChain(levels: TournamentConfig[]): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    const levelMap = new Map<string, TournamentConfig>();

    // 建立关卡映射
    for (const level of levels) {
        if (level.typeId) {
            levelMap.set(level.typeId, level);
        }
    }

    // 验证每个关卡的链关系
    for (const level of levels) {
        const soloChallenge = level.soloChallenge;
        if (!soloChallenge?.levelChain) {
            continue;
        }

        const chain = soloChallenge.levelChain;

        // 验证前置关卡存在
        if (chain.previousLevels) {
            for (const prevId of chain.previousLevels) {
                if (!levelMap.has(prevId)) {
                    errors.push(`关卡 ${level.typeId} 的前置关卡 ${prevId} 不存在`);
                } else {
                    // 验证前置关卡指向当前关卡
                    const prevLevel = levelMap.get(prevId)!;
                    const prevNextLevels = prevLevel.soloChallenge?.levelChain?.nextLevels || [];
                    if (!prevNextLevels.includes(level.typeId)) {
                        errors.push(`关卡 ${prevId} 的 nextLevels 中没有包含 ${level.typeId}`);
                    }
                }
            }
        }

        // 验证下一关卡存在
        if (chain.nextLevels) {
            for (const nextId of chain.nextLevels) {
                if (!levelMap.has(nextId)) {
                    errors.push(`关卡 ${level.typeId} 的下一关卡 ${nextId} 不存在`);
                } else {
                    // 验证下一关卡指向当前关卡
                    const nextLevel = levelMap.get(nextId)!;
                    const nextPreviousLevels = nextLevel.soloChallenge?.levelChain?.previousLevels || [];
                    if (!nextPreviousLevels.includes(level.typeId)) {
                        errors.push(`关卡 ${nextId} 的 previousLevels 中没有包含 ${level.typeId}`);
                    }
                }
            }
        }

        // 验证 chainOrder
        if (chain.chainOrder !== undefined) {
            const expectedOrder = soloChallenge.levelNumber || 0;
            if (chain.chainOrder !== expectedOrder) {
                errors.push(`关卡 ${level.typeId} 的 chainOrder (${chain.chainOrder}) 与 levelNumber (${expectedOrder}) 不匹配`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * 验证关卡难度递增
 */
export function validateDifficultyProgression(levels: TournamentConfig[]): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    const multipliers: number[] = [];

    for (const level of levels) {
        const multiplier = level.soloChallenge?.levelContent?.difficultyAdjustment?.difficultyMultiplier;
        if (multiplier !== undefined) {
            multipliers.push(multiplier);
        }
    }

    // 验证难度是否递增
    for (let i = 1; i < multipliers.length; i++) {
        if (multipliers[i] < multipliers[i - 1]) {
            errors.push(`关卡 ${i + 1} 的难度倍数 (${multipliers[i]}) 小于关卡 ${i} 的难度倍数 (${multipliers[i - 1]})`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * 获取关卡摘要信息（用于日志输出）
 */
export function getLevelSummary(level: TournamentConfig): string {
    const soloChallenge = level.soloChallenge;
    const chain = soloChallenge?.levelChain;

    return `关卡 ${level.typeId}:
  - 名称: ${level.name}
  - 关卡编号: ${soloChallenge?.levelNumber || "N/A"}
  - Boss: ${soloChallenge?.levelContent?.bossConfig?.bossId || "N/A"}
  - 难度倍数: ${soloChallenge?.levelContent?.difficultyAdjustment?.difficultyMultiplier || "N/A"}
  - 前置关卡: ${chain?.previousLevels?.join(", ") || "无"}
  - 下一关卡: ${chain?.nextLevels?.join(", ") || "无"}
  - 表现奖励: ${level.rewards.performanceRewards ? "是" : "否"}
  - 排名奖励: ${level.rewards.rankRewards && level.rewards.rankRewards.length > 0 ? "是" : "否"}`;
}

