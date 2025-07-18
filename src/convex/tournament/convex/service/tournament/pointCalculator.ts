
/**
 * 点数计算器 - 用于多人实时对战锦标赛
 */
export class PointCalculator {
    /**
     * 根据比赛排名计算基础点数
     */
    static calculateBasePoints(matchRank: number, specialRules: any[]): number {
        // 查找点数分配规则
        const pointsRule = specialRules?.find((rule: any) => rule.type === "points_per_match");
        if (!pointsRule?.value) {
            // 默认点数分配
            const defaultPoints: Record<string, number> = {
                "1st": 100,
                "2nd": 60,
                "3rd": 30,
                "4th": 10
            };
            return defaultPoints[`${matchRank}${this.getOrdinalSuffix(matchRank)}`] || 5;
        }

        const pointsMap = pointsRule.value;
        const rankKey = `${matchRank}${this.getOrdinalSuffix(matchRank)}`;
        return pointsMap[rankKey] || 5;
    }

    /**
     * 计算额外奖励点数
     */
    static calculateBonusPoints(gameData: any, specialRules: any[]): number {
        let totalBonus = 0;

        // 查找奖励规则
        const bonusRule = specialRules?.find((rule: any) => rule.type === "bonus_points");
        if (!bonusRule?.value) {
            return totalBonus;
        }

        const bonusMap = bonusRule.value;

        // 连胜奖励
        if (gameData.winningStreak && gameData.winningStreak >= 3) {
            totalBonus += bonusMap.winning_streak || 20;
        }

        // 完美分数奖励
        if (gameData.perfectScore) {
            totalBonus += bonusMap.perfect_score || 50;
        }

        // 快速获胜奖励
        if (gameData.quickWin && gameData.matchDuration < 300) { // 5分钟内获胜
            totalBonus += bonusMap.quick_win || 30;
        }

        // 高分奖励
        if (gameData.score && gameData.score > 1000) {
            totalBonus += bonusMap.high_score || 25;
        }

        return totalBonus;
    }

    /**
     * 计算总点数
     */
    static calculateTotalPoints(matchRank: number, gameData: any, specialRules: any[]): number {
        const basePoints = this.calculateBasePoints(matchRank, specialRules);
        const bonusPoints = this.calculateBonusPoints(gameData, specialRules);
        return basePoints + bonusPoints;
    }

    /**
     * 获取序数后缀
     */
    private static getOrdinalSuffix(num: number): string {
        if (num >= 11 && num <= 13) return "th";
        switch (num % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }

    /**
     * 验证点数分配规则
     */
    static validatePointsRules(specialRules: any[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        const pointsRule = specialRules?.find((rule: any) => rule.type === "points_per_match");
        if (pointsRule) {
            const pointsMap = pointsRule.value;
            if (!pointsMap || typeof pointsMap !== "object") {
                errors.push("点数分配规则格式错误");
            } else {
                // 检查必要的排名
                const requiredRanks = ["1st", "2nd", "3rd", "4th"];
                for (const rank of requiredRanks) {
                    if (typeof pointsMap[rank] !== "number" || pointsMap[rank] < 0) {
                        errors.push(`${rank} 排名点数配置错误`);
                    }
                }
            }
        }

        const bonusRule = specialRules?.find((rule: any) => rule.type === "bonus_points");
        if (bonusRule) {
            const bonusMap = bonusRule.value;
            if (!bonusMap || typeof bonusMap !== "object") {
                errors.push("奖励点数规则格式错误");
            } else {
                // 检查奖励类型
                const bonusTypes = ["winning_streak", "perfect_score", "quick_win", "high_score"];
                for (const type of bonusTypes) {
                    if (bonusMap[type] && (typeof bonusMap[type] !== "number" || bonusMap[type] < 0)) {
                        errors.push(`${type} 奖励点数配置错误`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取点数分配说明
     */
    static getPointsDescription(specialRules: any[]): string {
        const pointsRule = specialRules?.find((rule: any) => rule.type === "points_per_match");
        const bonusRule = specialRules?.find((rule: any) => rule.type === "bonus_points");

        let description = "点数分配规则：\n";

        if (pointsRule?.value) {
            description += "基础点数：\n";
            Object.entries(pointsRule.value).forEach(([rank, points]) => {
                description += `  ${rank}: ${points} 点\n`;
            });
        }

        if (bonusRule?.value) {
            description += "额外奖励：\n";
            Object.entries(bonusRule.value).forEach(([type, points]) => {
                const typeNames: Record<string, string> = {
                    winning_streak: "连胜奖励",
                    perfect_score: "完美分数",
                    quick_win: "快速获胜",
                    high_score: "高分奖励"
                };
                description += `  ${typeNames[type] || type}: ${points} 点\n`;
            });
        }

        return description;
    }
}

/**
 * 计算玩家在锦标赛中的累积点数
 */
export async function calculatePlayerTournamentPoints(ctx: any, tournamentId: string, uid: string): Promise<{
    totalPoints: number;
    matchCount: number;
    bestScore: number;
    averageScore: number;
    matchDetails: Array<{
        matchId: string;
        score: number;
        rank: number;
        pointsEarned: number;
        timestamp: string;
    }>;
}> {
    const matches = await ctx.db
        .query("player_matches")
        .withIndex("by_tournament_uid", (q: any) =>
            q.eq("tournamentId", tournamentId).eq("uid", uid)
        )
        .filter((q: any) => q.eq(q.field("completed"), true))
        .collect();

    let totalPoints = 0;
    let bestScore = 0;
    const matchDetails: any[] = [];

    for (const match of matches) {
        const matchScore = match.score || 0;
        const matchRank = match.playerGameData?.matchRank || 1;
        const pointsEarned = match.playerGameData?.pointsEarned || matchScore;

        totalPoints += pointsEarned;
        bestScore = Math.max(bestScore, matchScore);

        matchDetails.push({
            matchId: match.matchId,
            score: matchScore,
            rank: matchRank,
            pointsEarned,
            timestamp: match.createdAt
        });
    }

    return {
        totalPoints,
        matchCount: matches.length,
        bestScore,
        averageScore: matches.length > 0 ? totalPoints / matches.length : 0,
        matchDetails
    };
} 