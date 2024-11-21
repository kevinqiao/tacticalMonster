import { Character } from "./CharacterModels";

export enum ACT_CODE {
    WALK = 1,
    ATTACK = 2,
    STAND = 3,
    DEFEND = 4,
    STANDBY = 5,
    HEAL = 6,
}
export enum EVENT_TYPE {
    GAME_INIT = 1,
    GAME_OVER = 2,
    ROUND_INIT = 3,
    ROUND_OVER = 4,
    TURN_INIT = 5,
    TURN_OVER = 6,
    TURN_ACT = 7
}

export interface Player {
    uid: string;
    name?: string;
    avatar?: string;
}

export interface CombatEvent {
    category: string;//phase 1-action 2-effect;
    name: string;
    gameId: string;
    time: number;
    data: CombatRound | CombatTurn | CombatAction;
}
export interface CombatAction {
    gameId: string;
    round?: number;
    actor: string;
    act: number;
    data?: object;
}
export interface CombatTurn {
    character: string;
    uid: string;
}
export interface CombatRound {
    no: number;
    gameId: string;
    turns: { uid: string; character: string; status: number }[];
}
export interface GridCell extends HexNode {

    gridContainer: SVGSVGElement | null;
    gridGround: SVGPolygonElement | null;
    gridStand: SVGPolygonElement | null;
    gridAttack: SVGCircleElement | null;
    gridCover: HTMLDivElement | null;
}
export interface ObstacleCell {
    row: number;
    col: number;
    asset: string;
    type?: number;
    walkable?: boolean;
    element?: HTMLDivElement;
}
// 定义HexNode接口
export interface HexNode {
    x: number;
    y: number;
    walkable?: boolean;
    type?: number; //0-field 1-obstacle 2-unavailable
}
export interface WalkableNode extends HexNode {
    path: { x: number; y: number }[];
    distance?: number; // 距离角色的步数
    turnEnd?: number;
}
export interface AttackableNode extends HexNode {
    distance: number; // 距离角色的步数
}

export interface CharacterUnit extends Character {
    asset: string;
    container?: HTMLDivElement;
    walkables?: WalkableNode[];
    attackables?: AttackableNode[];
}
export interface MapModel {
    rows: number;
    cols: number;
    obstacles?: ObstacleCell[];
    disables?: { x: number; y: number }[];
}
export interface TMGame {
    id: string;
    challenger: Player;
    challengee: Player;
    currentRound: CombatRound;
    timeClock: number;
    characters: CharacterUnit[];
    obstacles: ObstacleCell[];
    disables: { x: number; y: number }[];
    status: number;
}

export interface ICombatContext {
    cellSize: number;
    // mapSize: { rows: number; cols: number };
    map: MapModel;
    // gridMap: HexNode[][] | null;
    gridCells: GridCell[][] | null;
    challenger: Player | null;
    challengee: Player | null;
    timeClock: number;
    characters: CharacterUnit[] | null;
    currentRound: CombatRound | null;
    eventQueue: CombatEvent[];
    resourceLoad: {
        character: number;
        gridContainer: number;
        gridGround: number;
        gridCover: number;
        gridStand: number;
        gridAttack: number;
    } | null;
    setResourceLoad: React.Dispatch<
        React.SetStateAction<{
            character: number;
            gridContainer: number;
            gridGround: number;
            gridCover: number;
            gridStand: number;
            gridAttack: number;
        }>
    >;
    changeCellSize: React.Dispatch<React.SetStateAction<number>>;
    walk: (to: { x: number; y: number }) => void;
}

