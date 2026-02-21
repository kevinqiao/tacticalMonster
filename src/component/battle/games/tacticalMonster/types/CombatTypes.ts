/**
 * Tactical Monster 战斗类型定义
 */

import { Spine } from "pixi-spine";
import React from "react";
import { StateChanges } from "./backendResponseTypes";
import { CharacterIdentifier, GameTurn, PhaseChanges, SkillEffectItem } from "./gameTypes";
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
 * 包含所有后端实际产生的事件名称，与后端保持一致
 */
export type EventName =
    // 生命周期事件
    | "gameInit"        // 游戏初始化
    | "game_end"        // 游戏结束
    // 回合/轮次事件
    | "firstTurn"       // 开始第一个回合（包含初始 Boss turn 和 phaseChanges）
    | "new_round"       // 新回合开始
    | "end_round"       // 回合结束
    | "roundStart"      // 回合开始（别名）
    | "roundEnd"        // 回合结束（别名）
    | "turnStart"       // Turn 开始（可能包含 bossAIAction）
    | "turnEnd"         // Turn 结束
    | "turnSecond"      // Turn 中间状态
    // 玩家操作事件
    | "walk"            // 移动
    | "attack"          // 攻击
    | "use_skill"       // 使用技能
    | "skillSelect";    // 选择技能

/**
 * 事件数据 payload
 * 不同事件的 data 结构不同：
 * - walk: { identifier, to, endTurn?, phaseChanges?, stateChanges? }
 * - use_skill: { identifier, skillId, targets, result, phaseChanges, stateChanges }
 * - attack: { attacker, skillUsed, skillId, targets, skillResult, phaseChanges }
 * - new_round / end_round: { round }
 * - turnStart: { uid, monsterId, round, bossAIAction?, triggeredPassiveSkills? }
 * - firstTurn: { phaseChanges }
 * - gameInit: GameModel
 * - game_end: { gameId }
 */
export interface CombatEventData {
    // 通用字段（不同事件可能包含不同组合）
    identifier?: CharacterIdentifier;
    to?: { q: number; r: number };
    endTurn?: boolean;
    skillId?: string;
    targets?: CharacterIdentifier[];
    result?: {
        success?: boolean;
        effects?: SkillEffectItem[];
        [key: string]: any;
    };
    attacker?: CharacterIdentifier;
    skillUsed?: boolean;
    skillResult?: any;
    skillSelect?: string;
    // 阶段变化和状态变化（自包含数据，供 watch/replay 使用）
    phaseChanges?: PhaseChanges;
    stateChanges?: StateChanges;
    // 回合相关字段
    round?: number;
    uid?: string;
    monsterId?: string;
    bossId?: string;
    minionId?: string;
    triggeredPassiveSkills?: Array<{ uid: string; monsterId: string; skillId: string; effects: any[] }>;
    bossAIAction?: {
        decision?: any;
        executionResults?: any;
        phaseTransition?: any;
    };
    character_id?: string;
    // 允许额外字段（兼容扩展）
    [key: string]: any;
}

/**
 * CombatEvent - 战斗事件
 * 前后端统一的事件类型定义
 * 
 * 设计说明：
 * - stepTime: 相对时间位置（从游戏开始，毫秒数），由后端 createEvent 自动计算
 *   创建时可选，数据库中必需
 * - data: 事件载荷，不同事件类型的 data 结构不同（参见 CombatEventData）
 * - 事件名称与后端保持一致
 */
export interface CombatEvent {
    gameId: string;                 // 必需：游戏ID
    name: EventName;                // 必需：事件名称
    time: number;                   // 必需：绝对时间戳（Date.now()）
    stepTime?: number;              // 可选：相对时间位置（创建时可选，由后端自动计算）
    type?: number;                  // 可选：事件类型（0: phase, 1: movement, 2: attack, 3: skill）
    data?: CombatEventData;         // 可选：事件数据（不同事件有不同结构）
}

/**
 * FrontendCombatEvent - 前端战斗事件（扩展类型）
 * 在 CombatEvent 基础上添加前端运行时字段
 */
export interface FrontendCombatEvent extends CombatEvent {
    initTime?: number;              // 前端扩展：事件初始化时间（用于超时检查）
    status?: number;                // 前端扩展：事件处理状态（0: 待处理, 1: 处理中, 2: 已完成）
    optimistic?: boolean;           // 前端扩展：是否为乐观事件（play 模式下本地生成的）
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
    obstacle?: number;//0-无障碍物,>1-障碍物类型
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
 * 3D 视图节点引用（由 BattleCharacter3D 挂载时设置，供 walk/skill 动画与回滚使用）
 */
export interface CharacterRef3D {
    groupRef: React.RefObject<{
        position: { x: number; y: number; z: number };
        rotation: { y: number };
    } | null>;
    /** 内层模型组，仅控制朝向 Y；行走时由 GSAP 驱动，避免被 React 覆盖 */
    modelGroupRef?: React.RefObject<{ rotation: { y: number } } | null>;
    playAnimation: (name: string) => void;
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
    /** 3D 视图节点引用（仅 3D 战斗使用，挂载时设置、卸载时清空） */
    ref3D?: CharacterRef3D;
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


