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
 * 关卡规则配置
 * 定义关卡内容、难度、奖励等游戏特定规则
 */
export interface StageRuleConfig {
    // ============================================
    // 基础信息
    // ============================================
    ruleId: string;
    gameName?: GameName;
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
    };


    // ============================================
    // 显示和排序
    // ============================================
    isVisible?: boolean;                 // 是否在关卡列表中显示（默认 true）
    sortOrder?: number;                  // 排序顺序
}


