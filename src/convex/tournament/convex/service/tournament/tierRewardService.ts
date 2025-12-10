/**
 * Tier 奖励服务
 * 处理游戏奖励分配和宝箱触发判断
 */
export class TierRewardService {
    /**
     * 处理游戏奖励（只计算，不发放）
     * 奖励将在玩家主动 claim 时发放
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

        // 2. 计算 Top3 金币奖励（不发放，只返回计算结果）
        const top3Rewards = tierConfig.top3Rewards || {};
        const coinRewards: Record<string, number> = {};

        for (const player of params.rankings) {
            if (player.rank <= 3 && top3Rewards[player.rank]) {
                const coins = top3Rewards[player.rank];
                coinRewards[player.uid] = coins;
                // ❌ 移除立即发放的逻辑
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

        // 4. 返回奖励决策（只计算，不发放）
        return {
            coinRewards: coinRewards,
            chestTriggered: chestTriggered,
            rewardType: Object.values(chestTriggered).some(v => v) ? "both" : "coins",
            // ❌ 移除 grantResults
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

