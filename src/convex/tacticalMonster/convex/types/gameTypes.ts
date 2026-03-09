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
 * - order 属性标识该 turn 在 round 中的次序（从 1 开始），不依赖于数组位置
 */
export interface GameTurn {
    uid: string;
    character_id: string;  // 当前行动角色的实例 id（玩家=character_id，Boss=bossId/minionId），唯一标识该 turn 对应的角色
    skillSelect?: string;
    status?: number;  // 回合状态：0: open, 1: in_progress, 2: completed
    order?: number;   // 在 round 中的次序（从 1 开始），用于明确标识和 UI 显示
    actionOrder?: number;  // 实际出手顺序（完成时写入），用于 roundEnd.lastRound 按行动序排序
    dueTime?: number;
    stepsUsed?: number;  // Braveland：本回合已用移动步数
}
/**
 * 技能效果条目（包含效果详情 + 元信息）
 * effects 数组中的每一项
 */
export interface SkillEffectItem {
    effect: {
        id: string;
        name: string;
        type: string;                               // SkillEffectType
        value?: number;
        damage_type?: 'physical' | 'magical';
        target_attribute?: string;
        duration?: number;
        modifiers?: Record<string, number>;
        modifier_type?: 'add' | 'multiply';
        icon?: string;
        damage_falloff?: { full_damage_range: number; min_damage_percent: number };
        area_type?: 'single' | 'circle' | 'line';
        area_size?: number;
    };
    targetId?: string;
    applied: boolean;
    isPassive?: boolean;
    passiveSkillId?: string;
    triggerType?: string;
}

/**
 * 被动技能触发记录
 * 用于 roundStart/turnStart 的 triggeredPassiveSkills
 * effects 为简化版效果摘要（仅 id/type/name），不同于 PhaseChanges.effects 中的完整 SkillEffectItem
 */
export interface TriggeredPassiveSkill {
    uid: string;
    character_id: string;  // 触发被动技能的角色实例 id
    skillId: string;
    effects: Array<{ id: string; type: string; name: string }>;
}

// ========== Boss AI 相关类型（PhaseChanges.bossAIActions 使用，与前端 gameTypes 一致） ==========

/** Boss 单次动作类型 */
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
    stateChanges?: any | null;
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
    character_id: string;
    round: number;
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
 * 统一的事件数据结构
 */
export interface PhaseChanges {
    // ========== 游戏初始化 ==========
    gameInit?: GameModel;

    // ========== 回合和阶段 ==========
    roundStart?: {
        round: GameRound;  // 完整 GameRound（no + turns，turns 含 order，uid="boss" 时含 bossId 或 minionId）
        triggeredPassiveSkills?: TriggeredPassiveSkill[];
    };
    roundEnd?: {
        round: number;
        /** 该回合结束时按实际出手顺序排序的 turns，供前端 turnbar 重排 */
        lastRound?: GameRound;
    };
    turnStart?: {
        uid: string;
        character_id: string;
        round: number;
        triggeredPassiveSkills?: TriggeredPassiveSkill[];
        statusEffectChanges?: {
            expired: Array<{ id: string; type: string; name?: string }>;
            ticked: Array<{ effectId: string; type: string; value: number }>;
            characterState: { hp: number; mp?: number; status: string };
        };
    };
    turnEnd?: {
        uid: string;
        character_id: string;
        round: number;
    };

    /** 与 turnStart 同时下发时的最新 currentRound（完整 turns 含 order），前端用于整体替换以同步召唤等导致的 order 变化 */
    currentRound?: GameRound;

    // ========== 执行结果 ==========
    stateChanges?: any;                     // 角色状态前后对比（对应前端 StateChanges）
    effects?: SkillEffectItem[];            // 技能效果列表（包含主动和被动技能效果）

    /** 召唤单位列表（use_skill 触发召唤时由后端填入） */
    summonedCharacters?: SummonedCharacter[];

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

/**
 * 召唤单位数据
 * 用于 PhaseChanges.summonedCharacters，与前端 gameTypes 一致
 */
export interface SummonedCharacter {
    identifier: CharacterIdentifier;
    uid: string;
    monsterId: string;
    minionId?: string;
    bossId?: string;
    q: number;
    r: number;
    character_id: string;
    name?: string;
    assetPath?: string;
    stats: {
        hp: { current: number; max: number };
        mp?: { current: number; max: number };
        attack: number;
        defense: number;
        speed: number;
        shield?: { current: number; max: number };
    };
    statusEffects?: Array<{ id: string; type: string; name?: string }>;
    skillCooldowns?: Record<string, number>;
    skills?: string[];
}

/**
 * CombatEvent - 战斗事件
 * 统一的事件类型定义
 * 
 * 设计说明：
 * - stepTime: 相对时间位置（从游戏开始，毫秒数），用于去重和排序
 *   - 创建时可选（由 createEvent 自动计算）
 *   - 数据库中必需
 * - data: 事件载荷，不同事件类型有不同结构（使用 Record 保持灵活性）
 *   - walk: { identifier, to, endTurn?, phaseChanges?, stateChanges? }
 *   - use_skill: { identifier, skillId, targets, result, phaseChanges, stateChanges }
 *   - attack: { attacker, skillUsed, skillId, targets, skillResult, phaseChanges }
 *   - new_round / end_round: { round }
 *   - game_end: { gameId }
 */
export interface CombatEvent {
    gameId: string;
    name: string;           // 事件名称
    time: number;           // 绝对时间戳（Date.now()）
    stepTime?: number;      // 相对时间位置（创建时可选，由 createEvent 自动计算）
    type?: number;          // 事件类型：0: round, 1: movement, 2: attack, 3: skill
    data?: Record<string, any>;  // 事件载荷（不同事件有不同结构）
}