import { DragEventData } from "../view/DnDCard";


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
    uid?: string;
    field?: number;
    botOn?: boolean;
    botOnEle?: HTMLDivElement | null;
    ele?: HTMLDivElement | null;
}


export interface GameModel {
    gameId: string;
    seats?: Seat[];
    currentRound?: number;
    currentTurn?: CombatTurn;//-1:not started,0-3:selected
    cards?: Card[];
    actDue?: number | null;
    lastUpdate?: string;//event id
    status: number;
}

export interface CombatTurn {
    field: number;
    actions: { acted: number; max: number };
    status: number;//0-not started,1-started,2-ended 
}
export interface CombatRound {
    no: number;
    status?: number;//0-inited 1-ongoing 2-completed
}
export interface Zone {
    top: number;
    left: number;
    width: number;
    height: number;
    cwidth: number;
    cheight: number;
    margin: { t: number, l: number, r: number, b: number };
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
    currentAct: { due: number; field: number } | null;
    players?: Player[];
    eventQueue: CombatEvent[];
    askAct: (due: number) => void;
    completeAct: () => void;
    updateBoardDimension: (boardDimension: BoardDimension) => void;
}
export interface IDnDContext {
    isTouchDevice: boolean;
    canDrag: (id: string) => boolean;
    onDrag: (card: Card, data: DragEventData) => void;
    onDragStart: (card: Card, data: DragEventData) => void;
    onDragEnd: (card: Card, data: DragEventData) => void;
    onDrop: (card: Card, data: DragEventData) => void;
    onDragOver: (card: Card, data: DragEventData) => void;
}

