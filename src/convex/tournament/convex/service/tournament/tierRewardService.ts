/**
 * Tier 奖励服务
 * 处理游戏奖励分配和宝箱触发判断
 */
import { RewardService } from "../reward/rewardService";

export class TierRewardService {
    /**
     * 处理游戏奖励（包括金币发放和宝箱触发判断）
     */
    static async processGameRewards(ctx: any, params: {
        tier: string;
        rankings: Array<{ uid: string; rank: number; score: number }>;
        gameId: string;
    }) {
        // 1. 获取 Tier 配置
        // 注意：如果 tier_configs 表不存在，使用默认配置
        let tierConfig = await ctx.db
            .query("tier_configs")
            .withIndex("by_tier", (q: any) => q.eq("tier", params.tier))
            .first();

        // 如果没有配置，使用默认配置
        if (!tierConfig) {
            tierConfig = this.getDefaultTierConfig(params.tier);
        }

        // 2. 分配并发放 Top3 金币奖励（直接更新数据库）
        const top3Rewards = tierConfig.top3Rewards || {};
        const coinRewards: Record<string, number> = {};
        const grantResults: Array<{ uid: string; success: boolean; coins?: number }> = [];

        for (const player of params.rankings) {
            if (player.rank <= 3 && top3Rewards[player.rank]) {
                const coins = top3Rewards[player.rank];
                coinRewards[player.uid] = coins;

                // 直接发放金币奖励
                try {
                    const result = await RewardService.grantRewards(ctx, {
                        uid: player.uid,
                        rewards: {
                            coins: coins,
                        },
                        source: {
                            source: "tier_reward",
                            sourceId: params.gameId,
                        },
                    });

                    grantResults.push({
                        uid: player.uid,
                        success: result.success,
                        coins: result.grantedRewards?.coins,
                    });
                } catch (error: any) {
                    console.error(`发放金币奖励失败 [uid: ${player.uid}, coins: ${coins}]:`, error);
                    grantResults.push({
                        uid: player.uid,
                        success: false,
                    });
                }
            }
        }

        // 3. 判断宝箱触发（基于 Tier 配置的概率）
        const chestTriggered: Record<string, boolean> = {};
        const chestDropRate = tierConfig.chestDropRate || 0;  // 例如：0.30 (30%)

        params.rankings.forEach((player) => {
            // 随机判断是否触发宝箱
            const shouldTrigger = Math.random() < chestDropRate;
            chestTriggered[player.uid] = shouldTrigger;
        });

        // 4. 返回奖励决策（包含发放结果和宝箱触发决策）
        return {
            coinRewards: coinRewards,  // 保留用于日志和返回信息
            grantResults: grantResults,  // 发放结果详情
            chestTriggered: chestTriggered,  // 宝箱触发决策：只告诉"是否触发"，不告诉"触发什么"
            rewardType: Object.values(chestTriggered).some(v => v) ? "both" : "coins",
        };
    }

    /**
     * 获取默认 Tier 配置（如果数据库中没有配置）
     */
    private static getDefaultTierConfig(tier: string): any {
        const defaultConfigs: Record<string, any> = {
            bronze: {
                tier: "bronze",
                coinPool: 1000,
                top3Rewards: { 1: 300, 2: 180, 3: 120 },
                chestDropRate: 0.20,  // 20%
            },
            silver: {
                tier: "silver",
                coinPool: 5000,
                top3Rewards: { 1: 1500, 2: 900, 3: 600 },
                chestDropRate: 0.25,  // 25%
            },
            gold: {
                tier: "gold",
                coinPool: 20000,
                top3Rewards: { 1: 10000, 2: 6000, 3: 4000 },
                chestDropRate: 0.30,  // 30%
            },
            platinum: {
                tier: "platinum",
                coinPool: 50000,
                top3Rewards: { 1: 25000, 2: 15000, 3: 10000 },
                chestDropRate: 0.40,  // 40%
            },
        };

        return defaultConfigs[tier] || defaultConfigs.bronze;
    }
}

