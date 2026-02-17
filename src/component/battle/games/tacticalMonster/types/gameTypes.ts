import { StateChanges } from "./backendResponseTypes";
import { GameBoss, GameMonster } from "./monsterTypes";
import { ObstacleCell } from "./obstacleTypes";

/**
 * 游戏状态枚举
 * 0: waiting - 等待中
 * 1: won - 胜利
 * 2: lost - 失败
 * 3: game over - 游戏结束
 */
export type GameStatus = 0 | 1 | 2 | 3;
export interface MapModel {
    rows: number;
    cols: number;
    direction?: number;
    obstacles?: ObstacleCell[];
    disables?: { q: number; r: number }[];
}

/**
 * GameModel - 游戏模型（运行时数据结构）
 * 对应数据库表 mr_games，包含完整的游戏状态信息
 */
export interface GameModel {
    // ========== 基础标识 ==========
    gameId: string;
    matchId?: string;
    stageId: string;
    uid: string;  // 玩家 UID

    // ========== 队伍和Boss数据 ==========
    teamPower: number;
    team: GameMonster[];  // 玩家队伍（使用 GameMonster 类型）
    boss: GameBoss;  // Boss数据（使用 GameBoss 类型）

    // ========== 地图数据 ==========
    map: MapModel;

    // ========== 游戏状态和分数 ==========
    status: GameStatus;  // 游戏状态：0: waiting, 1: won, 2: lost, 3: game over
    score: number;
    scoringConfigVersion?: string;  // ✅ 计分配置版本号
    lastUpdate: string;  // ISO 字符串格式
    createdAt: string;  // ISO 字符串格式
    dueTime?: number;
    // ========== 运行时字段（不在数据库中，但用于代码逻辑）==========
    currentRound?: GameRound;
}

export interface GameRound {
    no: number;
    turns: GameTurn[];  // ✅ 统一使用 GameTurn 类型
}
/**
 * GameTurn - 游戏回合
 * 统一使用此类型，替代原来的 CombatTurn
 * 
 * Turn 状态说明（简化版，三状态）：
 * - 0 (OPEN): 开放/等待中 - 回合已创建，但尚未开始，等待轮到该角色
 * - 1 (IN_PROGRESS): 进行中 - 回合已开始，角色可以执行行动（移动、攻击、使用技能等）
 * - 2 (COMPLETED): 已完成 - 回合已完全结束，所有处理（行动、被动技能、状态效果等）都已完成
 * 
 * 状态流转：
 * OPEN (0) → IN_PROGRESS (1) → COMPLETED (2)
 * 
 * 注意：
 * - 已完成的 turn 会保留在 GameRound.turns 数组中，不会删除
 * - 这有助于历史记录、调试和回放功能
 * - 通过检查所有 turn 的 status === 2 来判断 round 是否完成
 * - skills 字段已移除，技能信息应从角色（GameMonster）中获取
 * - order 属性标识该 turn 在 round 中的次序（从 1 开始），不依赖于数组位置
 */
export interface GameTurn {
    uid: string;
    monsterId: string;  // 玩家角色的monsterId，或Boss/小怪的配置ID（用于查找角色配置）
    bossId?: string;    // Boss主体的bossId（可选，当uid="boss"且是Boss主体时使用）
    minionId?: string;  // 小怪的minionId（可选，当uid="boss"且是小怪时使用，用于区分相同monsterId的小怪）
    skillSelect?: string;
    status?: number;  // 回合状态：0: open, 1: in_progress, 2: completed
    order?: number;   // 在 round 中的次序（从 1 开始），用于明确标识和 UI 显示
    dueTime?: number;
}
/**
 * 技能效果类型（与后端 SkillEffectType 保持一致）
 */
export type SkillEffectType =
    | 'damage'      // 直接伤害
    | 'heal'        // 直接治疗
    | 'buff'        // 增益效果
    | 'debuff'      // 减益效果
    | 'dot'         // 持续伤害
    | 'hot'         // 持续治疗
    | 'stun'        // 眩晕
    | 'shield'      // 护盾
    | 'mp_drain'    // 法力吸取
    | 'mp_restore'  // 法力恢复
    | 'movement'    // 移动效果
    | 'teleport';   // 传送效果

/**
 * 技能效果详情（与后端 SkillEffect 保持一致）
 * 描述单个效果的具体属性
 */
export interface SkillEffectDetail {
    id: string;                                 // 效果ID
    name: string;                               // 效果名称
    type: SkillEffectType;                      // 效果类型
    value?: number;                             // 直接数值（伤害值、治疗值等）
    damage_type?: 'physical' | 'magical';       // 伤害类型
    target_attribute?: string;                  // 目标属性（如 "attack", "defense", "hp", "mp"）
    duration?: number;                          // 持续时间（回合数，0 表示立即生效）
    modifiers?: Record<string, number>;         // 属性修改器（如 { "attack": 20, "defense": -10 }）
    modifier_type?: 'add' | 'multiply';         // 修改类型
    icon?: string;                              // 效果图标路径
    damage_falloff?: {                          // 伤害衰减
        full_damage_range: number;
        min_damage_percent: number;
    };
    area_type?: 'single' | 'circle' | 'line';  // 作用范围类型
    area_size?: number;                         // 作用范围大小
}

/**
 * 技能效果条目（包含效果详情 + 元信息）
 * effects 数组中的每一项
 */
export interface SkillEffectItem {
    effect: SkillEffectDetail;          // 效果详情
    targetId?: string;                  // 作用目标的 monsterId/bossId/minionId
    applied: boolean;                   // 是否成功应用
    // 被动技能附加字段（主动技能效果不包含这些字段）
    isPassive?: boolean;                // 是否为被动技能效果
    passiveSkillId?: string;            // 触发的被动技能ID
    triggerType?: string;               // 触发类型（如 "on_hit", "on_skill_attacked"）
}

/**
 * 被动技能触发记录
 * 用于 roundStart/turnStart 的 triggeredPassiveSkills
 * effects 为简化版效果摘要（仅 id/type/name），不同于 PhaseChanges.effects 中的完整 SkillEffectItem
 */
export interface TriggeredPassiveSkill {
    uid: string;
    monsterId: string;
    bossId?: string;
    minionId?: string;
    skillId: string;
    effects: Array<{ id: string; type: string; name: string }>;
}

// ========== Boss AI 相关类型（PhaseChanges.bossAIActions 使用） ==========

/** Boss 单次动作类型（与后端 BossAction 一致） */
export interface BossAction {
    type: "use_skill" | "attack" | "move" | "standby";
    skillId?: string;
    target?: CharacterIdentifier;
    targets?: CharacterIdentifier[];
    position?: { q: number; r: number };
}

/** Boss AI 决策结果：Boss 本体动作 + 可选小怪动作列表 */
export interface BossAIDecision {
    bossAction: BossAction;
    minionActions?: Array<{
        minionId: string;
        action: BossAction;
    }>;
    phaseTransition?: BossAIPhaseTransition;
}

/** Boss 阶段切换信息 */
export interface BossAIPhaseTransition {
    fromPhase: string;
    toPhase: string;
}

/** 单次 Boss/小怪动作执行结果（executeBossAction 返回值） */
export interface BossActionExecutionResult {
    ok: true;
    stateChanges?: StateChanges | null;
    effects?: SkillEffectItem[];
    phaseChanges?: PhaseChanges;
}

/** Boss AI 执行结果汇总：Boss 本体 + 小怪列表；或跳过标记 */
export interface BossAIExecutionResults {
    boss?: BossActionExecutionResult | null;
    minions?: Array<{
        minionId: string;
        result: BossActionExecutionResult;
    }>;
    /** 死亡/眩晕等跳过 AI 时由后端设置 */
    skipped?: true;
}

/** bossAIActions 数组中单项的 turnStart 结构 */
export interface BossAIActionTurnStart {
    uid: string;
    monsterId: string;
    round: number;
    bossId?: string;
    minionId?: string;
    triggeredPassiveSkills?: TriggeredPassiveSkill[];
    statusEffectChanges?: {
        expired: Array<{ id: string; type: string; name?: string }>;
        ticked: Array<{ effectId: string; type: string; value: number }>;
        characterState: { hp: number; mp?: number; status: string };
    };
}

/** Boss AI 动作项（PhaseChanges.bossAIActions 数组元素） */
export interface BossAIActionItem {
    turnStart: BossAIActionTurnStart;
    /** 决策结果；跳过 AI 时可为 null */
    decision: BossAIDecision | null;
    /** 执行结果；跳过时为 { skipped: true }，否则为 BossAIExecutionResults */
    executionResults: BossAIExecutionResults | { skipped: true };
    phaseTransition?: BossAIPhaseTransition;
}

/**
 * 阶段变化信息
 * 统一的事件数据结构，所有事件的 data 都使用此类型
 */
export interface PhaseChanges {
    // ========== 游戏初始化 ==========
    gameInit?: GameModel;

    // ========== 回合和阶段 ==========
    roundStart?: {
        round: number;
        triggeredPassiveSkills?: TriggeredPassiveSkill[];
    };
    roundEnd?: {
        round: number;
    };
    turnStart?: {
        uid: string;
        monsterId: string;
        round: number;
        triggeredPassiveSkills?: TriggeredPassiveSkill[];
        /** 本回合开始时的状态效果 tick 结果（DOT/HOT/BUFF/DEBUFF/STUN 等） */
        statusEffectChanges?: {
            expired: Array<{ id: string; type: string; name?: string }>;
            ticked: Array<{ effectId: string; type: string; value: number }>;
            characterState: { hp: number; mp?: number; status: string };
        };
    };
    turnEnd?: {
        uid: string;
        monsterId: string;
        round: number;
    };

    // ========== 执行结果 ==========
    stateChanges?: StateChanges;            // 角色状态前后对比（HP/MP/Shield/Status 等）
    effects?: SkillEffectItem[];            // 技能效果列表（包含主动和被动技能效果）

    // ========== Boss AI 动作 ==========
    bossAIActions?: BossAIActionItem[];

    // ========== 游戏结束 ==========
    gameOver?: {
        result: any;
        reason: string;
    };
}

export interface GameReport {
    gameId: string;
    baseScore: number;
    timeBonus?: number;
    completeBonus?: number;
    totalScore: number;
}

// ✅ CombatTurn 已移除，统一使用 GameTurn

/**
 * CharacterIdentifier - 角色标识符
 * 用于唯一标识一个角色，三个字段中只有一个存在
 */
export interface CharacterIdentifier {
    monsterId?: string;  // 玩家角色的monsterId
    bossId?: string;     // Boss主体的bossId
    minionId?: string;   // 小怪的minionId
}

// CombatEvent 类型统一在 CombatTypes.ts 中定义，请使用：
// import { CombatEvent } from "./CombatTypes";