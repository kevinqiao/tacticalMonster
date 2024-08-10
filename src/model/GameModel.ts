export type GameResult = {
    base: number;
    time: number;
    goal: number;
    total?: number;
}
export interface GameModel {
    gameId: string;
    battleId: string;
    diffcult: string;
    uid: string;
    tid: string;
    result?: GameResult;
    score?: number;
    lastStep: number;
    seed?: string;
    startTime: number;
    status: number;//0-open 1-settled 2-rewarded
    type: number;
    data: any;
}