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
    characters: CharacterUnit[];
}
export interface CombatEvent {
    type: number;
    gameId?: string;
    data: CombatRound | CombatTurn | CombatAction;
}
export interface CombatAction {
    id: string;
    round?: number;
    turn?: number;
    parent?: string;
    type?: number;//0-user act 1-auto in round start 2-auto in round over 3-auto in turn start 4-auto in turn over 
    code: number;
    data?: object;
    result?: { [k: string]: any };
    status: number;//0-open 1-end
}
export interface CombatTurn {
    no: number;
    round: number;
    character: number;
    uid: string;
    actions?: CombatAction[];
    status: number;//0-open 1-inited 2-over
}
export interface CombatRound {
    no: number;
    turns: CombatTurn[];
    endTime?: number;
    actions?: CombatAction[];
    status: number;//0-open 1-inited 2-over
}
export interface GridCell {
    x: number;
    y: number;
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

export interface CharacterUnit {
    id: number;
    uid?: string;
    speed: number;
    position: { x: number; y: number };
    movementRange: number;
    attackRange?: { min: number; max: number };
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

export interface ICombatContext {
    cellSize: number;
    // mapSize: { rows: number; cols: number };
    map: MapModel;
    gridMap: HexNode[][] | null;
    gridCells: GridCell[][] | null;
    players: Player[] | null;
    eventQueue: CombatEvent[];
    currentRound: CombatRound | null;
    currentTurn: CombatTurn | null;
    currentAction: CombatAction | null;
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
    setCurrentRound: React.Dispatch<React.SetStateAction<CombatRound | null>>;
    setCurrentTurn: React.Dispatch<React.SetStateAction<CombatTurn | null>>;
    setCurrentAction: React.Dispatch<React.SetStateAction<CombatAction | null>>;
    changeMap: React.Dispatch<React.SetStateAction<MapModel>>;
    changeCellSize: React.Dispatch<React.SetStateAction<number>>;
    walk: (to: { x: number; y: number }) => void;
}

