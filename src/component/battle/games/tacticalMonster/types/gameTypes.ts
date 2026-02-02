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
 * 阶段变化信息
 * 统一的事件数据结构，所有事件的 data 都使用此类型
 */
export interface PhaseChanges {
    // ========== 游戏初始化 ==========
    gameInit?: GameModel;  // ✅ 游戏初始化状态（gameInit 事件使用）

    // ========== 回合和阶段 ==========
    roundStart?: {
        round: number;
        triggeredPassiveSkills?: Array<{ uid: string; monsterId: string; skillId: string; effects: any[] }>;
    };
    roundEnd?: {
        round: number;
    };
    turnStart?: {
        uid: string;
        monsterId: string;
        round: number;
        triggeredPassiveSkills?: Array<{ uid: string; monsterId: string; skillId: string; effects: any[] }>;
    };
    turnEnd?: {
        uid: string;
        monsterId: string;
        round: number;
    };

    // ========== 玩家动作（与 bossAIActions 对称）==========
    playerAction?: {
        turnStart?: {
            uid: string;
            monsterId: string;
            round: number;
            triggeredPassiveSkills?: Array<{ uid: string; monsterId: string; skillId: string; effects: any[] }>;
        };
        action: {
            type: 'use_skill' | 'attack' | 'move' | 'standby';
            skillId?: string;
            target?: CharacterIdentifier;
            targets?: CharacterIdentifier[];
            position?: { q: number; r: number };
        };
        executionResults: {
            stateChanges?: {
                actor?: {
                    identifier: CharacterIdentifier;
                    before: { q: number; r: number; hp: number; mp: number };
                    after: { q: number; r: number; hp: number; mp: number };
                    positionChanged: boolean;
                    hpChanged: boolean;
                    mpChanged: boolean;
                };
                targets?: Array<{
                    identifier: CharacterIdentifier;
                    before: { hp: number; mp: number };
                    after: { hp: number; mp: number };
                    hpChanged: boolean;
                    mpChanged: boolean;
                }>;
            };
            effects?: any[];
            phaseChanges?: PhaseChanges;  // 嵌套的 phaseChanges（如 turnEnd, roundEnd 等）
        };
    };

    // ========== Boss AI 动作 ==========
    bossAIActions?: Array<{
        turnStart: {
            uid: string;
            monsterId: string;
            round: number;
            triggeredPassiveSkills?: Array<{ uid: string; monsterId: string; skillId: string; effects: any[] }>;
        };
        decision: any;
        executionResults: any;
        phaseTransition?: any;
    }>;

    // ========== 游戏结束 ==========
    gameOver?: {
        result: any; // GameResult (从 sharedScoreService 导入)
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
 * CombatEvent - 战斗事件
 * 记录战斗过程中发生的各种事件
 */
export interface CombatEvent {
    gameId: string;
    name: string;
    type?: number;  // 事件类型：0: round, 1: movement, 2: attack, etc.
    data?: any;
    time: number;
}