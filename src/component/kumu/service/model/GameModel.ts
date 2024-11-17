import { CombatRound, CombatTurn, ObstacleCell, Player } from "./CombatModels";

export interface Game {
    id: string;
    status: number;
    createTime: number;
    players: Player[];
    currentRound: CombatRound;
    currentTurn: CombatTurn[];
    obstacles: ObstacleCell[];
    disables: { x: number; y: number }[]
}
