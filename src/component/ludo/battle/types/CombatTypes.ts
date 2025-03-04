import { Spine } from "pixi-spine";

export enum ACTION_TYPE {
    ROLL = 1,
    SELECT = 2,
}
export enum EVENT_NAME {
   ROLL = "roll",
   SKILL = "skill",
   NEW_ROUND = "new_round", 
   END_ROUND = "end_round",
   END_GAME = "end_game",   
   EFFECT = "effect",
}
export interface Seat {
    uid?:string;
    no: number;
    tokens:Token[];
    dice?:number;
    botOn?:boolean; 
    botOnEle?:HTMLDivElement|null;  
    countDownEle?:SVGPathElement|null;
    diceEle?:HTMLDivElement|null;
    stationEles:{[k:number]:HTMLDivElement|null};
}
export interface Player {
    uid: string;
    seat?: number;
    name?: string;
    avatar?: string;
}

export interface CombatEvent {
    name: string;
    actor?:string;
    gameId?: string;
    time?: number;
    initTime?: number;
    status?: number;//
    data?: CombatAction|CombatRound|any;
}

export interface Token {
    id: number;//0-3
    x: number;
    y: number;
    seatNo?:number;
    ele?:HTMLDivElement|null;
    selectEle?:HTMLDivElement|null;
}



export interface GameModel {
  gameId: string;
  seats:Seat[];
  currentSeat:number;//-1:not started,0-3:selected
  currentAction?:CombatAction;    
  actDue?: number;
  lastUpdate?:string;//event id
  status: number;  
}
export interface CombatAction {
   type:number;//0-roll,1-select
   tokens?:number[];
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


// export interface BoardCell {
//   x: number;
//   y: number;
//   ele?: HTMLDivElement
// }
export interface ICombatContext {
    boardDimension:{width:number,height:number};
    game:GameModel|null;
    tokens?:Token[]; 
    seatRoutes:{[k:number]:{ x: number, y: number }[]};
    players?:Player[];
    eventQueue: CombatEvent[];
    updateBoardDimension:(width:number,height:number)=>void;
}

