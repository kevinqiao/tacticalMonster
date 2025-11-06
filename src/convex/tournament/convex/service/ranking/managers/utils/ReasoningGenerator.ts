/**
 * 推理说明生成器
 */

import { PersonalizedWeights, PlayerPersonalizationProfile } from '../strategies/PersonalizedRankingStrategy';
import { HumanPlayer, PlayerRankingProfile } from '../types/CommonTypes';

export class ReasoningGenerator {
    /**
     * 生成新手玩家推理说明
     */
    static generateNewbieReasoning(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        recommendedRank: number,
        totalParticipants: number,
        aiCount: number,
        humanPlayers: HumanPlayer[]
    ): string {
        const reasons = [];
        reasons.push(`🎉 新手玩家表现亮眼！得分${player.score}在${totalParticipants}人比赛中`);

        const humanRank = this.calculateHumanRank(player, humanPlayers);
        if (humanRank === 1) {
            reasons.push("在人类玩家中排名第1！");
        } else {
            reasons.push(`在人类玩家中排名第${humanRank}！`);
        }

        if (recommendedRank <= 2) {
            reasons.push("考虑到这是你的前几场比赛，表现非常出色！");
        } else if (recommendedRank <= Math.ceil(totalParticipants / 2)) {
            reasons.push("作为新手，这个排名很不错！继续加油！");
        } else {
            reasons.push("继续加油，多练习会获得更好的排名！");
        }

        if (profile.recentPerformance.trendDirection === 'improving') {
            reasons.push("表现正在上升，很有潜力！");
        }

        return `推荐第${recommendedRank}名：${reasons.join('，')}`;
    }

    /**
     * 生成成长阶段玩家推理说明
     */
    static generateGrowingReasoning(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        recommendedRank: number,
        totalParticipants: number,
        aiCount: number
    ): string {
        const reasons = [];
        const performanceDesc = this.getPerformanceDescription(player, profile);
        reasons.push(`当前${performanceDesc}（得分${player.score}）`);

        if (profile.totalMatches >= 5) {
            const improvement = ((player.score - profile.averageScore) / profile.averageScore * 100).toFixed(1);
            if (Math.abs(parseFloat(improvement)) > 5) {
                const direction = parseFloat(improvement) > 0 ? '提升' : '下降';
                reasons.push(`比历史平均${direction}${Math.abs(parseFloat(improvement))}%`);
            }
        }

        reasons.push(`作为成长中的玩家（${profile.totalMatches}场比赛），表现稳定`);
        reasons.push(`在${totalParticipants}人比赛中`);

        if (aiCount > 0) {
            reasons.push(`包含${aiCount}个AI对手`);
        }

        return `推荐第${recommendedRank}名：${reasons.join('，')}`;
    }

    /**
     * 生成成熟阶段玩家推理说明
     */
    static generateVeteranReasoning(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        recommendedRank: number,
        totalParticipants: number,
        aiCount: number,
        relativePerformance: string,
        shouldUseSegmentProbability: boolean
    ): string {
        const reasons = [];
        const performanceDesc = this.getPerformanceDescription(player, profile);
        reasons.push(`当前${performanceDesc}（得分${player.score}）`);

        if (profile.totalMatches >= 10) {
            const improvement = ((player.score - profile.averageScore) / profile.averageScore * 100).toFixed(1);
            if (Math.abs(parseFloat(improvement)) > 3) {
                const direction = parseFloat(improvement) > 0 ? '提升' : '下降';
                reasons.push(`比历史平均${direction}${Math.abs(parseFloat(improvement))}%`);
            }
        }

        reasons.push(`作为经验丰富的玩家（${profile.totalMatches}场比赛）`);

        if (shouldUseSegmentProbability) {
            reasons.push("基于段位概率分布计算");
        } else {
            reasons.push("基于历史表现和当前技能评估");
        }

        reasons.push(`在${totalParticipants}人比赛中`);

        if (aiCount > 0) {
            reasons.push(`包含${aiCount}个AI对手`);
        }

        return `推荐第${recommendedRank}名：${reasons.join('，')}`;
    }

    /**
     * 生成段位调整推理说明
     */
    static generateSegmentReasoning(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        recommendedRank: number,
        totalParticipants: number
    ): string {
        const reasons = [];
        const performanceDesc = this.getPerformanceDescription(player, profile);
        reasons.push(`当前${performanceDesc}（得分${player.score}）`);

        // reasons.push(`基于${profile.segmentName}段位概率分布`); // 暂时不考虑段位
        reasons.push(`基于历史表现和概率分布`);
        reasons.push(`在${totalParticipants}人比赛中`);

        return `推荐第${recommendedRank}名：${reasons.join('，')}`;
    }

    /**
     * 获取表现描述
     */
    private static getPerformanceDescription(player: HumanPlayer, profile: PlayerRankingProfile): string {
        const scoreImprovement = (player.score - profile.averageScore) / profile.averageScore;

        if (scoreImprovement > 0.2) return '表现优异';
        if (scoreImprovement > 0.1) return '表现良好';
        if (scoreImprovement > -0.1) return '表现一般';
        return '表现欠佳';
    }

    /**
     * 生成胜率控制策略推理
     */
    static generateWinRateControlledReasoning(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        recommendedRank: number,
        totalParticipants: number,
        currentWinRate: number,
        targetWinRate: number,
        winRateDiff: number
    ): string {
        const reasons: string[] = [];

        reasons.push(`当前胜率 ${(currentWinRate * 100).toFixed(1)}%`);
        reasons.push(`目标胜率 ${(targetWinRate * 100).toFixed(1)}%`);

        if (winRateDiff > 0.1) {
            reasons.push(`胜率偏高${(winRateDiff * 100).toFixed(1)}%，适当降低排名以获得更平衡的体验`);
        } else if (winRateDiff < -0.1) {
            reasons.push(`胜率偏低${(Math.abs(winRateDiff) * 100).toFixed(1)}%，适当提升排名以增加获胜机会`);
        } else {
            reasons.push(`胜率接近目标，保持当前排名`);
        }

        reasons.push(`推荐第${recommendedRank}名`);

        return reasons.join('，');
    }

    /**
     * 生成个性化策略推理
     */
    static generatePersonalizedReasoning(
        player: HumanPlayer,
        profile: PlayerRankingProfile,
        recommendedRank: number,
        totalParticipants: number,
        playerProfile: PlayerPersonalizationProfile,
        weights: PersonalizedWeights
    ): string {
        const reasons: string[] = [];

        // 基于玩家偏好生成推理
        const { challengeLevel, competitionStyle, focusArea } = playerProfile.preferences;

        reasons.push(`根据您的${challengeLevel}挑战偏好`);
        reasons.push(`${competitionStyle}竞争风格`);
        reasons.push(`专注${focusArea}的游戏目标`);

        // 基于行为模式生成推理
        const { goalOrientation, learningStyle } = playerProfile.behavioralPatterns;

        if (goalOrientation === 'competitive') {
            reasons.push(`考虑到您的竞争导向`);
        } else if (goalOrientation === 'casual') {
            reasons.push(`考虑到您的休闲风格`);
        }

        if (learningStyle === 'explorer') {
            reasons.push(`探索型学习风格，鼓励尝试新策略`);
        } else if (learningStyle === 'achiever') {
            reasons.push(`成就型学习风格，重视稳定进步`);
        } else if (learningStyle === 'socializer') {
            reasons.push(`社交型学习风格，注重团队合作`);
        } else if (learningStyle === 'killer') {
            reasons.push(`杀手型学习风格，追求极致表现`);
        }

        // 基于历史表现生成推理
        const { consistency, rankingTrend } = playerProfile.performanceHistory;

        if (consistency >= 0.8) {
            reasons.push(`您表现稳定，排名可信度高`);
        } else if (consistency < 0.5) {
            reasons.push(`表现波动较大，调整幅度较小`);
        }

        if (rankingTrend === 'improving') {
            reasons.push(`持续进步中，给予进步奖励`);
        } else if (rankingTrend === 'declining') {
            reasons.push(`表现下降，适度调整排名`);
        }

        // 基于心理特征生成推理
        const { motivationType, achievementOrientation } = playerProfile.psychologicalProfile;

        if (motivationType === 'intrinsic' && achievementOrientation === 'high') {
            reasons.push(`内在动机强，高成就导向，给予适度奖励`);
        } else if (motivationType === 'extrinsic') {
            reasons.push(`外在动机型，重视即时反馈`);
        }

        // 显示个性化权重
        reasons.push(`个性化权重：历史技能${(weights.skill * 100).toFixed(0)}%，当前表现${(weights.score * 100).toFixed(0)}%`);

        reasons.push(`推荐第${recommendedRank}名`);

        return reasons.join('，');
    }

    /**
     * 计算人类玩家排名
     */
    private static calculateHumanRank(player: HumanPlayer, humanPlayers: HumanPlayer[]): number {
        const sortedPlayers = [...humanPlayers].sort((a, b) => b.score - a.score);
        return sortedPlayers.findIndex(p => p.uid === player.uid) + 1;
    }
}
