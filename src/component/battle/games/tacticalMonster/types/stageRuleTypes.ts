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
 * 3D 战斗内引导步骤事件（与 BattleVenue3D 内通知一致）
 */
export type PedagogyGuideEventType =
    | "move"
    | "skillSelect"
    | "targetSelect"
    | "cast"
    | "turnEnd";

/**
 * 单步引导配置
 */
export interface PedagogyGuideStep {
    id: string;
    text: string;
    eventType: PedagogyGuideEventType;
    /** skillSelect / cast 时可选；若设置则仅当 skillId 匹配时推进 */
    expectedSkillId?: string;
}

/** 教学关胜利条件（与后端 tutorialWinMode 一致） */
export type TutorialWinMode = "boss_only" | "boss_and_guide" | "guide_only";

/**
 * 教学 / 难度阶梯元数据（P/B 轴），与 docs/pedagogy_stage_matrix.md 对齐
 */
export interface StagePedagogy {
    /** 假定玩家已掌握的能力等级（P 轴） */
    playerTierAssumed: number;
    /** 本关教学目标（可选） */
    playerTierTaught?: number;
    /** Boss 机制等级（B 轴） */
    bossMechanicTier: number;
    /** 对应可养成怪物 ID（与 Boss 配置一致，便于掉落对齐） */
    bossMonsterId?: string;
    counterFocus?: "none" | "range" | "role_tank" | "role_dps" | string;
    tutorialNotes?: string;
    /** 试用怪（仅 UI 提示；注入队伍需编队系统配合） */
    loanMonsterIds?: string[];
    /** 若设置，技能面板仅显示列表中的技能（用于首关锁技能） */
    allowedSkillIds?: string[];
    /** 可选：按步骤推进的局内引导（仅 play；横幅隐藏偏好已登录存后端，未登录存 localStorage） */
    guideFlow?: PedagogyGuideStep[];
    /**
     * 为 true 时由 pedagogyDynamicGuide 按战场状态切换提示，与 guideFlow 静态步进二选一；
     * 新手关优先用 guideFlow（与后端 tutorialProgress 步进一致）。
     */
    dynamicGuide?: boolean;
    /** dynamicGuide 完成时要求的技能（默认 basic_attack） */
    dynamicGuideCompletionSkillId?: string;
    /** 默认 boss_only */
    tutorialWinMode?: TutorialWinMode;
}

/** 关卡运行模式：教学 / 单人挑战 / 多人锦标赛 */
export type StageModeType = "tutorial" | "solo_challenge" | "multiplayer_tournament";

/** 关卡队伍预设：不覆盖 / 完全覆盖玩家编队 / 合并追加 */
export type TeamPresetMode = "none" | "override" | "merge";

/** 预设队伍槽位（用于 override/merge） */
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

/** 奖励策略类型 */
export type RewardPolicyType = "one_time_clear" | "score_tiers" | "ranking_or_match_result";

/** 分数档奖励（minScore 越高档越优，结算时取满足的最高档） */
export interface ScoreTierReward {
    minScore: number;
    /** 与现有奖励系统对齐的轻量描述，具体解析由发奖服务实现 */
    rewardKey?: string;
    chestType?: string;
}

export interface StageRewardPolicy {
    type: RewardPolicyType;
    scoreTiers?: ScoreTierReward[];
    /** 首通一次性奖励标识 */
    oneTimeRewardKey?: string;
}

export interface StageUiRules {
    /** 为 true 时跳过编队界面（教学关常用） */
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
    /** 开局队伍预设；tutorial 建议 override */
    teamPreset?: StageTeamPresetConfig;
    /** 通关/结算奖励策略 */
    rewardPolicy?: StageRewardPolicy;
    /** 前端 UI 规则 */
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
        /** 关卡级 Boss 覆盖（用于教学关精准调参，不影响全局模板） */
        bossOverrides?: StageBossOverrides;
        /** 关卡级玩家单位覆盖（用于教学关精准调参） */
        playerOverrides?: StagePlayerOverride[];
    };

    // ============================================
    // 体力与奖励（关卡体力与奖励机制设计）
    // ============================================
    staminaCost?: number;               // 每次挑战消耗体力（0=不消耗）
    recommendedPower?: number;          // 推荐战力（UI 展示）
    starRatingConfig?: {
        threeStarMaxRounds?: number;    // 3 星：全员存活 且 回合数 <= 此值
        twoStarMinSurvivors?: number;   // 2 星最少存活数（默认 1）
    };
    starRewardMultipliers?: Record<1 | 2 | 3, number>;  // 3星100% 2星80% 1星60%

    // ============================================
    // 显示和排序
    // ============================================
    isVisible?: boolean;                 // 是否在关卡列表中显示（默认 true）
    sortOrder?: number;                  // 排序顺序

    // ============================================
    // 教学与难度阶梯（可选）
    // ============================================
    pedagogy?: StagePedagogy;
}


