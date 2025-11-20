/**
 * Tactical Monster 战斗类型定义
 */

import { Spine } from "pixi-spine";
import { Character, Effect, Skill } from "./CharacterTypes";

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
}

export interface GameModel {
    gameId: string;
    map: MapModel;
    direction?: number;
    challenger: string;
    challengee: string;
    players: Player[];
    characters: GameCharacter[];
    currentRound?: CombatRound;
    timeClock?: number;
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

export interface PlayerCharacter extends Character {
    uid: string;
}

export interface GameCharacter extends Character {
    uid: string;
    character_id: string;
    scaleX?: number;
    q?: number;
    r?: number;
    skills?: Skill[];
    status?: 'normal' | 'stunned';
    facing?: number;
    walkables?: WalkableNode[];
    attackables?: AttackableNode[];
    container?: HTMLDivElement;
    standEle?: HTMLDivElement;
    attackEle?: HTMLDivElement;
    skeleton?: Spine;
    animator?: ModelAnimator;
    skillCooldowns?: Record<string, number>;
    activeEffects?: Effect[];
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

// 游戏规则相关
export interface CombatRule {
    canWalk: (character: GameCharacter, to: { q: number; r: number }) => boolean;
    canAttack: (attacker: GameCharacter, target: GameCharacter, skill?: Skill | null) => boolean;
    canSelectSkill: (character: GameCharacter, skill: Skill) => boolean;
    getWalkableTargets: (character: GameCharacter) => WalkableNode[];
    getAttackableTargets: (attacker: GameCharacter, skill?: Skill | null) => AttackableNode[];
    isGameOver: () => boolean;
}

export interface ICombatContext {
    game: GameModel | null;
    activeSkill: Skill | null;
    coordDirection: number;
    hexCell: { width: number; height: number };
    gameId: string | null;
    map?: MapModel;
    gridCells: GridCell[][] | null;
    challenger?: string;
    challengee?: string;
    players?: Player[];
    timeClock?: number;
    characters?: GameCharacter[];
    currentRound?: CombatRound;
    eventQueue: CombatEvent[];
    ruleManager: CombatRule | null;
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
    setActiveSkill: (skill: Skill | null) => void;
    changeCoordDirection: (direction: number) => void;
}


