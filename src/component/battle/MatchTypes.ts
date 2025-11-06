import { SoloGameConfig } from "component/solitaireSolo/battle/types/SoloTypes";


export interface PlayerMatch {
    uid: string;
    matchId: string;
    tournamentId: string;
    tournamentType: string;
    gameType: string;
    gameId?: string;
    segmentName?: string;
    score: number;
    rank: number;
    status: MatchStatus;
    opponents: {
        uid: string;
        name: string;
        avatar: string;
        score: number;
        rank: number;
        status: MatchStatus;
    }[];
    createdAt?: string;
    updatedAt?: string;
    lastUpdate?: string;
}
export interface GamePlayerProps {
    gameId: string;
    gameType: string;
    config?: Partial<SoloGameConfig>;
}
export enum MatchStatus {
    SEARCHING = 0,
    START = 1,
    COMPLETED = 2,
    SUBMITTED = 3,
    CANCELLED = 4
}