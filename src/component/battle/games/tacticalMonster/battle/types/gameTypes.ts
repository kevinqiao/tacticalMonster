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
    currentRound?: { no: number; turns: { uid: string; monsterId: string }[] };
}

/**
 * GameReport - 游戏报告
 * 包含游戏结束后的分数统计信息
 */
export interface GameReport {
    gameId: string;
    baseScore: number;
    timeBonus?: number;
    completeBonus?: number;
    totalScore: number;
}

/**
 * CombatTurn - 战斗回合
 * 表示一个战斗回合中的行动信息
 */
export interface CombatTurn {
    uid: string;
    monsterId: string;
    skills?: string[];
    skillSelect?: string;
    status: number;  // 回合状态：0: pending, 1: in_progress, 2: completed
    startTime?: number;
    endTime?: number;
}

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