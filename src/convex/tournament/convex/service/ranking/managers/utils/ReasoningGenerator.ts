/**
 * 推理说明生成器
 */

import { HumanPlayer, PlayerPerformanceProfile } from '../types/CommonTypes';

export class ReasoningGenerator {
    /**
     * 生成新手玩家推理说明
     */
    static generateNewbieReasoning(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
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
        profile: PlayerPerformanceProfile,
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
        profile: PlayerPerformanceProfile,
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
        profile: PlayerPerformanceProfile,
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
    private static getPerformanceDescription(player: HumanPlayer, profile: PlayerPerformanceProfile): string {
        const scoreImprovement = (player.score - profile.averageScore) / profile.averageScore;

        if (scoreImprovement > 0.2) return '表现优异';
        if (scoreImprovement > 0.1) return '表现良好';
        if (scoreImprovement > -0.1) return '表现一般';
        return '表现欠佳';
    }

    /**
     * 计算人类玩家排名
     */
    private static calculateHumanRank(player: HumanPlayer, humanPlayers: HumanPlayer[]): number {
        const sortedPlayers = [...humanPlayers].sort((a, b) => b.score - a.score);
        return sortedPlayers.findIndex(p => p.uid === player.uid) + 1;
    }
}
