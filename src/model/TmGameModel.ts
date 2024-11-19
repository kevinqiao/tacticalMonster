import { CharacterUnit, CombatRound, CombatTurn, ObstacleCell } from "component/kumu/service/model/CombatModels";

export interface TMGame {
    id: string;
    status: number;
    createTime: number;
    characters: CharacterUnit[];
    currentRound: CombatRound;
    currentTurn: CombatTurn;
    timeout:number;
    obstacles: ObstacleCell[];
    disables: { x: number; y: number }[]
}