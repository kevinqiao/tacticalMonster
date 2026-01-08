/**
 * 宝箱服务
 * 处理宝箱生成和管理（游戏特定的逻辑）
 */

import { ChestRewardsConfig, ChestType, getChestConfig } from "../../data/chestConfigs";
import { getMonsterConfigsByRarity } from "../../data/monsterConfigs";
import { SeededRandom } from "../../utils/seededRandom";

/**
 * 宝箱类型权重配置
 */
export interface ChestTypeWeights {
    silver?: number;
    gold?: number;
    purple?: number;
    orange?: number;
}

export class ChestService {
    /**
     * 处理宝箱奖励（游戏特定的逻辑）
     * 
     * @param params.gameId - 游戏ID（用于生成确定性随机数种子）
     * @param params.players - 玩家列表（包含 uid, rank, score）
     * @param params.chestTriggered - 从 Tournament 传入的触发决策
     * @param params.chestTypeWeightsMap - 可选：玩家UID到宝箱类型权重的映射（从 TournamentConfig 获取）
     * @param params.stageRuleId - 关卡规则ID（用于查询特定关卡的宝箱配置）
     */
    static async processChestRewards(ctx: any, params: {
        gameId: string;
        players: Array<{ uid: string; rank: number; score: number }>;
        chestTriggered: Record<string, boolean>;  // 从 Tournament 传入的触发决策
        chestTypeWeightsMap?: Record<string, ChestTypeWeights>;  // 每个玩家的宝箱类型权重
        stageRuleId?: string;  // 关卡规则ID
    }) {
        const results: Record<string, any> = {};

        for (const player of params.players) {
            if (!params.chestTriggered[player.uid]) {
                continue;  // 没有触发宝箱，跳过
            }

            // 1. 获取该玩家的宝箱类型权重配置
            const chestTypeWeights = params.chestTypeWeightsMap?.[player.uid];

            // 2. 生成确定性随机数种子（基于 gameId + uid，确保可复现）
            const seed = `${params.gameId}_${player.uid}`;

            // 3. 选择宝箱类型（使用确定性随机数）
            const chestType = this.selectChestType(chestTypeWeights, seed);

            // 4. 检查玩家宝箱槽位（3槽系统）
            const availableSlot = await this.findAvailableSlot(ctx, player.uid);

            if (!availableSlot) {
                // 5. 槽位已满，处理智能覆盖（游戏特定逻辑）
                const overrideResult = await this.handleChestOverride(ctx, {
                    uid: player.uid,
                    newChestType: chestType,
                    gameId: params.gameId,
                    stageRuleId: params.stageRuleId,
                });
                results[player.uid] = overrideResult;
            } else {
                // 6. 生成宝箱实例（游戏特定逻辑）
                const chest = await this.generateChest(ctx, {
                    uid: player.uid,
                    chestType: chestType,
                    slotNumber: availableSlot,
                    gameId: params.gameId,
                    stageRuleId: params.stageRuleId,
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
     * 根据配置的权重选择宝箱类型（使用确定性随机数）
     * 
     * @param chestTypeWeights - 宝箱类型权重配置（从 TournamentConfig 获取）
     * @param seed - 确定性随机数种子（基于 gameId + uid）
     * @returns 宝箱类型
     */
    private static selectChestType(
        chestTypeWeights: ChestTypeWeights | undefined,
        seed: string
    ): ChestType {
        // 如果没有提供权重配置，使用默认权重
        const weights = chestTypeWeights || {
            silver: 0.7,
            gold: 0.25,
            purple: 0.04,
            orange: 0.01,
        };

        // 使用确定性随机数生成器
        const random = new SeededRandom(seed);
        const randomValue = random.random();

        // 计算累积权重并选择宝箱类型
        let cumulative = 0;

        // 将 weights 对象转换为数组，按权重排序
        const weightEntries = Object.entries(weights)
            .filter(([_, weight]) => weight && weight > 0)
            .sort(([_, a], [__, b]) => (b || 0) - (a || 0));

        // 计算总权重（用于归一化）
        const totalWeight = weightEntries.reduce((sum, [_, weight]) => sum + (weight || 0), 0);

        // 如果总权重为0或无效，返回默认值
        if (totalWeight <= 0) {
            return "silver";
        }

        // 使用累积权重进行选择
        for (const [chestType, weight] of weightEntries) {
            cumulative += (weight || 0) / totalWeight;  // 归一化权重

            if (randomValue < cumulative) {
                return chestType as ChestType;
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
        newChestType: ChestType;
        gameId: string;
        stageRuleId?: string;
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
                gameId: params.gameId,
                stageRuleId: params.stageRuleId,
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
        chestType: ChestType;
        slotNumber: number;
        gameId: string;
        stageRuleId?: string;
    }) {
        // 1. 从配置文件获取宝箱配置（优先特定关卡，后备通用配置）
        const chestConfig = getChestConfig(params.chestType, params.stageRuleId);

        if (!chestConfig) {
            throw new Error(`宝箱配置不存在: ${params.chestType} (stageRuleId: ${params.stageRuleId || "通用"})`);
        }

        // 2. 生成确定性随机数种子（基于 gameId + uid，确保可复现）
        const seed = `${params.gameId}_${params.uid}`;

        // 3. 预生成奖励（基于概率表和配置）
        const rewards = this.generateRewards(chestConfig.rewardsConfig, seed);

        // 4. 计算开启时间
        const startedAt = new Date().toISOString();
        const readyAt = new Date(
            Date.now() + chestConfig.unlockTimeSeconds * 1000
        ).toISOString();

        // 5. 创建宝箱实例
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
     * 生成奖励内容（基于概率表和卡牌池系统）
     * 
     * 实现逻辑：
     * 1. 根据稀有度分布选择要获得的稀有度
     * 2. 从对应稀有度的怪物池中随机选择怪物
     * 3. 生成碎片数量
     * 4. 应用保底机制
     */
    private static generateRewards(
        rewardsConfig: ChestRewardsConfig,
        seed: string
    ): {
        shards: Array<{ monsterId: string; quantity: number }>;
        coins: number;
        energy?: number;
    } {
        const random = new SeededRandom(seed);
        const result: {
            shards: Array<{ monsterId: string; quantity: number }>;
            coins: number;
            energy?: number;
        } = {
            shards: [],
            coins: 0,
        };

        // 1. 生成基础奖励（金币和能量）
        if (rewardsConfig.baseRewards.coins) {
            result.coins = random.randomInt(
                rewardsConfig.baseRewards.coins.min,
                rewardsConfig.baseRewards.coins.max + 1  // randomInt 是 [min, max)，所以 +1
            );
        }
        if (rewardsConfig.baseRewards.energy) {
            result.energy = random.randomInt(
                rewardsConfig.baseRewards.energy.min,
                rewardsConfig.baseRewards.energy.max + 1
            );
        }

        // 2. 根据稀有度分布生成怪物碎片
        const rarityEntries = Object.entries(rewardsConfig.monsterShards.rarityDistribution);
        const selectedRarities: Array<{ rarity: string; shardCount: number }> = [];

        // 2.1 应用保底机制（如果有）
        if (rewardsConfig.guarantees?.guaranteedRarity) {
            const guaranteedRarity = rewardsConfig.guarantees.guaranteedRarity;
            const rarityConfig = rewardsConfig.monsterShards.rarityDistribution[guaranteedRarity];
            if (rarityConfig) {
                const shardCount = random.randomInt(
                    rarityConfig.minShards,
                    rarityConfig.maxShards + 1
                );
                selectedRarities.push({ rarity: guaranteedRarity, shardCount });
            }
        }

        // 2.2 根据权重随机选择其他稀有度
        for (const [rarity, config] of rarityEntries) {
            // 跳过已经保底的稀有度
            if (selectedRarities.some(r => r.rarity === rarity)) {
                continue;
            }

            // 根据权重决定是否选择该稀有度
            if (random.chance(config.weight)) {
                const shardCount = random.randomInt(config.minShards, config.maxShards + 1);
                selectedRarities.push({ rarity, shardCount });
            } else if (config.guarantee) {
                // 如果配置了保底，即使权重未命中也强制选择
                const shardCount = random.randomInt(config.minShards, config.maxShards + 1);
                selectedRarities.push({ rarity, shardCount });
            }
        }

        // 3. 为每个选中的稀有度选择具体怪物并生成碎片
        for (const { rarity, shardCount } of selectedRarities) {
            // 3.1 获取该稀有度的所有怪物
            let availableMonsters = getMonsterConfigsByRarity(rarity as "Common" | "Rare" | "Epic" | "Legendary");

            // 3.2 如果配置了怪物池，则过滤出池中的怪物
            const monsterPool = rewardsConfig.monsterShards.monsterPools?.[rarity as keyof typeof rewardsConfig.monsterShards.monsterPools];
            if (monsterPool && monsterPool.length > 0) {
                availableMonsters = availableMonsters.filter(m => monsterPool.includes(m.monsterId));
            }

            if (availableMonsters.length === 0) {
                console.warn(`稀有度 ${rarity} 没有可用的怪物`);
                continue;
            }

            // 3.3 随机选择一个怪物
            const selectedMonster = random.choice(availableMonsters);

            // 3.4 添加到结果中
            result.shards.push({
                monsterId: selectedMonster.monsterId,
                quantity: shardCount,
            });
        }

        // 4. 验证总碎片数范围（可选，仅用于调试）
        const totalShards = result.shards.reduce((sum, s) => sum + s.quantity, 0);
        const { min, max } = rewardsConfig.monsterShards.totalShardsRange;
        if (totalShards < min || totalShards > max) {
            console.warn(`总碎片数 ${totalShards} 超出范围 [${min}, ${max}]`);
        }

        return result;
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
