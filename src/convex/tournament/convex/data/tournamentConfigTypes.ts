/**
 * 锦标赛配置类型定义 - 基于 tournament_types schema
 * 
 * 重要说明：
 * - playerLevel: 玩家等级要求，在 EntryRequirements 中配置
 * - Power 范围（minTeamPower/maxTeamPower）在 GameRuleConfig.unlockConditions 中配置
 * - TacticalMonster：matchRules.ruleId；mode 在 TournamentConfig 顶层（与 tournament_types.mode 一致）
 * - gameRule：旧版 Convex 文档可选保留；新配置使用 matchRules
 * - 单人关卡：当 matchRules.minPlayers === 1 && maxPlayers === 1 时，表示单人关卡
 *   单人关卡可以配置关卡进度、解锁条件、首次通关奖励等特殊属性
 */
export interface TournamentConfig {
    // 基础信息
    typeId: string;
    name: string;
    description: string;
    timeRange?: string;
    // 游戏配置
    gameType?: GameName;
    /** @deprecated 新数据写入 matchRules；保留以兼容旧文档 */
    gameRule?: GameRule;
    isActive: boolean;
    /** TacticalMonster 等：tutorial / solo_challenge / multiplayer_tournament（与 tournament_types.mode 一致） */
    mode?: TournamentModeType;
    /** @deprecated 旧字段名，与 mode 同义 */
    modeType?: TournamentModeType;
    // 参赛条件
    entryRequirements?: EntryRequirements;

    // 比赛规则
    matchRules: MatchRules;

    // 奖励配置
    rewards: RewardConfig;

    // 限制配置
    limits?: LimitConfig;

    // 时间戳
    createdAt?: string;
    updatedAt?: string;
}

export interface GameRule {
    description: string;
    mode: "challenge" | "arena" | "story";
    ruleId: string;  // 必填：关联到 TacticalMonster 模块的 GameRuleConfig
}

/**
 * 游戏类型
 */
export type GameName =
    | "solitaire"       // 单人纸牌
    | "rummy"           // 拉米纸牌
    | "uno"             // UNO
    | "ludo"            // 飞行棋
    | "chess"           // 国际象棋
    | "checkers"        // 跳棋
    | "puzzle"          // 益智游戏
    | "arcade"          // 街机游戏
    | "tacticalMonster"; // 战术怪物（Monster Rumble）

/**
 * 参赛条件
 * 
 * 注意：
 * - playerLevel: 玩家等级要求（TacticalMonster 游戏使用）
 * - Power 范围（minTeamPower/maxTeamPower）在 GameRuleConfig.unlockConditions 中配置
 * - 通过 matchRules.ruleId 关联到 TacticalMonster 的 GameRuleConfig 获取 Power 范围
 */
export interface EntryRequirements {
    // ============================================
    // 通用要求
    // ============================================
    // 订阅要求
    isSubscribedRequired: boolean;

    // 玩家等级要求（TacticalMonster 游戏使用）
    playerLevel?: number;

    // ============================================
    // 入场费
    // ============================================
    entryFee: {
        coins?: number;
        gems?: number;
        // TacticalMonster 特定：能量消耗
        energy?: number;
    };

}

/** 锦标赛关卡/对局模式（各 gameType 可扩展不同 union；TacticalMonster 使用 tutorial / solo_challenge / multiplayer_tournament） */
export type TournamentModeType = "tutorial" | "solo_challenge" | "multiplayer_tournament";

/**
 * 比赛规则
 */
export interface MatchRules {
    minPlayers: number;
    maxPlayers: number;
    ruleId?: string;
}

/**
 * 读取关卡模式：优先顶层 `TournamentConfig.mode`，兼容旧字段 modeType、matchRules.mode / matchRules.modeType。
 */
export function resolveTournamentMode(
    config: TournamentConfig | undefined | null
): TournamentModeType | undefined {
    if (!config) return undefined;
    if (config.mode) return config.mode;
    if (config.modeType) return config.modeType;
    const mr = config.matchRules as unknown as {
        mode?: TournamentModeType;
        modeType?: TournamentModeType;
    };
    return mr?.mode ?? mr?.modeType;
}

/** @deprecated 使用 resolveTournamentMode */
export const resolveTournamentModeType = resolveTournamentMode;

/**
 * 宝箱类型权重配置
 */
export interface ChestTypeWeights {
    silver?: number;
    gold?: number;
    purple?: number;
    orange?: number;
}

/**
 * 奖励配置 - TacticalMonster 专用
 * 
 * 注意：
 * - 单人关卡（minPlayers === 1 && maxPlayers === 1）：使用 performanceRewards（基于分数阈值）
 * - 多人比赛：使用 rankRewards（基于排名范围）
 * - 不包含 props 和 tickets（这些是传统游戏的奖励类型）
 */
export interface RewardConfig {
    type?: "by_performance" | "by_rank";  // 可选：向后兼容

    // ============================================
    // 基础奖励 - 参与即可获得
    // ============================================
    baseRewards: {
        coins?: number;        // TacticalMonster 特定奖励
        energy?: number;
        chestDropRate?: number;  // 可选：向后兼容，如果没有配置则使用默认值
    };

    // ============================================
    // 排名奖励 - 仅用于多人比赛（minPlayers > 1 或 maxPlayers > 1）
    // ============================================
    rankRewards?: Array<{
        rankRange: number[]; // [minRank, maxRank]
        multiplier: number;
        // TacticalMonster 特定奖励
        coins?: number;
        monsterShards?: Array<{
            monsterId: string;
            quantity: number;
        }>;
        energy?: number;
        chestDropRate?: number;  // 该排名范围的宝箱触发率
        chestTypeWeights?: ChestTypeWeights;  // 该排名范围的宝箱类型权重（每个排名范围独立配置）
    }>;


    // ============================================
    // 订阅玩家额外奖励（固定加算，非倍率；与 base / rank / performance 叠加）
    // 仅当结算时 isSubscribed[uid] === true 时记入该玩家
    // ============================================
    subscribedPlayerExtraRewards?: {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number; }>;
        energy?: number;
    };


    // ============================================
    // 表现奖励 - 仅用于单人关卡（minPlayers === 1 && maxPlayers === 1）
    // 基于分数阈值计算奖励，替代排名奖励
    // ============================================
    performanceRewards?: {
        // 基础表现奖励（用于计算各等级奖励）
        baseReward: {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
        };
        /** 分数→等级映射，按 minScore 从高到低匹配首个 score >= minScore */
        scoreThresholds?: Array<{ minScore: number; level: string }>;
        levelRewards?: Record<string, {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
            chestDropRate?: number;  // 该表现等级的宝箱触发率（每个表现等级独立配置）
            chestTypeWeights?: ChestTypeWeights;  // 该表现等级的宝箱类型权重（每个表现等级独立配置）
        }>;

    };

    // ============================================
    // 首次通关奖励 - 仅用于单人关卡（minPlayers === 1 && maxPlayers === 1）
    // ============================================
    firstClearRewards?: {
        coins?: number;
        energy?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        monsters?: Array<{
            monsterId: string;
            level?: number;
            stars?: number;
        }>;
        chestDropRate?: number;  // 首次通关宝箱触发率
        chestTypeWeights?: ChestTypeWeights;  // 首次通关宝箱类型权重
    };
}

/**
 * 限制配置
 */
export interface LimitConfig {
    // 最大参与次数
    intervalHours?: number;
    maxAttempts?: number;  // 最大尝试次数
    // 订阅用户限制
    subscribed?: {
        maxAttempts?: number;
    };
    attemptCost?: {
        coins?: number;
        energy?: number;
    };
    unlimitedAttempts?: boolean;  // 是否允许无限尝试
}

// 注意：积分规则配置已移至段位系统，不再在此定义
// 使用段位系统的统一配置源


