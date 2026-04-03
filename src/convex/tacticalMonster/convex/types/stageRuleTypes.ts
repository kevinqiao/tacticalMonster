/**
 * 关卡规则配置
 * 定义 TacticalMonster 游戏特定的关卡规则配置，通过 ruleId 与 TournamentConfig 关联
 */

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
 * 3D 战斗内引导步骤事件（与前端 pedagogy 对齐）
 */
export type PedagogyGuideEventType =
    | "move"
    | "skillSelect"
    | "targetSelect"
    | "cast"
    | "turnEnd";

export interface PedagogyGuideStep {
    id: string;
    text: string;
    eventType: PedagogyGuideEventType;
    expectedSkillId?: string;
}

/**
 * 教学 / 难度阶梯元数据（P/B 轴）
 */
export type TutorialWinMode = "boss_only" | "boss_and_guide" | "guide_only";

/** 单条 dynamic 条件（可组合进 `all`） */
export type DynamicGuideAtom =
    | { kind: "cast_skill"; skillId: string }
    | { kind: "any_cast" }
    | { kind: "move" }
    | { kind: "turn_end" };

/** dynamicGuide 且无 guideFlow 时必填：`all` 表示需全部满足（顺序不限，可跨回合累积） */
export type DynamicGuideCompletionRule = DynamicGuideAtom | { kind: "all"; rules: DynamicGuideAtom[] };

export interface StagePedagogy {
    playerTierAssumed: number;
    playerTierTaught?: number;
    bossMechanicTier: number;
    bossMonsterId?: string;
    counterFocus?: "none" | "range" | "role_tank" | "role_dps" | string;
    tutorialNotes?: string;
    loanMonsterIds?: string[];
    allowedSkillIds?: string[];
    guideFlow?: PedagogyGuideStep[];
    dynamicGuide?: boolean;
    /** 与 dynamicGuide 同时使用且无 guideFlow 时必填 */
    dynamicGuideRule?: DynamicGuideCompletionRule;
    tutorialWinMode?: TutorialWinMode;
}

export type StageModeType = "tutorial" | "solo_challenge" | "multiplayer_tournament";
export type TeamPresetMode = "none" | "override" | "merge";

export interface TeamPresetSlot {
    monsterId: string;
    level?: number;
    stars?: number;
    q?: number;
    r?: number;
    unlockSkills?: string[];
}

export interface StageTeamPresetConfig {
    mode: TeamPresetMode;
    slots: TeamPresetSlot[];
}

export type RewardPolicyType = "one_time_clear" | "score_tiers" | "ranking_or_match_result";

export interface ScoreTierReward {
    minScore: number;
    rewardKey?: string;
    chestType?: string;
}

export interface StageRewardPolicy {
    type: RewardPolicyType;
    scoreTiers?: ScoreTierReward[];
    oneTimeRewardKey?: string;
}

export interface StageUiRules {
    hideTeamLayout?: boolean;
}

export interface StageBossOverrides {
    baseHp?: number;
    baseDamage?: number;
    baseDefense?: number;
    baseSpeed?: number;
    position?: { q: number; r: number };
}

export interface StagePlayerOverride {
    monsterId: string;
    hp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
}

/**
 * 关卡规则配置
 * 定义关卡内容、难度、奖励等游戏特定规则
 */
export interface StageRuleConfig {
    // ============================================
    // 基础信息
    // ============================================
    ruleId: string;
    gameName?: GameName;
    teamPreset?: StageTeamPresetConfig;
    rewardPolicy?: StageRewardPolicy;
    uiRules?: StageUiRules;
    // ============================================
    // 关卡类型和进度
    // ============================================
    stageType?: "story" | "challenge" | "boss_rush" | "endless" | "arena";  // 关卡类型
    chapter?: number;                    // 章节编号（故事模式使用）
    stageNumber?: number;                 // 章节内关卡编号
    // ============================================
    // 连续关卡配置（支持关卡链和关卡树）
    // ============================================
    stageChain?: {
        // 下一关卡（线性关卡链）
        nextLevels?: string[];           // 下一关卡的 typeId 列表（支持分支）

        // 前置关卡（用于验证和自动解锁）
        previousLevels?: string[];       // 前置关卡的 typeId 列表

        // 解锁模式
        unlockMode?: "sequential" | "parallel" | "any";  // 顺序解锁 | 并行解锁 | 任意完成即可
        // sequential: 必须按顺序完成前置关卡
        // parallel: 前置关卡可以并行完成
        // any: 完成任意一个前置关卡即可解锁

        // 自动解锁（完成当前关卡后自动解锁下一关卡）
        autoUnlockNext?: boolean;        // 是否自动解锁下一关卡（默认 true）

        // 关卡链元数据
        chainId?: string;                 // 关卡链ID（用于标识整个关卡链）
        chainOrder?: number;              // 在关卡链中的顺序（用于排序）
    };

    // ============================================
    // 关卡内容配置（TacticalMonster 特定）
    // ============================================
    stageContent?: {
        // Boss 配置
        bossConfig?: {
            bossId?: string;              // Boss ID（固定 Boss）
            bossPool?: string[];          // Boss ID 列表（随机选择）
        };
        // 地图配置（可选，如果不使用 levelConfigId）
        mapConfig?: {
            mapSize: { rows: number; cols: number };
            templateId?: string;
        };

        // 难度调整
        difficultyAdjustment?: {
            powerBasedScaling?: boolean;   // 是否基于玩家 Power 调整难度 
            // 例如：1.0 表示Boss Power = Player Team Power（平衡）
            //       1.2 表示Boss Power = 1.2 × Player Team Power（Boss更强）
            difficultyMultiplier?: number;  // Boss Power / Player Team Power 的比率
            minMultiplier?: number;        // 最低难度倍数
            maxMultiplier?: number;        // 最高难度倍数
        };
        // 关卡级 Boss 覆盖（用于教学关精准调参，不影响全局 Boss 模板）
        bossOverrides?: StageBossOverrides;
        // 关卡级玩家单位覆盖（用于教学关精准调参）
        playerOverrides?: StagePlayerOverride[];
        // 用于召唤测试的队伍预设标识，测试逻辑可根据此选择 SUMMON_TEST_TEAM_MONSTERS
        summonTestTeamPreset?: "default";
    };

    // ============================================
    // 体力与奖励（关卡体力与奖励机制设计）
    // ============================================
    staminaCost?: number;
    recommendedPower?: number;
    starRatingConfig?: {
        threeStarMaxRounds?: number;
        twoStarMinSurvivors?: number;
    };
    starRewardMultipliers?: Record<1 | 2 | 3, number>;

    // ============================================
    // 显示和排序
    // ============================================
    isVisible?: boolean;                 // 是否在关卡列表中显示（默认 true）
    sortOrder?: number;                  // 排序顺序

    pedagogy?: StagePedagogy;
}


