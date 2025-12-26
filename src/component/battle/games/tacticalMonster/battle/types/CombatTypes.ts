/**
 * Tactical Monster 战斗类型定义
 */

import { Spine } from "pixi-spine";
import { MonsterSkill } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { GameModel as BackendGameModel } from "../../../../../../convex/tacticalMonster/convex/service/game/gameService";
import { GameMonster } from "../../../../../../convex/tacticalMonster/convex/types/monsterTypes";

export enum ACT_CODE {
    WALK = 1,
    ATTACK = 2,
    STAND = 3,
    DEFEND = 4,
    STANDBY = 5,
    HEAL = 6,
}

export enum EVENT_TYPE {
    PHASE = 0,
    ACTION = 1,
    EFFECT = 2,
}

export enum EVENT_NAME {
    WALK = "walk",
    ATTACK = "attack",
    DEFEND = "defend",
    STAND = "stand",
    HEAL = "heal",
    NEW_ROUND = "new_round",
    END_ROUND = "end_round",
    END_GAME = "end_game",
    EFFECT = "effect",
}

export interface Player {
    uid: string;
    name?: string;
    avatar?: string;
}

export interface CombatEvent {
    name: string;
    uid?: string;
    gameId?: string;
    time?: number;
    initTime?: number;
    status?: number;
    data?: CombatAction | CombatRound | any;
    // 乐观更新相关字段
    optimistic?: boolean;           // 是否为乐观事件
    optimisticId?: string;          // 乐观事件ID（前端生成）
    rollback?: () => void;          // 回滚函数
    snapshot?: any;                 // 状态快照
}

/**
 * 前端 GameModel - 扩展后端 GameModel，添加前端运行时需要的字段
 * 使用 Omit 排除后端的 map 字段，然后添加前端的 MapModel
 * 注意：不再包含 characters 字段，直接使用后端的 team 和 boss
 */
export interface GameModel extends Omit<BackendGameModel, 'map'> {
    // 前端运行时字段
    map: MapModel;  // 覆盖后端的 map 类型，使用前端的 MapModel（包含 direction 和 obstacles 的扩展格式）
    currentRound?: CombatRound;  // 当前回合信息（前端运行时）
    timeClock?: number;  // 时间时钟（前端运行时）
   
}

export interface GameReport {
    gameId: string;
    baseScore: number;  // 基础分数（击败Boss、使用技能等）
    timeBonus?: number;  // 时间奖励
    completeBonus?: number;  // 完成奖励
    totalScore: number;  // 总分数
}

export type GameMode = 'play' | 'watch' | 'replay';  // 游戏模式：游玩 | 实时观看 | 重播

/**
 * 重播状态
 */
export interface ReplayState {
    isPlaying: boolean;
    isPaused: boolean;
    currentIndex: number;
    totalEvents: number;
    currentTime: number;
    totalTime: number;
    playbackSpeed: number;
}

/**
 * 重播控制接口
 */
export interface ReplayControls {
    play: () => void;
    pause: () => void;
    stop: () => void;
    seekTo: (time: number) => void;
    seekToIndex: (index: number) => void;
    setSpeed: (speed: number) => void;
    state: ReplayState;
    getAllEvents?: () => CombatEvent[];  // ✅ 获取所有事件（用于计分）
}



export interface CombatAction {
    uid: string;
    round?: number;
    character: string;
    act: number;
    data?: any;
}

export interface CombatTurn {
    gameId?: string;
    round?: number;
    uid: string;
    character_id: string;
    status?: number;
    startTime?: number;
    endTime?: number;
    skills?: string[];
    skillSelect?: string;
}

export interface CombatRound {
    gameId?: string;
    no: number;
    currentTurn?: CombatTurn;
    turns: CombatTurn[];
    status?: number;
}

export enum GridCellType {
    Field = 0,
    Obstacle = 1,
    Unavailable = 2,
}

export interface HexNode {
    x: number;
    y: number;
    walkable?: boolean;
    type?: GridCellType;
}

export interface GridCell extends HexNode {
    gridContainer: SVGSVGElement | null;
    gridGround: SVGPolygonElement | null;
    gridWalk: SVGPolygonElement | null;
}

export interface ObstacleCell {
    r: number;
    q: number;
    asset: string;
    type?: number;
    walkable?: boolean;
    element?: HTMLDivElement;
}

export interface WalkableNode extends HexNode {
    distance?: number;
}

export interface AttackableNode extends HexNode {
    uid: string;
    character_id: string;
    distance: number;
}

/**
 * MonsterSprite - 前端渲染用的Monster类型
 * 基于GameMonster，添加UI渲染相关字段和前端需要的扩展字段
 * 统一使用后端的 MonsterSkill[] 类型（不再转换）
 */
export interface MonsterSprite extends GameMonster {
    // ========== 前端标识字段 ==========
    character_id: string;                // 前端使用的角色ID（从 monsterId/bossId/minionId 转换而来）

    // ========== 技能字段（统一使用后端类型）==========
    skills: MonsterSkill[];              // 统一使用 MonsterSkill[]（不再转换为 Skill[]）

    // ========== UI渲染相关字段 ==========
    scaleX?: number;                    // 水平翻转（1: 向右, -1: 向左）
    facing?: number;                     // 面向方向
    walkables?: WalkableNode[];          // 可移动位置列表
    attackables?: AttackableNode[];       // 可攻击目标列表
    container?: HTMLDivElement;          // DOM容器元素
    standEle?: HTMLDivElement;           // 站立状态元素
    attackEle?: HTMLDivElement;          // 攻击状态元素
    skeleton?: Spine;                    // Spine动画骨架
    animator?: ModelAnimator;           // 动画控制器

    // statusEffects 直接继承自 GameMonster，类型为 StatusEffect[]
}

export interface ModelAnimator {
    move: () => void;
    attack: () => void;
    stand: () => void;
}

export interface MapModel {
    rows: number;
    cols: number;
    direction?: number;
    obstacles?: ObstacleCell[];
    disables?: { q: number; r: number }[];
}

export interface ICombatContext {
    game: GameModel | null;
    activeSkill: MonsterSkill | null;
    coordDirection: number;
    hexCell: { width: number; height: number };
    gameId: string | null;
    map?: MapModel;
    gridCells: GridCell[][] | null;
    timeClock?: number;
    characters?: MonsterSprite[];
    currentRound?: CombatRound;
    eventQueue: CombatEvent[];
    processedEvents?: CombatEvent[];  // ✅ Watch 模式：已处理的事件列表（用于实时计算分数）
    gameReport: GameReport | null;  // 新增：游戏报告
    score: number;  // 新增：当前分数
    submitScore: (score: number) => void;  // 新增：提交分数
    onGameOver: () => void;  // 新增：游戏结束回调
    resourceLoad: {
        character: number;
        gridContainer: number;
        gridGround: number;
        gridWalk: number;
    };
    setResourceLoad: React.Dispatch<
        React.SetStateAction<{
            character: number;
            gridContainer: number;
            gridGround: number;
            gridWalk: number;
        }>
    >;
    changeCell: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
    setActiveSkill: (skill: MonsterSkill | null) => void;
    changeCoordDirection: (direction: number) => void;
    updateGame: (updater: (game: GameModel) => void) => void;  // 新增：更新 GameModel 的函数
    mode?: GameMode;  // 游戏模式
    replay?: ReplayControls;  // 重播控制（仅在 watch 模式）
    playbackSpeed?: number;  // 回放速度（仅在 replay 模式，用于同步动画速度）
}

// export const DEFAULT_GAME_CONFIG: TacticalMonsterGameConfig = {
//     scoring: {
//         defeatBoss: 100,  // 击败Boss得分（PVE模式）
//         skillUse: 20,    // 使用技能得分
//         roundBonus: 10,  // 回合奖励
//         timeBonus: 1,    // 时间奖励
//     },
//     hintsEnabled: true,
// };


