/**
 * 多玩家+多AI排名推荐使用示例
 * 演示如何在复杂比赛场景中使用新的排名推荐功能
 */

import {
    HumanPlayer,
    RankingRecommendationManager
} from './RankingRecommendationManager';

export class MultiPlayerRankingExample {
    private rankingManager: RankingRecommendationManager;

    constructor(ctx: any) {
        this.rankingManager = new RankingRecommendationManager(ctx);
    }

    /**
     * 新示例1: 真实业务场景 - 3玩家完成游戏，需要3个AI填充
     */
    async newExample1_RealWorldScenario() {
        // 真人玩家完成游戏后提交的分数
        const humanPlayers: HumanPlayer[] = [
            { uid: "player_001", score: 8500 },
            { uid: "player_002", score: 7200 },
            { uid: "player_003", score: 6800 }
        ];

        const aiCount = 3; // 系统决定需要3个AI对手

        console.log("=== 新示例1: 真实业务场景（3玩家 + 3AI）===");
        const result = await this.rankingManager.generateMatchRankings(humanPlayers, aiCount);

        console.log("🏆 人类玩家排名推荐:");
        result.humanPlayers.forEach(player => {
            console.log(`  ${player.uid}: 第${player.recommendedRank}名 (${(player.confidence * 100).toFixed(1)}% 信心)`);
            console.log(`    表现: ${player.relativePerformance}`);
            console.log(`    推理: ${player.reasoning}\n`);
        });

        console.log("🤖 AI对手生成结果:");
        result.aiOpponents.forEach(ai => {
            console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 推荐分数 ${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
            console.log(`    难度: ${ai.difficulty}, 行为: ${ai.behavior}\n`);
        });

        console.log("📊 比赛环境统计:");
        console.log(`  总参与者: ${result.matchContext.totalParticipants}`);
        console.log(`  人类平均分: ${result.matchContext.averageHumanScore.toFixed(0)}`);
        console.log(`  分数分布: ${result.matchContext.scoreDistribution.lowest} - ${result.matchContext.scoreDistribution.highest}\n`);
    }

    /**
     * 新示例2: 高难度挑战 - 2专家玩家 + 6AI
     */
    async newExample2_ExpertChallenge() {
        const humanPlayers: HumanPlayer[] = [
            { uid: "expert_001", score: 12000 },
            { uid: "expert_002", score: 10500 }
        ];

        const aiCount = 6;

        console.log("=== 新示例2: 高难度挑战（2专家 + 6AI）===");
        const result = await this.rankingManager.generateMatchRankings(humanPlayers, aiCount);

        console.log("🏆 专家玩家排名:");
        result.humanPlayers.forEach(player => {
            console.log(`  ${player.uid}: 第${player.recommendedRank}名 (${(player.confidence * 100).toFixed(1)}% 信心)`);
            console.log(`    表现: ${player.relativePerformance}`);
            console.log(`    推理: ${player.reasoning}\n`);
        });

        console.log("🤖 高难度AI对手:");
        result.aiOpponents.forEach(ai => {
            console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 推荐分数 ${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
            console.log(`    难度: ${ai.difficulty}, 行为: ${ai.behavior}\n`);
        });

        console.log("📊 挑战环境:");
        console.log(`  总参与者: ${result.matchContext.totalParticipants}`);
        console.log(`  专家平均分: ${result.matchContext.averageHumanScore.toFixed(0)}\n`);
    }

    /**
     * 示例2: 高难度8人比赛（2玩家 + 6AI）
     */
    async example2_HighDifficultyMatch() {
        const humanPlayers: HumanPlayer[] = [
            { uid: "expert_001", score: 12000 },
            { uid: "expert_002", score: 10500 }
        ];

        const aiCount = 6;

        console.log("=== 示例2: 高难度8人比赛 ===");
        const result = await this.rankingManager.generateMatchRankings(humanPlayers, aiCount);

        console.log("🏆 专家玩家排名:");
        result.humanPlayers.forEach(player => {
            console.log(`  ${player.uid}: 第${player.recommendedRank}名 (${(player.confidence * 100).toFixed(1)}% 信心)`);
            console.log(`    表现: ${player.relativePerformance}`);
            console.log(`    推理: ${player.reasoning}\n`);
        });

        console.log("🤖 高难度AI对手:");
        result.aiOpponents.forEach(ai => {
            console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 推荐分数 ${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
            console.log(`    难度: ${ai.difficulty}, 行为: ${ai.behavior}\n`);
        });
    }

    /**
     * 示例3: 新手友好比赛（4玩家 + 2AI）
     */
    async example3_BeginnerFriendlyMatch() {
        const humanPlayers: HumanPlayer[] = [
            { uid: "newbie_001", score: 3200 },
            { uid: "newbie_002", score: 2800 },
            { uid: "newbie_003", score: 2500 },
            { uid: "newbie_004", score: 2200 }
        ];

        const aiCount = 2;

        console.log("=== 示例3: 新手友好比赛 ===");
        const result = await this.rankingManager.generateMatchRankings(humanPlayers, aiCount);

        console.log("🏆 新手玩家排名:");
        result.humanPlayers.forEach(player => {
            console.log(`  ${player.uid}: 第${player.recommendedRank}名 (${(player.confidence * 100).toFixed(1)}% 信心)`);
            console.log(`    表现: ${player.relativePerformance}`);
            console.log(`    推理: ${player.reasoning}\n`);
        });

        console.log("🤖 辅助AI对手:");
        result.aiOpponents.forEach(ai => {
            console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 推荐分数 ${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
            console.log(`    难度: ${ai.difficulty}, 行为: ${ai.behavior}\n`);
        });
    }

    /**
     * 示例4: 混合技能比赛（不同水平玩家 + 适应性AI）
     */
    async example4_MixedSkillMatch() {
        const humanPlayers: HumanPlayer[] = [
            { uid: "pro_player", score: 15000 },      // 专业玩家
            { uid: "intermediate_001", score: 8500 }, // 中级玩家
            { uid: "intermediate_002", score: 7800 }, // 中级玩家
            { uid: "casual_player", score: 4200 }     // 休闲玩家
        ];

        const aiCount = 2;

        console.log("=== 示例4: 混合技能比赛 ===");
        const result = await this.rankingManager.generateMatchRankings(humanPlayers, aiCount);

        // 按技能水平分组显示
        const skillGroups = {
            pro: result.humanPlayers.filter(p => humanPlayers.find(h => h.uid === p.uid && h.score >= 12000)),
            intermediate: result.humanPlayers.filter(p => humanPlayers.find(h => h.uid === p.uid && h.score >= 7000 && h.score < 12000)),
            casual: result.humanPlayers.filter(p => humanPlayers.find(h => h.uid === p.uid && h.score < 7000))
        };

        Object.entries(skillGroups).forEach(([level, players]) => {
            if (players.length > 0) {
                console.log(`${level.toUpperCase()} 水平玩家:`);
                players.forEach(player => {
                    console.log(`  ${player.uid}: 第${player.recommendedRank}名 (${(player.confidence * 100).toFixed(1)}% 信心)`);
                    console.log(`    ${player.reasoning}`);
                });
                console.log();
            }
        });

        console.log("🤖 适应性AI对手:");
        result.aiOpponents.forEach(ai => {
            console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 推荐分数 ${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
            console.log(`    难度: ${ai.difficulty}, 行为: ${ai.behavior}\n`);
        });
    }

    /**
     * 运行所有示例
     */
    async runAllExamples() {
        console.log("🎯 多玩家+多AI排名推荐系统演示\n");

        await this.newExample1_RealWorldScenario();
        await this.newExample2_ExpertChallenge();
        await this.example2_HighDifficultyMatch();
        await this.example3_BeginnerFriendlyMatch();
        await this.example4_MixedSkillMatch();

        console.log("✅ 所有示例运行完成！");
    }

    /**
     * 实际使用场景：比赛结束后生成完整排名
     */
    async realWorldUsage(matchId: string, humanPlayerScores: { uid: string; score: number }[], aiCount: number) {
        console.log(`🏆 比赛 ${matchId} 结束，生成完整排名...`);

        // 生成完整比赛结果
        const result = await this.rankingManager.generateMatchRankings(humanPlayerScores, aiCount);

        // 格式化结果用于前端显示
        const formattedResult = {
            matchId,
            humanPlayers: result.humanPlayers.map(player => ({
                playerId: player.uid,
                recommendedRank: player.recommendedRank,
                confidence: Math.round(player.confidence * 100),
                performanceLevel: player.relativePerformance,
                explanation: player.reasoning
            })),
            aiOpponents: result.aiOpponents.map(ai => ({
                aiId: ai.uid,
                recommendedRank: ai.recommendedRank,
                recommendedScore: ai.recommendedScore,
                scoreRange: ai.scoreRange,
                difficulty: ai.difficulty,
                behavior: ai.behavior
            })),
            matchStats: {
                totalParticipants: result.matchContext.totalParticipants,
                humanCount: result.matchContext.humanPlayersCount,
                aiCount: result.matchContext.aiPlayersCount,
                averageHumanScore: Math.round(result.matchContext.averageHumanScore)
            }
        };

        console.log("完整排名结果:", JSON.stringify(formattedResult, null, 2));
        return formattedResult;
    }
}

// 使用示例
/*
// 在 Convex mutation 中使用
export const generateMatchRankings = mutation({
    args: {
        matchId: v.string(),
        humanPlayers: v.array(v.object({
            uid: v.string(),
            score: v.number()
        })),
        aiCount: v.number()
    },
    handler: async (ctx, { matchId, humanPlayers, aiCount }) => {
        const example = new MultiPlayerRankingExample(ctx);
        return await example.realWorldUsage(matchId, humanPlayers, aiCount);
    }
});
*/
