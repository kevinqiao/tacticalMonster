import { CoinRewardHandler } from "./rewardHandlers/coinRewardHandler";
import { EnergyRewardHandler } from "./rewardHandlers/energyRewardHandler";
import { GameSpecificRewardHandler } from "./rewardHandlers/gameSpecificRewardHandler";
import { GemRewardHandler } from "./rewardHandlers/gemRewardHandler";
import { PlayerExpRewardHandler } from "./rewardHandlers/playerExpRewardHandler";
import { PropRewardHandler } from "./rewardHandlers/propRewardHandler";
import { SeasonPointRewardHandler } from "./rewardHandlers/seasonPointRewardHandler";
import { RewardGrantResult, RewardSource, UnifiedRewards } from "./rewardTypes";

/**
 * 统一奖励服务
 * 整合所有奖励发放逻辑，提供统一的奖励发放接口
 */
export class RewardService {
    /**
     * 发放奖励（统一接口）
     */
    static async grantRewards(
        ctx: any,
        params: {
            uid: string;
            rewards: UnifiedRewards;
            source: RewardSource;
            gameType?: string; // 用于游戏特定奖励
        }
    ): Promise<RewardGrantResult> {
        const { uid, rewards, source, gameType } = params;
        const nowISO = new Date().toISOString();
        const grantedRewards: Partial<UnifiedRewards> = {};
        const failedRewards: Array<{ type: string; reason: string }> = [];

        // 1. 发放金币
        if (rewards.coins && rewards.coins > 0) {
            const result = await CoinRewardHandler.grant(ctx, {
                uid,
                coins: rewards.coins,
                source: source.source,
                sourceId: source.sourceId,
            });

            if (result.success) {
                grantedRewards.coins = result.grantedCoins;
            } else {
                failedRewards.push({ type: "coins", reason: result.message });
            }
        }

        // 2. 发放宝石
        if (rewards.gems && rewards.gems > 0) {
            const result = await GemRewardHandler.grant(ctx, {
                uid,
                gems: rewards.gems,
                source: source.source,
                sourceId: source.sourceId,
            });

            if (result.success) {
                grantedRewards.gems = result.grantedGems;
            } else {
                failedRewards.push({ type: "gems", reason: result.message });
            }
        }

        // 3. 发放赛季点
        if (rewards.seasonPoints && rewards.seasonPoints > 0) {
            const result = await SeasonPointRewardHandler.grant(ctx, {
                uid,
                seasonPoints: rewards.seasonPoints,
                source: source.source,
                sourceId: source.sourceId,
            });

            if (result.success) {
                grantedRewards.seasonPoints = result.grantedPoints;
            } else {
                failedRewards.push({ type: "seasonPoints", reason: result.message });
            }
        }

        // 4. 发放声望
        if (rewards.prestige && rewards.prestige > 0) {
            // TODO: 实现声望奖励处理器
            failedRewards.push({ type: "prestige", reason: "声望奖励处理器尚未实现" });
        }

        // 5. 发放经验值（直接调用 Tournament 模块服务）
        if (rewards.exp && rewards.exp > 0) {
            const result = await PlayerExpRewardHandler.grant(ctx, {
                uid,
                exp: rewards.exp,
                source: source.source,
                sourceId: source.sourceId,
            });

            if (result.success) {
                grantedRewards.exp = result.grantedExp;
            } else {
                failedRewards.push({ type: "exp", reason: result.message });
            }
        }

        // 6. 发放能量（与 coins/gems 并列的通用资源）
        if (rewards.energy && rewards.energy > 0) {
            const result = await EnergyRewardHandler.grant(ctx, {
                uid,
                energy: rewards.energy,
                source: source.source,
                sourceId: source.sourceId,
            });

            if (result.success) {
                grantedRewards.energy = result.grantedEnergy;
            } else {
                failedRewards.push({ type: "energy", reason: result.message });
            }
        }

        // 7. 发放道具
        if (rewards.props && rewards.props.length > 0) {
            const result = await PropRewardHandler.grant(ctx, {
                uid,
                props: rewards.props,
                source: source.source,
                sourceId: source.sourceId,
            });

            if (result.success) {
                grantedRewards.props = result.grantedProps;
            } else {
                failedRewards.push({ type: "props", reason: result.message });
            }
        }

        // 8. 发放门票
        if (rewards.tickets && rewards.tickets.length > 0) {
            // 门票系统已移除，但保留接口以便未来扩展
            console.log("门票系统已移除，跳过发放门票");
        }

        // 9. 发放游戏特定奖励（不再包含 energy，energy 已作为通用资源处理）
        if (gameType && (rewards.monsters || rewards.monsterShards)) {
            const result = await GameSpecificRewardHandler.grant(ctx, {
                uid,
                gameType,
                rewards: {
                    monsters: rewards.monsters,
                    monsterShards: rewards.monsterShards,
                },
                source: source.source,
                sourceId: source.sourceId,
            });

            if (result.success) {
                grantedRewards.monsters = rewards.monsters;
                grantedRewards.monsterShards = rewards.monsterShards;
            } else {
                if (rewards.monsters) {
                    failedRewards.push({ type: "monsters", reason: result.message });
                }
                if (rewards.monsterShards) {
                    failedRewards.push({ type: "monsterShards", reason: result.message });
                }
            }
        }

        // 10. 发放专属物品
        if (rewards.exclusiveItems && rewards.exclusiveItems.length > 0) {
            // TODO: 实现专属物品奖励处理器
            failedRewards.push({ type: "exclusiveItems", reason: "专属物品奖励处理器尚未实现" });
        }

        // 11. 记录奖励发放
        const status = failedRewards.length === 0
            ? "granted"
            : (Object.keys(grantedRewards).length > 0 ? "partial" : "failed");

        await ctx.db.insert("reward_grants", {
            uid,
            rewards: rewards as any,
            source: source.source,
            sourceId: source.sourceId,
            metadata: source.metadata,
            status,
            grantedAt: status === "granted" || status === "partial" ? nowISO : undefined,
            errorMessage: failedRewards.length > 0
                ? failedRewards.map(f => `${f.type}: ${f.reason}`).join("; ")
                : undefined,
            createdAt: nowISO,
        });

        // 12. 返回结果
        const success = Object.keys(grantedRewards).length > 0;
        const message = failedRewards.length === 0
            ? "所有奖励发放成功"
            : `部分奖励发放成功，${failedRewards.length} 项失败`;

        return {
            success,
            message,
            grantedRewards: success ? grantedRewards : undefined,
            failedRewards: failedRewards.length > 0 ? failedRewards : undefined,
        };
    }

    /**
     * 批量发放奖励
     */
    static async grantRewardsBatch(
        ctx: any,
        params: Array<{
            uid: string;
            rewards: UnifiedRewards;
            source: RewardSource;
            gameType?: string;
        }>
    ): Promise<RewardGrantResult[]> {
        const results: RewardGrantResult[] = [];

        for (const param of params) {
            const result = await this.grantRewards(ctx, param);
            results.push(result);
        }

        return results;
    }
}

