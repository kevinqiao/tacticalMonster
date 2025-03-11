
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
    seatNo?: number;
    zone?: number;//1-deck,0-foundation,2-tableau
    col?: number;
    row?: number;
    rank?: string;
    suit?: string;
    ele?: HTMLDivElement | null;
}
export interface Seat {
    uid?: string;
    no: number;
    cards: Card[];
    botOn?: boolean;
    botOnEle?: HTMLDivElement | null;
    foundationEles?: { [k: number]: HTMLDivElement | null };
    tableauEles?: { [k: number]: HTMLDivElement | null };
    opponentEles?: { [k: number]: HTMLDivElement | null };
    deckEles?: HTMLDivElement | null;
}


export interface GameModel {
    gameId: string;
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
    status?: number;
}

export interface ICombatContext {
    decks: Card[];
    boardContainer: { [k: string]: { [k: number]: HTMLDivElement | null } };
    boardDimension: { width: number, height: number };
    game: GameModel | null;
    players?: Player[];
    eventQueue: CombatEvent[];
    updateBoardDimension: (width: number, height: number) => void;
}

