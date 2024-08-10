
export interface Leaderboard {
    id: number;
    uid: string;
    score: number;
    scoreLasttime: number;
    scoreStarttime: number;
    tournamentId: string;
    reward?: any;
}