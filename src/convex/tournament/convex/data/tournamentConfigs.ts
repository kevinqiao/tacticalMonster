/**
 * 锦标赛配置：合并 tutorial / solo_challenge / multiplayer 分片，并导出查询与校验。
 * 类型定义见 `./tournamentConfigTypes`。
 */
export * from "./tournamentConfigTypes";

import type {
    MatchRules,
    TournamentConfig,
    TournamentModeType,
} from "./tournamentConfigTypes";
import { TOURNAMENT_CONFIGS_MULTIPLAYER } from "./tournamentConfigsMultiplayer";
import { TOURNAMENT_CONFIGS_SOLO_CHALLENGE } from "./tournamentConfigsSoloChallenge";
import { TOURNAMENT_CONFIGS_SOLO_MAIN } from "./tournamentConfigsSoloMain";
import { TOURNAMENT_CONFIGS_TUTORIAL } from "./tournamentConfigsTutorial";

export const TOURNAMENT_CONFIGS: TournamentConfig[] = [
    ...TOURNAMENT_CONFIGS_TUTORIAL,
    ...TOURNAMENT_CONFIGS_SOLO_CHALLENGE,
    ...TOURNAMENT_CONFIGS_SOLO_MAIN,
    ...TOURNAMENT_CONFIGS_MULTIPLAYER,
];

(() => {
    const seen = new Set<string>();
    for (const c of TOURNAMENT_CONFIGS) {
        if (seen.has(c.typeId)) {
            throw new Error(`[tournamentConfigs] Duplicate typeId: ${c.typeId}`);
        }
        seen.add(c.typeId);
    }
})();

/**
 * 转换旧格式配置为新格式（向后兼容）
 * 将 type 和 stageRuleId 转换为 gameRule 对象
 * 注意：此函数用于向后兼容，新配置应直接使用 gameRule 格式
 */
function convertToSchemaFormat(config: any): TournamentConfig {
    const converted: any = { ...config };

    // 如果有 stageRuleId，转换为 gameRule 对象
    if (config.stageRuleId && !config.gameRule) {
        const mode = config.type === "challenge" ? "challenge"
            : config.type === "arena" ? "pvp"
                : config.type === "story" ? "story"
                    : "challenge"; // 默认值

        converted.gameRule = {
            description: config.description || config.name,
            mode: mode as "challenge" | "pvp" | "story",
            ruleId: config.stageRuleId,
        };
    }

    // 移除旧字段（如果存在）
    delete converted.type;
    delete converted.stageRuleId;
    delete converted.stageRule; // 兼容旧版本的 stageRule
    delete converted.priority; // schema 中无此字段

    const mr = converted.matchRules as {
        mode?: TournamentModeType;
        modeType?: TournamentModeType;
    } | undefined;
    if (mr?.mode && !converted.mode) {
        converted.mode = mr.mode;
    }
    if (mr?.modeType && !converted.mode) {
        converted.mode = mr.modeType;
    }
    if (converted.matchRules && typeof converted.matchRules === "object") {
        const mrClean = { ...(converted.matchRules as Record<string, unknown>) };
        delete mrClean.modeType;
        delete mrClean.mode;
        converted.matchRules = mrClean as unknown as MatchRules;
    }

    return converted as TournamentConfig;
}

/**
 * 获取锦标赛配置
 */
export function getTournamentConfig(typeId: string): TournamentConfig | undefined {
    const config = TOURNAMENT_CONFIGS.find(config => config.typeId === typeId);
    if (!config) return undefined;

    // 如果是旧格式，转换为新格式
    if ((config as any).type || (config as any).stageRuleId) {
        return convertToSchemaFormat(config);
    }

    return config;
}

/**
 * Tactical Monster：从锦标赛静态配置收集所有 matchRules.ruleId（教学 / Solo Challenge / Multiplayer 等），
 * 与 stageRuleConfigs 取并集后由 getAllRuleStatuses 返回完整关卡状态。
 */
export function getTacticalMonsterRuleIdsFromTournamentConfigs(): string[] {
    const ids = new Set<string>();
    for (const raw of TOURNAMENT_CONFIGS) {
        if (raw.gameType !== "tacticalMonster") continue;
        const c = getTournamentConfig(raw.typeId);
        if (!c) continue;
        const rid = c.matchRules?.ruleId ?? (c as any).gameRule?.ruleId;
        if (typeof rid === "string" && rid.length > 0) {
            ids.add(rid);
        }
    }
    return [...ids];
}

/**
 * 按关卡 ruleId 解析锦标赛配置（用于 mode 等）
 */
export function getTournamentConfigByRuleId(ruleId: string): TournamentConfig | undefined {
    for (const raw of TOURNAMENT_CONFIGS) {
        if (raw.gameType !== "tacticalMonster") continue;
        const c = getTournamentConfig(raw.typeId);
        if (!c) continue;
        const rid = c.matchRules?.ruleId ?? (c as any).gameRule?.ruleId;
        if (rid === ruleId) {
            return c;
        }
    }
    return undefined;
}

/**
 * 获取活跃的锦标赛配置
 */
export function getActiveTournamentConfigs(): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config => config.isActive)
        .map(config => {
            // 如果是旧格式，转换为新格式
            if ((config as any).type || (config as any).stageRuleId) {
                return convertToSchemaFormat(config);
            }
            return config;
        });
}

/**
 * 按游戏类型获取锦标赛配置
 */
export function getTournamentConfigsByGameType(gameType: string): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config => (config.gameType === gameType) && config.isActive)
        .map(config => {
            // 如果是旧格式，转换为新格式
            if ((config as any).type || (config as any).stageRuleId) {
                return convertToSchemaFormat(config);
            }
            return config;
        });
}

/**
 * 验证锦标赛配置
 */
export function validateTournamentConfig(config: TournamentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基础验证
    if (!config.typeId) errors.push("typeId 是必需的");
    if (!config.name) errors.push("name 是必需的");
    if (!config.description) errors.push("description 是必需的");
    if (!config.gameType) errors.push("gameType 是必需的");

    // 参赛条件验证
    if (config.entryRequirements) {
        // 入场费验证
        if (config.entryRequirements.entryFee) {
            // TacticalMonster 游戏可以包含能量消耗
            if (config.gameType !== "tacticalMonster" && config.entryRequirements.entryFee.energy) {
                errors.push(`能量消耗仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
            }
        }
        // 注意：Power 范围（minTeamPower/maxTeamPower）从 GameRuleConfig.unlockConditions 获取，不在此处验证
    }

    // 比赛规则验证
    if (!config.matchRules) {
        errors.push("matchRules 是必需的");
    } else {
        if (config.matchRules.minPlayers < 1) errors.push("minPlayers 必须大于等于 1");
        if (config.matchRules.maxPlayers < config.matchRules.minPlayers) {
            errors.push("maxPlayers 必须大于等于 minPlayers");
        }
    }

    // 奖励配置验证
    if (!config.rewards) {
        errors.push("rewards 是必需的");
    } else {
        if (!config.rewards.baseRewards) errors.push("baseRewards 是必需的");

        // 单人挑战 vs 多人比赛的奖励验证
        const isSinglePlayer = config.matchRules.minPlayers === 1 && config.matchRules.maxPlayers === 1;

        if (isSinglePlayer) {
            // 单人挑战推荐使用 performanceRewards，但不强制（向后兼容）
            if (!config.rewards.performanceRewards && (!config.rewards.rankRewards || config.rewards.rankRewards.length === 0)) {
                errors.push("单人挑战（minPlayers=1, maxPlayers=1）建议配置 performanceRewards");
            }
        } else {
            // 多人比赛必须使用 rankRewards，不能使用 performanceRewards
            if (!config.rewards.rankRewards || config.rewards.rankRewards.length === 0) {
                errors.push("多人比赛（minPlayers>1 或 maxPlayers>1）必须配置 rankRewards");
            }
            if (config.rewards.performanceRewards) {
                errors.push("多人比赛（minPlayers>1 或 maxPlayers>1）不应配置 performanceRewards，应使用 rankRewards");
            }
        }

    }

    // 限制配置验证
    if (!config.limits) {
        errors.push("limits 是必需的");
    } else {
        // 验证 maxAttempts
        if (config.limits.maxAttempts !== undefined && config.limits.maxAttempts < 0) {
            errors.push("maxAttempts 必须大于等于 0");
        }
        // 验证 attemptCost
        if (config.limits.attemptCost) {
            if (config.limits.attemptCost.coins !== undefined && config.limits.attemptCost.coins < 0) {
                errors.push("attemptCost.coins 必须大于等于 0");
            }
            if (config.limits.attemptCost.energy !== undefined && config.limits.attemptCost.energy < 0) {
                errors.push("attemptCost.energy 必须大于等于 0");
            }
        }
    }

    // firstClearRewards 验证（仅用于单人关卡）
    if (config.rewards.firstClearRewards) {
        const isSinglePlayer = config.matchRules.minPlayers === 1 && config.matchRules.maxPlayers === 1;
        if (!isSinglePlayer) {
            errors.push("firstClearRewards 仅适用于单人关卡（minPlayers=1, maxPlayers=1）");
        }
        // 验证 firstClearRewards.chestTypeWeights 权重总和
        if (config.rewards.firstClearRewards.chestTypeWeights) {
            const weights = config.rewards.firstClearRewards.chestTypeWeights;
            const sum = (weights.silver || 0) + (weights.gold || 0) + (weights.purple || 0) + (weights.orange || 0);
            if (sum < 0.99 || sum > 1.01) {
                errors.push(`firstClearRewards.chestTypeWeights 权重总和应为 1.0，当前为 ${sum}`);
            }
        }
        // 验证 firstClearRewards.chestDropRate 范围
        if (config.rewards.firstClearRewards.chestDropRate !== undefined) {
            if (config.rewards.firstClearRewards.chestDropRate < 0 || config.rewards.firstClearRewards.chestDropRate > 1) {
                errors.push("firstClearRewards.chestDropRate 必须在 0-1 之间");
            }
        }
    }

    // chestTypeWeights 验证
    // 验证 rankRewards 中每个项的 chestTypeWeights
    if (config.rewards.rankRewards) {
        for (const rankReward of config.rewards.rankRewards) {
            if (rankReward.chestTypeWeights) {
                const weights = rankReward.chestTypeWeights;
                const sum = (weights.silver || 0) + (weights.gold || 0) + (weights.purple || 0) + (weights.orange || 0);
                if (sum < 0.99 || sum > 1.01) {
                    errors.push(`rankRewards[${rankReward.rankRange[0]}-${rankReward.rankRange[1]}].chestTypeWeights 权重总和应为 1.0，当前为 ${sum}`);
                }
            }
            if (rankReward.chestDropRate !== undefined) {
                if (rankReward.chestDropRate < 0 || rankReward.chestDropRate > 1) {
                    errors.push(`rankRewards[${rankReward.rankRange[0]}-${rankReward.rankRange[1]}].chestDropRate 必须在 0-1 之间`);
                }
            }
        }
    }

    // 验证 performanceRewards.levelRewards 中每个等级的 chestTypeWeights
    if (config.rewards.performanceRewards?.levelRewards) {
        for (const [levelKey, levelReward] of Object.entries(config.rewards.performanceRewards.levelRewards)) {
            if (levelReward.chestTypeWeights) {
                const weights = levelReward.chestTypeWeights;
                const sum = (weights.silver || 0) + (weights.gold || 0) + (weights.purple || 0) + (weights.orange || 0);
                if (sum < 0.99 || sum > 1.01) {
                    errors.push(`performanceRewards.levelRewards[${levelKey}].chestTypeWeights 权重总和应为 1.0，当前为 ${sum}`);
                }
            }
            if (levelReward.chestDropRate !== undefined) {
                if (levelReward.chestDropRate < 0 || levelReward.chestDropRate > 1) {
                    errors.push(`performanceRewards.levelRewards[${levelKey}].chestDropRate 必须在 0-1 之间`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
