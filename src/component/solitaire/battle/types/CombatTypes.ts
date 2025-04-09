
import { DragEventData } from "../view/DnDCard";
import { CardRank } from "./PlayerTypes";


export interface Player {
    uid: string;
    name?: string;
    avatar?: string;
}

export interface CombatEvent {
    name: string;
    actor?: string;
    gameId?: string;
    time?: number;
    initTime?: number;
    status?: number;//
    data?: any;
}

export interface Card {
    id: string;
    seat?: number;
    field?: number;//1-deck,0-foundation,2-tableau
    col?: number;
    row?: number;
    rank?: string;
    suit?: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    zIndex?: number;
    ele?: HTMLDivElement | null;
    status?: number;//0-normal,1-flipped
}
export interface Seat {
    uid: string;
    field: number;
    ep?: number;
    score?: number;
    botOn?: boolean;
    botOnEle?: HTMLDivElement | null;
    ele?: HTMLDivElement | null;
    skillUses?: { id: string; currentUses: number }[];
}
export type Slot = {
    index: number,
    top: number,
    left: number,
    width: number,
    height: number,
    ele?: HTMLDivElement | null,
}
export type Zone = {
    index: number,
    top: number,
    left: number,
    width: number,
    height: number,
    cwidth: number,
    cheight: number,
    slots: Slot[],
    ele?: HTMLDivElement | null,
    actionBarEles: { [k: number]: HTMLDivElement | null },
}

export interface GameModel {
    gameId: string;
    seats?: Seat[];
    currentRound?: CombatRound;
    currentTurn?: CombatTurn;//-1:not started,0-3:selected
    skillUse?: { skillId: string, status: number, data: any };
    cards?: Card[];
    actDue?: number | null;
    lastUpdate?: string;//event id
    status: number;
}

export interface CombatTurn {
    uid: string;
    actions: { acted: { type: string; result: { move: Card[], open: Card[] } }[]; max: number };
    skillUse?: string;
    status: number;//0-not started,1-started,2-ended 
}
export interface CombatRound {
    no: number;
    turnOvers: string[];//uid array who have acted
    status?: number;//0-inited 1-ongoing 2-completed
}

export interface BoardDimension {
    width: number;
    height: number;
    zones: { [k: number]: Zone };
    top: number;
    left: number;
}
export interface ICombatContext {
    // decks: Card[];
    direction: number;
    boardContainer: { [k: string]: { [k: number]: HTMLDivElement | null } };
    boardDimension: BoardDimension | null;
    game: GameModel | null;
    currentAct: { act: number, due: number; uid: string } | null;
    players?: Player[];
    eventQueue: CombatEvent[];
    askAct: (due: number) => void;
    completeAct: () => void;
    updateBoardDimension: (boardDimension: BoardDimension) => void;
}
export interface ISkillContext {
    activeSkill: { skillId: string, status: number, data: any } | null;
    canTriggerSkill: (triggerCard: CardRank) => { id: string, talentLevel: number } | undefined;
    triggerSkill: ({ skillId, data }: { skillId: string, data: any }) => void;
    updateActiveSkill: (data: any) => void;
    completeActiveSkill: () => void;
}
export interface IDnDContext {
    isTouchDevice: boolean;
    onDrag: (card: Card, data: DragEventData) => void;
    onDragStart: (card: Card, data: DragEventData) => void;
    onDragEnd: (card: Card, data: DragEventData) => void;
    onDragOver: (card: Card, data: DragEventData) => void;
}
export interface ICombatSceneContext {
    scenes: { [k: string]: { [k: number]: HTMLDivElement | null } };
}
