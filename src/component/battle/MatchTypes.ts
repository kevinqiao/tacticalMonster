import { SoloGameConfig } from "component/battle/games/solitaireSolo/battle/types/SoloTypes";


/** 与 tournament Convex player_matches.status 一致 */
export type PlayerMatchRecordStatus = "open" | "finished" | "settled";

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
    status: MatchStatus | PlayerMatchRecordStatus;
    opponents: {
        uid: string;
        name: string;
        avatar: string;
        score: number;
        rank: number;
        status: MatchStatus | PlayerMatchRecordStatus;
    }[];
    createdAt?: string;
    updatedAt?: string;
    lastUpdate?: string;
}
export interface GamePlayerProps {
    gameId: string;
    gameType: string;
    config?: Partial<SoloGameConfig>;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}
export enum MatchStatus {
    OPEN = 0,
    COMPLETED = 1,
    CANCELLED = 2
}