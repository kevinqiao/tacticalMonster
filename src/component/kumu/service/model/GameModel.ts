import { CombatAction, CombatRound, CombatTurn, ObstacleCell, Player } from "./CombatModels";

export interface Game {
    id: string;
    status: number;
    createTime: number;
    players: Player[];
    rounds: CombatRound[];
    turns: CombatTurn[];
    actions: CombatAction[];
    obstacles: ObstacleCell[];
    disables: { x: number; y: number }[]
}
