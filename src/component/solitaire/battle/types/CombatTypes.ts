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
    ele?: HTMLDivElement | null;
    status?: number;//0-normal,1-flipped
}
export interface Seat {
    uid?: string;
    no: number;
    botOn?: boolean;
    botOnEle?: HTMLDivElement | null;
}


export interface GameModel {
    gameId: string;
    seats?: Seat[];
    currentRound?: number;
    currentTurn?: CombatTurn;//-1:not started,0-3:selected
    cards?: Card[];
    actDue?: number;
    lastUpdate?: string;//event id
    status: number;
}

export interface CombatTurn {
    seatNo: number;
    actions: number[];
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
}
export interface ICombatContext {
    decks: Card[];
    direction: number;
    boardContainer: { [k: string]: { [k: number]: HTMLDivElement | null } };
    boardDimension: BoardDimension | null;
    game: GameModel | null;
    players?: Player[];
    eventQueue: CombatEvent[];
    updateBoardDimension: (boardDimension: BoardDimension) => void;
}

