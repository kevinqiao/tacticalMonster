/**
 * 锦标赛配置类型定义（与 Convex `tournament_types` / `src/convex/tournament/convex/data/tournamentConfigs.ts` 对齐）
 *
 * 运行时数据以服务端为准：`getAvailableTournaments` 等返回的 `config`。
 * 本文件不维护静态 TOURNAMENT_CONFIGS，避免与数据库双源。
 */
export interface TournamentConfig {
    typeId: string;
    name: string;
    description: string;
    timeRange?: string;
    gameType?: GameName;
    isActive: boolean;
    /** TacticalMonster 等：tutorial / solo_challenge / multiplayer_tournament（与 tournament_types.mode 一致） */
    mode?: TournamentModeType;
    /** @deprecated 旧字段名，与 mode 同义 */
    modeType?: TournamentModeType;
    entryRequirements?: EntryRequirements;
    matchRules: MatchRules;
    rewards: RewardConfig;
    limits?: LimitConfig;
    createdAt?: string;
    updatedAt?: string;
}

export type GameName =
    | "solitaire"
    | "rummy"
    | "uno"
    | "ludo"
    | "chess"
    | "checkers"
    | "puzzle"
    | "arcade"
    | "tacticalMonster";

export interface EntryRequirements {
    isSubscribedRequired: boolean;
    playerLevel?: number;
    teamPower?: number;
    entryFee: {
        coins?: number;
        gems?: number;
        energy?: number;
    };
}

/** 各 gameType 可扩展；TacticalMonster：tutorial / solo_challenge / multiplayer_tournament */
export type TournamentModeType = "tutorial" | "solo_challenge" | "multiplayer_tournament";

export interface MatchRules {
    minPlayers: number;
    maxPlayers: number;
    type?: "by_rank" | "by_performance";
    ruleId?: string;
}

export interface ChestTypeWeights {
    silver?: number;
    gold?: number;
    purple?: number;
    orange?: number;
}

export interface RewardConfig {
    type?: "by_performance" | "by_rank";
    baseRewards: {
        coins?: number;
        energy?: number;
        chestDropRate?: number;
    };
    rankRewards?: Array<{
        rankRange: number[];
        multiplier: number;
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        energy?: number;
        chestDropRate?: number;
        chestTypeWeights?: ChestTypeWeights;
    }>;
    subscribedPlayerExtraRewards?: {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        energy?: number;
    };
    performanceRewards?: {
        baseReward: {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        };
        levelRewards?: Record<string, {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
            chestDropRate?: number;
            chestTypeWeights?: ChestTypeWeights;
        }>;
    };
    firstClearRewards?: {
        coins?: number;
        energy?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
        chestDropRate?: number;
        chestTypeWeights?: ChestTypeWeights;
    };
}

export interface LimitConfig {
    pastHours?: number;
    maxAttempts?: number;
    subscribed?: { maxAttempts?: number };
    retryConfig?: {
        maxAttempts?: number;
        retryCost?: { coins?: number; energy?: number };
        unlimitedRetries?: boolean;
    };
}

export function validateTournamentConfig(config: TournamentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.typeId) errors.push("typeId 是必需的");
    if (!config.name) errors.push("name 是必需的");
    if (!config.description) errors.push("description 是必需的");
    if (!config.gameType) errors.push("gameType 是必需的");

    if (config.entryRequirements?.entryFee) {
        if (config.gameType !== "tacticalMonster" && config.entryRequirements.entryFee.energy) {
            errors.push(`能量消耗仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
        }
    }

    if (!config.matchRules) {
        errors.push("matchRules 是必需的");
    } else {
        if (config.matchRules.minPlayers < 1) errors.push("minPlayers 必须大于等于 1");
        if (config.matchRules.maxPlayers < config.matchRules.minPlayers) {
            errors.push("maxPlayers 必须大于等于 minPlayers");
        }
    }

    if (!config.rewards) {
        errors.push("rewards 是必需的");
    } else {
        if (!config.rewards.baseRewards) errors.push("baseRewards 是必需的");

        const isSinglePlayer = config.matchRules.minPlayers === 1 && config.matchRules.maxPlayers === 1;

        if (isSinglePlayer) {
            if (!config.rewards.performanceRewards && (!config.rewards.rankRewards || config.rewards.rankRewards.length === 0)) {
                errors.push("单人挑战（minPlayers=1, maxPlayers=1）建议配置 performanceRewards");
            }
        } else {
            if (!config.rewards.rankRewards || config.rewards.rankRewards.length === 0) {
                errors.push("多人比赛（minPlayers>1 或 maxPlayers>1）必须配置 rankRewards");
            }
            if (config.rewards.performanceRewards) {
                errors.push("多人比赛（minPlayers>1 或 maxPlayers>1）不应配置 performanceRewards，应使用 rankRewards");
            }
        }
    }

    if (!config.limits) {
        errors.push("limits 是必需的");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
