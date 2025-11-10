/**
 * 成长阶段排名策略
 */

import { HumanAnalysis, HumanPlayer, PlayerPerformanceProfile, PlayerRankingResult } from '../types/CommonTypes';
import { ReasoningGenerator } from '../utils/ReasoningGenerator';
import { BaseRankingStrategy } from './BaseRankingStrategy';

export class GrowingRankingStrategy extends BaseRankingStrategy {
    async calculateRanking(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult> {
        // 平衡历史与当前表现
        const scoreFactor = this.calculateScoreFactor(player.score, humanAnalysis);
        const skillFactor = this.calculateSkillFactor(profile);
        const combinedFactor = (skillFactor * this.config.growingSkillWeight) + (scoreFactor * this.config.growingScoreWeight);

        const baseRank = this.calculateHumanRank(player, humanPlayers);
        const adjustment = (combinedFactor - 0.5) * this.config.growingAdjustmentMultiplier;
        const adjustedRank = Math.max(1, Math.min(totalParticipants, baseRank + adjustment));

        // 计算AI数量
        const aiCount = totalParticipants - humanPlayers.length;

        // 生成推理说明
        const reasoning = ReasoningGenerator.generateGrowingReasoning(
            player,
            profile,
            Math.round(adjustedRank),
            totalParticipants,
            aiCount
        );

        return this.buildRankingResult(
            player,
            profile,
            Math.round(adjustedRank),
            humanAnalysis,
            totalParticipants,
            aiCount,
            humanPlayers,
            reasoning
        );
    }
}
