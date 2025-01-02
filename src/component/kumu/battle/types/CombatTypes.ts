import { Spine } from "pixi-spine";
import { Character, SkillEffect as Effect, Skill } from "./CharacterTypes";

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
    type?: number;//0-phase 1-action 2-effect;
    name: string;
    gameId?: string;
    time?: number;
    initTime?: number;  
    status?: number;//
    data?: CombatAction|CombatRound|any;
}
export interface GameModel {
  gameId: string;
  map: MapModel;
  direction?: number;
  challenger: string;
  challengee: string;
  players: Player[];
  characters: CharacterUnit[];
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
    r: number;
    q: number;
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
    uid:string;
    character_id:string;  
    distance: number; // 距离角色的步数
}

export interface CharacterUnit extends Character {
    uid: string;
    character_id: string;
    scaleX?: number; 
    asset?: string;
    q?: number;
    r?: number;
    facing?: number;  // 朝向角度，0度朝右，每60度一个方向
    walkables?: WalkableNode[];
    attackables?: AttackableNode[];
    container?: HTMLDivElement;
    standEle?: HTMLDivElement;
    attackEle?: HTMLDivElement;    
    skeleton?: Spine;
    skillCooldowns?: Record<string, number>;
    activeEffects?: Effect[];
}
export interface MapModel {
    rows: number;
    cols: number;
    direction?: number; //0-从左到右     1-从右到左
    obstacles?: ObstacleCell[];
    disables?: { q: number; r: number }[];
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
    game:GameModel|null;
    selectedActiveSkill:Skill|null; 
    coordDirection:number;  
    hexCell: {width:number,height:number};
    gameId:string|null;
    map?: MapModel;
    gridCells: GridCell[][] | null;
    challenger?:string;
    challengee?:string;
    players?:Player[];
    timeClock?: number;
    characters?: CharacterUnit[] ;
    currentRound?: CombatRound;
    eventQueue: CombatEvent[];
    // rowContainers: { [k: number]: HTMLDivElement };
    resourceLoad: {
        character: number;
        gridContainer: number;
        gridGround: number;
        gridWalk: number;
        // rowContainers: number;
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
    setSelectedActiveSkill:(skill:Skill)=>void;
    changeCoordDirection:(direction:number)=>void;
    // walk: (to: { q: number; r: number }) => void;
    // findPath: (from: { q: number, r: number }, to: { q: number, r: number }) => Hex[] | null;
    // getPixelPosition: (x: number, y: number) => { x: number, y: number };
    // paths: Record<string, Hex[]>;
    // setPaths: React.Dispatch<React.SetStateAction<Record<string, Hex[]>>>;
    // updateCharacterPosition: (characterId: string, x: number, y: number) => void;
}

