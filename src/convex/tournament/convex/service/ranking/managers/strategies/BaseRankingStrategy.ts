/**
 * 基础排名策略抽象类
 */

import { HumanAnalysis, HumanPlayer, PlayerPerformanceProfile, PlayerRankingResult, RankingStrategy } from '../types/CommonTypes';
import { RankingConfig } from '../types/RankingConfig';
import { RankingCalculator } from '../utils/RankingCalculator';

export abstract class BaseRankingStrategy implements RankingStrategy {
    protected config: RankingConfig;

    constructor(config: RankingConfig) {
        this.config = config;
    }

    abstract calculateRanking(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult>;

    /**
     * 计算人类玩家在人类玩家中的排名
     */
    protected calculateHumanRank(player: HumanPlayer, humanPlayers: HumanPlayer[]): number {
        return RankingCalculator.calculateHumanRank(player, humanPlayers);
    }

    /**
     * 计算分数因子
     */
    protected calculateScoreFactor(score: number, humanAnalysis: HumanAnalysis): number {
        return RankingCalculator.calculateScoreFactor(score, humanAnalysis);
    }

    /**
     * 计算技能因子
     */
    protected calculateSkillFactor(profile: PlayerPerformanceProfile): number {
        return RankingCalculator.calculateSkillFactor(profile);
    }

    /**
     * 计算信心度
     */
    protected calculateConfidence(profile: PlayerPerformanceProfile, humanAnalysis: HumanAnalysis): number {
        return RankingCalculator.calculateConfidence(profile, humanAnalysis);
    }

    /**
     * 分析玩家相对表现
     */
    protected analyzePlayerRelativePerformance(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis
    ): 'excellent' | 'good' | 'average' | 'poor' {
        return RankingCalculator.analyzePlayerRelativePerformance(player, profile, humanAnalysis);
    }

    /**
     * 生成基础排名结果
     */
    protected buildRankingResult(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        recommendedRank: number,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        aiCount: number,
        humanPlayers: HumanPlayer[],
        reasoning: string
    ): PlayerRankingResult {
        return {
            uid: player.uid,
            recommendedRank,
            confidence: this.calculateConfidence(profile, humanAnalysis),
            reasoning,
            relativePerformance: this.analyzePlayerRelativePerformance(player, profile, humanAnalysis)
        };
    }
}
