/**
 * 成熟阶段排名策略
 */

import { HumanAnalysis, HumanPlayer, PlayerRankingProfile, PlayerRankingResult } from '../types/CommonTypes';
import { ReasoningGenerator } from '../utils/ReasoningGenerator';
import { BaseRankingStrategy } from './BaseRankingStrategy';

export class VeteranRankingStrategy extends BaseRankingStrategy {
    private humanPlayerCount: number;

    constructor(config: any, humanPlayerCount: number) {
        super(config);
        this.humanPlayerCount = humanPlayerCount;
    }

    async calculateRanking(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult> {
        const shouldUseSegmentProbability = this.shouldUseSegmentProbability();

        let adjustedRank: number;
        let reasoning: string;

        // 计算AI数量
        const aiCount = totalParticipants - humanPlayers.length;

        if (shouldUseSegmentProbability) {
            adjustedRank = this.calculateSegmentAdjustedRank(player, profile, totalParticipants);
            reasoning = ReasoningGenerator.generateSegmentReasoning(
                player,
                profile,
                adjustedRank,
                totalParticipants
            );
        } else {
            adjustedRank = this.calculateTraditionalRank(player, profile, humanAnalysis, totalParticipants, humanPlayers);
            const relativePerformance = this.analyzePlayerRelativePerformance(player, profile, humanAnalysis);
            reasoning = ReasoningGenerator.generateVeteranReasoning(
                player,
                profile,
                adjustedRank,
                totalParticipants,
                aiCount,
                relativePerformance,
                shouldUseSegmentProbability
            );
        }

        return this.buildRankingResult(
            player,
            profile,
            adjustedRank,
            humanAnalysis,
            totalParticipants,
            aiCount,
            humanPlayers,
            reasoning
        );
    }

    /**
     * 判断是否使用段位概率
     */
    private shouldUseSegmentProbability(): boolean {
        return this.humanPlayerCount === 1 && this.config.supportedParticipantCounts.includes(4);
    }

    /**
     * 计算段位调整排名
     */
    private calculateSegmentAdjustedRank(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        totalParticipants: number
    ): number {
        // 这里应该调用段位概率计算，暂时返回模拟值
        const baseRank = Math.ceil(totalParticipants / 2);
        const adjustment = (Math.random() - 0.5) * totalParticipants * 0.3;
        return Math.max(1, Math.min(totalParticipants, Math.round(baseRank + adjustment)));
    }

    /**
     * 计算传统排名
     */
    private calculateTraditionalRank(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): number {
        const scoreFactor = this.calculateScoreFactor(player.score, humanAnalysis);
        const skillFactor = this.calculateSkillFactor(profile);
        const combinedFactor = (skillFactor * this.config.veteranSkillWeight) + (scoreFactor * this.config.veteranScoreWeight);

        const baseRank = this.calculateHumanRank(player, humanPlayers);
        const adjustment = (combinedFactor - 0.5) * this.config.veteranAdjustmentMultiplier;

        return Math.max(1, Math.min(totalParticipants, Math.round(baseRank + adjustment)));
    }
}
