/**
 * 宝箱服务
 * 处理宝箱生成和管理（游戏特定的逻辑）
 */
import { GameRuleConfigService } from "../game/gameRuleConfigService"; // 注意：服务类名保持不变，但实际处理的是 StageRuleConfig

export class ChestService {
    /**
     * 处理宝箱奖励（游戏特定的逻辑）
     */
    static async processChestRewards(ctx: any, params: {
        gameId: string;
        tier: string;
        players: Array<{ uid: string; rank: number; score: number }>;
        chestTriggered: Record<string, boolean>;  // 从 Tournament 传入的触发决策
        ruleId?: string;  // 可选：游戏规则ID，用于获取宝箱权重配置
    }) {
        const results: Record<string, any> = {};

        for (const player of params.players) {
            if (!params.chestTriggered[player.uid]) {
                continue;  // 没有触发宝箱，跳过
            }

            // 1. 根据 Tier 和排名选择宝箱类型（游戏特定逻辑）
            // 如果提供了 ruleId，使用配置的权重；否则使用默认权重
            const chestType = await this.selectChestType(ctx, params.tier, player.rank, params.ruleId);

            // 2. 检查玩家宝箱槽位（3槽系统）
            const availableSlot = await this.findAvailableSlot(ctx, player.uid);

            if (!availableSlot) {
                // 3. 槽位已满，处理智能覆盖（游戏特定逻辑）
                const overrideResult = await this.handleChestOverride(ctx, {
                    uid: player.uid,
                    newChestType: chestType,
                    gameId: params.gameId,
                    tier: params.tier,
                });
                results[player.uid] = overrideResult;
            } else {
                // 4. 生成宝箱实例（游戏特定逻辑）
                const chest = await this.generateChest(ctx, {
                    uid: player.uid,
                    chestType: chestType,
                    slotNumber: availableSlot,
                    tier: params.tier,
                    gameId: params.gameId,
                });
                results[player.uid] = {
                    success: true,
                    chestId: chest.chestId,
                    chestType: chestType,
                    slotNumber: availableSlot,
                };
            }
        }

        return results;
    }

    /**
     * 根据 Tier 和排名选择宝箱类型
     * @param tier Tier（用于后备默认配置）
     * @param rank 排名
     * @param ruleId 规则ID（可选，用于获取配置的权重）
     * @returns 宝箱类型
     */
    private static async selectChestType(
        ctx: any,
        tier: string,
        rank: number,
        ruleId?: string
    ): Promise<string> {
        // 1. 获取宝箱类型权重配置
        // 优先使用 ruleId 的配置，否则使用基于 tier 的默认配置
        const weights = GameRuleConfigService.getChestTypeWeights(ruleId || "", tier);

        // 2. 根据排名调整权重（逻辑保持不变）
        const rankBonus = rank === 1 ? 0.2 : rank <= 3 ? 0.1 : 0;

        // 3. 选择宝箱类型
        const random = Math.random();
        let cumulative = 0;

        // 将 weights 对象转换为数组，按权重排序（高权重优先）
        const weightEntries = Object.entries(weights)
            .filter(([_, weight]) => weight && weight > 0)
            .sort(([_, a], [__, b]) => (b || 0) - (a || 0));  // 降序排列

        for (const [chestType, weight] of weightEntries) {
            // 计算调整后的权重（排名加成）
            const adjustedWeight = (weight || 0) + (rank === 1 && chestType !== "silver" ? rankBonus : 0);
            cumulative += adjustedWeight;

            if (random < cumulative) {
                return chestType;
            }
        }

        // 如果权重配置有问题，返回默认值
        return "silver";
    }

    /**
     * 查找可用槽位（3槽系统）
     */
    private static async findAvailableSlot(ctx: any, uid: string): Promise<number | null> {
        // 查询等待中和开启中的宝箱（分别查询然后合并）
        const waitingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", uid).eq("status", "waiting"))
            .collect();

        const openingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", uid).eq("status", "opening"))
            .collect();

        const playerChests = [...waitingChests, ...openingChests];
        const usedSlots = new Set(playerChests.map(c => c.slotNumber));

        // 查找 1-3 槽中第一个可用槽位
        for (let i = 1; i <= 3; i++) {
            if (!usedSlots.has(i)) {
                return i;
            }
        }

        return null;  // 所有槽位都被占用
    }

    /**
     * 智能覆盖逻辑（槽位已满时）
     */
    private static async handleChestOverride(ctx: any, params: {
        uid: string;
        newChestType: string;
        gameId: string;
        tier: string;
    }) {
        // 1. 获取当前所有宝箱（查询等待中和开启中的宝箱）
        const waitingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", params.uid).eq("status", "waiting"))
            .collect();

        const openingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", params.uid).eq("status", "opening"))
            .collect();

        const playerChests = [...waitingChests, ...openingChests];

        // 2. 找到价值最低的宝箱（用于覆盖）
        const chestValues: Record<string, number> = { silver: 1, gold: 2, purple: 3, orange: 4 };
        const lowestChest = playerChests.reduce((min, chest) => {
            const currentValue = chestValues[chest.chestType as keyof typeof chestValues] || 0;
            const minValue = chestValues[min.chestType as keyof typeof chestValues] || 0;
            return currentValue < minValue ? chest : min;
        });

        // 3. 如果新宝箱价值更高，进行覆盖
        const newValue = chestValues[params.newChestType as keyof typeof chestValues] || 0;
        const oldValue = chestValues[lowestChest.chestType as keyof typeof chestValues] || 0;

        if (newValue > oldValue) {
            // 退还旧宝箱（TODO: 实现退款逻辑）
            // await this.refundChest(ctx, lowestChest);

            // 生成新宝箱
            const newChest = await this.generateChest(ctx, {
                uid: params.uid,
                chestType: params.newChestType,
                slotNumber: lowestChest.slotNumber,
                tier: params.tier,
                gameId: params.gameId,
            });

            return {
                success: true,
                chestId: newChest.chestId,
                chestType: params.newChestType,
                slotNumber: lowestChest.slotNumber,
                overridden: true,
            };
        }

        return {
            success: false,
            reason: "新宝箱价值不高于现有宝箱",
        };
    }

    /**
     * 生成宝箱实例
     */
    private static async generateChest(ctx: any, params: {
        uid: string;
        chestType: string;
        slotNumber: number;
        tier: string;
        gameId: string;
    }) {
        // 获取宝箱配置
        const chestConfig = await ctx.db
            .query("mr_chest_configs")
            .withIndex("by_chestType", (q: any) => q.eq("chestType", params.chestType))
            .first();

        if (!chestConfig) {
            throw new Error(`宝箱配置不存在: ${params.chestType}`);
        }

        // 预生成奖励（基于概率表）
        const rewards = this.generateRewards(chestConfig.rewardsConfig);

        // 计算开启时间
        const startedAt = new Date().toISOString();
        const readyAt = new Date(
            Date.now() + chestConfig.unlockTimeSeconds * 1000
        ).toISOString();

        // 创建宝箱实例
        const chestId = crypto.randomUUID();
        await ctx.db.insert("mr_player_chests", {
            chestId: chestId,
            uid: params.uid,
            chestType: params.chestType,
            slotNumber: params.slotNumber,
            status: "waiting",
            rewards: rewards,  // 预生成的奖励
            startedAt: startedAt,
            readyAt: readyAt,
            createdAt: startedAt,
        });

        return {
            chestId: chestId,
            chestType: params.chestType,
            slotNumber: params.slotNumber,
        };
    }

    /**
     * 生成奖励内容（基于概率表）
     */
    private static generateRewards(rewardsConfig: any): any {
        // 根据概率表生成奖励
        // 例如：{common: 0.6, rare: 0.3, epic: 0.1}
        return {
            shards: [
                { monsterId: "monster1", quantity: 5 },
                { monsterId: "monster2", quantity: 3 },
            ],
            coins: 100,
        };
    }

    /**
     * 领取宝箱奖励
     */
    static async claimChest(ctx: any, params: {
        uid: string;
        chestId: string;
    }) {
        // 1. 获取宝箱
        const chest = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", params.uid))
            .filter((q: any) => q.eq(q.field("chestId"), params.chestId))
            .first();

        if (!chest) {
            throw new Error("宝箱不存在");
        }

        // 2. 检查宝箱状态
        if (chest.status === "claimed") {
            throw new Error("宝箱已经领取过了");
        }

        const now = new Date().toISOString();
        const readyTime = new Date(chest.readyAt).getTime();
        const currentTime = Date.now();

        if (currentTime < readyTime && chest.status !== "ready") {
            throw new Error("宝箱尚未准备好");
        }

        // 3. 发放奖励
        const rewards = chest.rewards;

        // 发放碎片（如果有）
        if (rewards.shards) {
            const { MonsterService } = await import("../monster/monsterService");
            for (const shard of rewards.shards) {
                await MonsterService.addShards(ctx, {
                    uid: params.uid,
                    monsterId: shard.monsterId,
                    quantity: shard.quantity,
                    source: "chest",
                    sourceId: params.chestId,
                });
            }
        }

        // 3. 计算 Battle Pass 积分
        const { calculateChestPoints } = await import("../battlePass/battlePassPoints");
        const chestPoints = calculateChestPoints(chest.chestType);

        // 4. 统一发放奖励（金币和赛季积分）
        // 注意：source 使用 "tacticalMonster:chest_open" 格式，以便 Battle Pass 系统正确识别游戏特定积分
        const { TournamentProxyService } = await import("../tournament/tournamentProxyService");
        const grantResult = await TournamentProxyService.grantRewards({
            uid: params.uid,
            rewards: {
                coins: rewards.coins,
                seasonPoints: chestPoints,
            },
            source: "tacticalMonster:chest_open",  // 游戏特定格式，用于 Battle Pass 积分识别
            sourceId: params.chestId,
            gameType: "tacticalMonster",  // 指定游戏类型
            metadata: {
                chestType: chest.chestType,
                sourceDetails: {
                    chestId: params.chestId,
                    chestType: chest.chestType,
                },
            },
        });

        // 如果发放失败，记录错误但不阻塞流程
        if (!grantResult.success) {
            console.error(`为玩家 ${params.uid} 发放宝箱奖励失败:`, grantResult.message);
        }

        // 5. 更新宝箱状态
        await ctx.db.patch(chest._id, {
            status: "claimed",
            claimedAt: now,
        });

        return {
            ok: true,
            rewards: rewards,
        };
    }
}

