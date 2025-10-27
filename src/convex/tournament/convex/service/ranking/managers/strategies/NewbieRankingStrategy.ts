/**
 * 新手排名策略
 */

import { HumanAnalysis, HumanPlayer, PlayerPerformanceProfile, PlayerRankingResult } from '../types/CommonTypes';
import { ReasoningGenerator } from '../utils/ReasoningGenerator';
import { BaseRankingStrategy } from './BaseRankingStrategy';

export class NewbieRankingStrategy extends BaseRankingStrategy {
    async calculateRanking(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult> {
        // 新手保护逻辑
        const baseRank = this.calculateHumanRank(player, humanPlayers);
        const protectionBoost = this.calculateProtectionBoost(player, humanPlayers, totalParticipants);
        const adjustedRank = Math.max(1, baseRank - protectionBoost);

        // 计算AI数量
        const aiCount = totalParticipants - humanPlayers.length;

        // 生成推理说明
        const reasoning = ReasoningGenerator.generateNewbieReasoning(
            player,
            profile,
            adjustedRank,
            totalParticipants,
            aiCount,
            humanPlayers
        );

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
     * 计算新手保护加成
     */
    private calculateProtectionBoost(
        player: HumanPlayer,
        humanPlayers: HumanPlayer[],
        totalParticipants: number
    ): number {
        const humanRank = this.calculateHumanRank(player, humanPlayers);
        const percentile = humanRank / humanPlayers.length;

        if (percentile <= this.config.newbieProtectionThreshold) {
            return Math.floor(
                (this.config.newbieProtectionThreshold - percentile) *
                totalParticipants *
                this.config.newbieProtectionMultiplier
            );
        }

        return 0;
    }
}
