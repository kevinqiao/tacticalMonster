import { Spine } from "pixi-spine";
import { Character, Effect, Skill } from "./CharacterTypes";
import { Seat } from "./GridTypes";


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
    uid?:string;
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
    x: number; // 六边形的 x 坐标（列）
    y: number; // 边形的 y 坐标（行）
    walkable?: boolean; // 指示该格子是否可行走
    type?: GridCellType; // 格子的类型
}

export interface GridCell {
  x: number;
  y: number;  
  type: number;
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
    facing?: number;  // 朝向角度，0度朝右，每60度一个方向
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
    move:()=>void;
    attack:()=>void;
    stand:()=>void; 
}
export class SpineModelAnimator implements ModelAnimator {
    private skeleton:Spine;
    constructor(skeleton:Spine){
        this.skeleton = skeleton;
    }
    move() {
        this.skeleton.state.setAnimation(0, "walk", true);
    }
    attack() {
        this.skeleton.state.setAnimation(0, "attack", true);
    }
    stand() {
        this.skeleton.state.setAnimation(0, "stand", true);
    }
}

export interface MapModel {
    rows: number;
    cols: number;
    direction?: number; //0-从左到右     1-从右到左

}
export interface BoardCell {
  x: number;
  y: number;
  ele?: HTMLDivElement
}
export interface ICombatContext {
    boardSize: number;
    seats: Seat[];  
    game:GameModel|null;
    coordDirection:number;  
    hexCell: {width:number,height:number};
    gameId:string|null;
    boardCells:BoardCell[][] | null;
    players?:Player[];
    timeClock?: number;
    characters?: GameCharacter[] ;
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

    // walk: (to: { q: number; r: number }) => void;
    // findPath: (from: { q: number, r: number }, to: { q: number, r: number }) => Hex[] | null;
    // getPixelPosition: (x: number, y: number) => { x: number, y: number };
    // paths: Record<string, Hex[]>;
    // setPaths: React.Dispatch<React.SetStateAction<Record<string, Hex[]>>>;
    // updateCharacterPosition: (characterId: string, x: number, y: number) => void;
}

