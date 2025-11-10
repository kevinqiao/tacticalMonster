/**
 * 胜率控制排名策略
 * 核心功能：根据玩家当前胜率与目标胜率的差异，动态调整排名推荐
 */

import { HumanAnalysis, HumanPlayer, PlayerPerformanceProfile, PlayerRankingResult } from '../types/CommonTypes';
import { ReasoningGenerator } from '../utils/ReasoningGenerator';
import { BaseRankingStrategy } from './BaseRankingStrategy';

export class WinRateControlledStrategy extends BaseRankingStrategy {
    /**
     * 计算排名，目标是控制玩家的实际胜率
     */
    async calculateRanking(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult> {
        // 1. 获取玩家当前胜率
        const currentWinRate = profile.winRate;

        // 2. 确定目标胜率（基于游戏设计或玩家历史）
        const targetWinRate = this.determineTargetWinRate(player, profile);

        // 3. 计算胜率差异
        const winRateDiff = currentWinRate - targetWinRate;

        // 4. 根据胜率差异调整排名推荐
        const baseRank = this.calculateHumanRank(player, humanPlayers);
        const rankAdjustment = this.calculateRankAdjustmentFromWinRate(winRateDiff, totalParticipants);
        const adjustedRank = Math.max(1, Math.min(totalParticipants, baseRank + rankAdjustment));

        // 5. 计算AI数量
        const aiCount = totalParticipants - humanPlayers.length;

        // 6. 生成推理说明
        const reasoning = ReasoningGenerator.generateWinRateControlledReasoning(
            player,
            profile,
            adjustedRank,
            totalParticipants,
            currentWinRate,
            targetWinRate,
            winRateDiff
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
     * 确定目标胜率
     * 策略：根据玩家比赛场次和经验水平调整目标胜率
     */
    private determineTargetWinRate(player: HumanPlayer, profile: PlayerPerformanceProfile): number {
        // 基础目标胜率
        let baseTargetWinRate = 0.33; // 默认33%胜率

        // 根据比赛场次调整
        if (profile.totalMatches < 10) {
            // 新手：给予更高的目标胜率，建立信心
            baseTargetWinRate = 0.4;
        } else if (profile.totalMatches < 30) {
            // 成长阶段：适中的目标胜率
            baseTargetWinRate = 0.35;
        } else {
            // 成熟玩家：更接近理论胜率
            baseTargetWinRate = 0.33;
        }

        // 根据表现一致性微调
        if (profile.recentPerformance.consistency > 0.8) {
            // 表现稳定的玩家，目标胜率可以略高
            baseTargetWinRate += 0.02;
        } else if (profile.recentPerformance.consistency < 0.5) {
            // 表现不稳定的玩家，目标胜率略低
            baseTargetWinRate -= 0.02;
        }

        // 根据当前分数与历史平均分的比较调整
        const scoreImprovement = (player.score - profile.averageScore) / profile.averageScore;
        if (scoreImprovement > 0.2) {
            // 当前表现优异，目标胜率可以略高
            baseTargetWinRate += 0.03;
        } else if (scoreImprovement < -0.2) {
            // 当前表现不佳，目标胜率略低
            baseTargetWinRate -= 0.03;
        }

        // 限制在合理范围内
        return Math.max(0.2, Math.min(0.6, baseTargetWinRate));
    }

    /**
     * 根据胜率差异计算排名调整
     * @param winRateDiff 胜率差异（当前胜率 - 目标胜率）
     * @param totalParticipants 总参与人数
     * @returns 排名调整值（正数表示排名下降，负数表示排名提升）
     */
    private calculateRankAdjustmentFromWinRate(winRateDiff: number, totalParticipants: number): number {
        // winRateDiff > 0: 胜率过高 → 排名下降（更难获胜）
        // winRateDiff < 0: 胜率过低 → 排名提升（更容易获胜）

        // 调整敏感度：每10%胜率差异 → 调整1个排名位置
        const sensitivity = 10; // 可配置参数
        const rankAdjustment = Math.round(-winRateDiff * sensitivity);

        // 限制调整范围：不超过总参与人数的20%
        const maxAdjustment = Math.floor(totalParticipants * 0.2);
        const finalAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, rankAdjustment));

        return finalAdjustment;
    }

    /**
     * 计算胜率控制策略的信心度
     * 基于胜率差异和历史表现的一致性
     */
    protected calculateConfidence(profile: PlayerPerformanceProfile, humanAnalysis: HumanAnalysis): number {
        // 基础信心度
        let confidence = 0.7;

        // 比赛场次影响
        if (profile.totalMatches >= 20) {
            confidence += 0.15;
        } else if (profile.totalMatches >= 10) {
            confidence += 0.1;
        } else if (profile.totalMatches >= 5) {
            confidence += 0.05;
        }

        // 表现一致性影响
        confidence += profile.recentPerformance.consistency * 0.1;

        // 胜率稳定性影响
        const winRateStability = this.calculateWinRateStability(profile);
        confidence += winRateStability * 0.05;

        return Math.max(0.3, Math.min(0.95, confidence));
    }

    /**
     * 计算胜率稳定性
     * 基于最近比赛的胜率变化
     */
    private calculateWinRateStability(profile: PlayerPerformanceProfile): number {
        const recentMatches = profile.recentPerformance.last10Matches;
        if (recentMatches.length < 5) return 0.5;

        // 计算最近5场和之前5场的胜率
        const recent5 = recentMatches.slice(0, 5);
        const previous5 = recentMatches.slice(5, 10);

        const recentWinRate = recent5.filter(m => m.rank === 1).length / recent5.length;
        const previousWinRate = previous5.length > 0 ?
            previous5.filter(m => m.rank === 1).length / previous5.length : recentWinRate;

        // 胜率变化越小，稳定性越高
        const winRateChange = Math.abs(recentWinRate - previousWinRate);
        return Math.max(0, 1 - winRateChange);
    }
}
