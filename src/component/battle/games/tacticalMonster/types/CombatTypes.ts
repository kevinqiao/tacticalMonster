/**
 * Tactical Monster 战斗类型定义
 */


import { Spine } from "pixi-spine";
import { GameTurn, PhaseChanges } from "./gameTypes";
import { GameMonster } from "./monsterTypes";

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

/**
 * 事件名称类型
 * 简化后的事件类型，只包含核心事件
 * 与后端保持一致
 */
export type EventName =
    | "gameInit"        // 游戏初始化
    | "firstTurn"       // 开始第一个回合（包含初始 Boss turn 和 phaseChanges）
    | "use_skill"       // 使用技能（包含 playerAction 和 phaseChanges）
    | "walk"            // 移动（包含 playerAction 和 phaseChanges）
    | "attack"          // 攻击（包含 playerAction 和 phaseChanges）
    | "game_end";       // 游戏结束

/**
 * CombatEvent - 战斗事件（后端类型）
 * 与后端定义保持一致，data 统一为 PhaseChanges
 * 
 * 设计说明：
 * - stepTime: 相对时间位置（从游戏开始，毫秒数），用于去重和排序（数据库中必需）
 * - data: 统一为 PhaseChanges 类型，所有事件都使用相同的数据结构
 * - 事件名称与后端保持一致
 */
export interface CombatEvent {
    // ========== 后端必需字段（所有事件共有）==========
    gameId: string;                 // ✅ 必需：游戏ID
    name: EventName;                // ✅ 必需：事件名称（类型安全）
    time: number;                   // ✅ 必需：绝对时间戳（Date.now()）
    stepTime: number;               // ✅ 必需：相对时间位置（从游戏开始，毫秒数），用于去重和排序

    // ========== 事件数据（统一结构）==========
    data?: PhaseChanges;            // ✅ 可选：事件数据（统一为 PhaseChanges）

    // ========== 事件类型（可选，用于分类）==========
    type?: number;                  // ✅ 可选：事件类型（0: phase, 1: movement, 2: attack, 3: skill）
}

/**
 * FrontendCombatEvent - 前端战斗事件（扩展类型）
 * 在后端 CombatEvent 基础上添加前端运行时字段
 * 
 * 设计说明：
 * - initTime: 事件初始化时间（用于超时检查）
 * - status: 事件处理状态（0: 待处理, 1: 处理中, 2: 已完成）
 * - 这些字段只在前端使用，不影响后端数据
 */
export interface FrontendCombatEvent extends CombatEvent {
    // ========== 前端运行时字段 ==========
    initTime?: number;              // ✅ 前端扩展：事件初始化时间（用于超时检查）
    status?: number;                // ✅ 前端扩展：事件处理状态（0: 待处理, 1: 处理中, 2: 已完成）
}

/**
 * 前端 GameModel - 扩展后端 GameModel，添加前端运行时需要的字段
 * 使用 Omit 排除后端的 map 字段，然后添加前端的 MapModel
 * 注意：不再包含 characters 字段，直接使用后端的 team 和 boss
 */
// export interface GameModel extends Omit<BackendGameModel, 'map'> {
//     // 前端运行时字段
//     map: MapModel;  // 覆盖后端的 map 类型，使用前端的 MapModel（包含 direction 和 obstacles 的扩展格式）
//     currentRound?: CombatRound;  // 当前回合信息（前端运行时）
//     timeClock?: number;  // 时间时钟（前端运行时）

// }


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

// ✅ CombatTurn 已移除，统一使用 GameTurn

export interface CombatRound {
    no: number;
    currentTurn?: GameTurn;
}

export enum GridCellType {
    Field = 0,
    Obstacle = 1,
    Unavailable = 2,
}

export interface HexNode {
    q: number;
    r: number;
}

export interface GridCellSprite {
    q: number;
    r: number;
    disable?: boolean;
    element?: SVGElement | null;
}


export interface WalkableNode extends HexNode {
    distance?: number;
}

export interface AttackableNode extends HexNode {
    distance?: number;
    uid?: string;  // 目标角色的 uid
    character_id?: string;  // 目标角色的 character_id
}

/**
 * MonsterSprite - 前端渲染用的Monster类型
 * 基于GameMonster，添加UI渲染相关字段和前端需要的扩展字段
 * 统一使用后端的 MonsterSkill[] 类型（不再转换）
 */
export interface MonsterSprite extends GameMonster {
    // ========== 前端标识字段 ==========
    character_id: string;                // 前端使用的角色ID（从 monsterId/bossId/minionId 转换而来）

    // ========== UI渲染相关字段 ==========
    scaleX?: number;                    // 水平翻转（1: 向右, -1: 向左）
    facing?: number;                     // 面向方向
    container?: HTMLDivElement;          // DOM容器元素
    standEle?: HTMLDivElement;           // 站立状态元素
    attackEle?: HTMLDivElement;          // 攻击状态元素
    skeleton?: Spine;                    // Spine动画骨架
    animator?: ModelAnimator;           // 动画控制器
    walkables?: WalkableNode[];
    attackables?: AttackableNode[];
    // statusEffects 直接继承自 GameMonster，类型为 StatusEffect[]

    // ========== HP/MP 显示元素（通过 GSAP 更新，避免 React 重新渲染）==========
    hpBarElement?: HTMLDivElement;       // HP 条元素
    mpBarElement?: HTMLDivElement;       // MP 条元素
    hpTextElement?: HTMLDivElement;      // HP 文字元素
    mpTextElement?: HTMLDivElement;      // MP 文字元素
}

export interface ModelAnimator {
    move: () => void;
    attack: () => void;
    stand: () => void;
}

// 重新导出 GameModel 以便统一使用
export type { GameModel } from "./gameTypes";





// export const DEFAULT_GAME_CONFIG: TacticalMonsterGameConfig = {
//     scoring: {
//         defeatBoss: 100,  // 击败Boss得分（PVE模式）
//         skillUse: 20,    // 使用技能得分
//         roundBonus: 10,  // 回合奖励
//         timeBonus: 1,    // 时间奖励
//     },
//     hintsEnabled: true,
// };


