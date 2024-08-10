
export interface BattleModel {
    id: string;
    type?: number;//0-solo 1-pvp
    duration: number;
    players?: { uid: string; gameId: string; avatar?: number; name?: string }[];
    games?: { uid: string, gameId: string; status?: number; result?: any, data?: any }[];
    tournamentId: string;
    status?: number;//0-active 1-over 2-settled
    rewards?: BattleReward[];
    startTime: number;
    data: { chunk: number; column: number; row: number; goal: number; steps: number };
}

export type BattleReward = {
    uid: string;
    gameId: string;
    rank: number;
    score: number;
    points?: number;
    assets: { asset: number, amount: number }[]
}