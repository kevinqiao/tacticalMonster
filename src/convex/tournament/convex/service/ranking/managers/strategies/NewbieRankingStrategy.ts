/**
 * 新手排名策略
 */

import { HumanAnalysis, HumanPlayer, PlayerRankingProfile, PlayerRankingResult } from '../types/CommonTypes';
import { ReasoningGenerator } from '../utils/ReasoningGenerator';
import { BaseRankingStrategy } from './BaseRankingStrategy';

export class NewbieRankingStrategy extends BaseRankingStrategy {
    async calculateRanking(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult> {
        // 新手保护逻辑
        const baseRank = this.calculateHumanRank(player, humanPlayers);
        const protectionBoost = this.calculateProtectionBoost(baseRank, humanPlayers, totalParticipants);
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
     * @param baseRank 基础排名（人类玩家中的排名）
     * @param humanPlayers 人类玩家列表
     * @param totalParticipants 总参与人数
     */
    private calculateProtectionBoost(
        baseRank: number,
        humanPlayers: HumanPlayer[],
        totalParticipants: number
    ): number {
        const percentile = baseRank / humanPlayers.length;

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
