export enum ACT_CODE {
    WALK = 1,
    ATTACK = 2,
    STAND = 3,
    SELECT = 4,
    DEFEND = 5,
    STANDBY = 6,
    HEAL = 7,
}
export interface Character {
    x: number; // 当前列号
    y: number; // 当前行号
    movementRange: number; // 角色可移动的最大范围
}
// 定义HexNode接口
export interface HexNode {
    x: number;
    y: number;
    walkable?: boolean;
    type?: number; //0-field 1-obstacle 2-unavailable
}
export interface Player {
    uid: string;
    characters: CharacterUnit[];
}
export interface CombatAction {
    code: number;
    data: any;
    status: number;//0-in progress 1-completed
}
export interface CombatRound {
    no: number;
    uid: string;
    actors: { id: number; actions: CombatAction[]; actCompleted: boolean }[];
    startTime: number;
    endTime?: number;
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
export interface WalkableNode extends HexNode {
    path?: { x: number; y: number }[];
    distance: number; // 距离角色的步数
    level?: number;
}
export interface AttackableNode extends HexNode {
    distance: number; // 距离角色的步数
    level?: number;
}
export interface SkillableNode extends HexNode {
    distance: number; // 距离角色的步数
    level?: number;
}
export interface CharacterUnit {
    id: number;
    position: { x: number; y: number };
    movementRange: number;
    attackRange?: number;
    asset: string;
    container?: HTMLDivElement;
    walkables?: WalkableNode[];
    attackables?: AttackableNode[];
    skillables?: SkillableNode[];
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
    currentRound: CombatRound | null;
    currentAction: CombatAction | null;
    selectedCharacter: CharacterUnit | null;
    // select: (character: CharacterUnit) => void;
    // walk: (character: CharacterUnit, to: WalkableNode) => void;
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
    setSelectedCharacter: React.Dispatch<React.SetStateAction<CharacterUnit | null>>;
    changeMap: React.Dispatch<React.SetStateAction<MapModel>>;
    changeCellSize: React.Dispatch<React.SetStateAction<number>>;
}