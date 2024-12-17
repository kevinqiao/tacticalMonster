import { Spine } from "pixi-spine";
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
    type: number;//0-phase 1-action 2-effect;
    name: string;
    gameId?: string;
    time?: number;
    status?: number;//
    data?: CombatAction|CombatRound|any;
}
export interface CombatAction {
    uid: string;
    round?: number;
    character: string;
    act: number;
    data?: any;
}

export interface CombatRound {
    no: number;
    gameId: string;
    startTime?:number;
    completeTime?:number;
    status?:number;//0-pending 1-inited 2-completed
    currentTurn?:{uid:string,character:string,startTime:number};
    turns: { uid: string; character: string; status: number;startTime?:number;completeTime?:number }[];
}

export enum GridCellType {
    Field = 0,
    Obstacle = 1,
    Unavailable = 2,
}

export interface HexNode {
    x: number; // 六边形的 x 坐标（列）
    y: number; // 边形的 y 坐标（行）
    walkable?: boolean; // 指示该格子是否可行走
    type?: GridCellType; // 格子的类型
}

export interface GridCell extends HexNode {
    gridContainer: SVGSVGElement | null; // 六边形格子的 SVG 容器
    gridGround: SVGPolygonElement | null; // 表示地面的多边形元素
    gridWalk: SVGPolygonElement | null; // 表示站立区域的多边形元素

}

export interface ObstacleCell {
    row: number;
    col: number;
    asset: string;
    type?: number;
    walkable?: boolean;
    element?: HTMLDivElement;
}

export interface WalkableNode extends HexNode {
    // path: { x: number; y: number }[];
    distance?: number; // 距离角色的步数
}

export interface AttackableNode extends HexNode {
    distance: number; // 距离角色的步数
}

export interface CharacterUnit extends Character {
    uid: string;
    character_id: string;
    asset: string;
    q: number;
    r: number;
    walkables?: WalkableNode[];
    attackables?: AttackableNode[];
    container?: HTMLDivElement;
    standEle?: HTMLDivElement;
    attackEle?: HTMLDivElement;    
    skeleton?: Spine;

}
export interface MapModel {
    rows: number;
    cols: number;
    obstacles?: ObstacleCell[];
    disables?: { x: number; y: number }[];
}
// export interface TMGame {
//     id: string;
//     challenger: Player;
//     challengee: Player;
//     currentRound: CombatRound;
//     timeClock: number;
//     characters: CharacterUnit[];
//     obstacles: ObstacleCell[];
//     disables: { x: number; y: number }[];
//     status: number;
// }

export interface ICombatContext {
    hexCell: {width:number,height:number};
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
        gridWalk: number;
    } ;
    setResourceLoad: React.Dispatch<
        React.SetStateAction<{
            character: number;
            gridContainer: number;
            gridGround: number;
            gridWalk: number;
        }>
    >;
    changeCell: React.Dispatch<React.SetStateAction<{width:number,height:number}>>;
    walk: (to: { q: number; r: number }) => void;
    // findPath: (from: { q: number, r: number }, to: { q: number, r: number }) => Hex[] | null;
    // getPixelPosition: (x: number, y: number) => { x: number, y: number };
    // paths: Record<string, Hex[]>;
    // setPaths: React.Dispatch<React.SetStateAction<Record<string, Hex[]>>>;
    // updateCharacterPosition: (characterId: string, x: number, y: number) => void;
}

