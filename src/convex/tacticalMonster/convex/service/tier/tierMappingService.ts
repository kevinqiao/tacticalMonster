import { getTierFromTournamentType } from "../../data/tierMappingConfig";

/**
 * Tier 映射服务
 * 负责 TournamentType 到 Tier 的映射
 */
export class TierMappingService {
    /**
     * 从 TournamentType 获取 Tier
     */
    static getTierFromTournamentType(tournamentType: string): string | null {
        return getTierFromTournamentType(tournamentType);
    }
    
    /**
     * 验证 TournamentType 是否有效
     */
    static isValidTournamentType(tournamentType: string): boolean {
        return getTierFromTournamentType(tournamentType) !== null;
    }
}

