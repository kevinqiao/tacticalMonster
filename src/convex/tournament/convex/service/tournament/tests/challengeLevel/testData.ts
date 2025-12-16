/**
 * 挑战关卡测试数据生成函数（Tournament模块）
 * 负责创建玩家、资源、挑战关卡配置
 */

import { getTournamentConfig } from "../../../../data/tournamentConfigs";

/**
 * 创建测试玩家数据
 * @returns 创建的玩家UID列表
 */
export async function createTestPlayers(ctx: any): Promise<string[]> {
    const nowISO = new Date().toISOString();
    const playerIds: string[] = [];

    // 测试玩家配置
    const testPlayers = [
        {
            uid: "test_player_bronze",
            level: 5,
            exp: 1000,
            displayName: "测试玩家（青铜）",
        },
        {
            uid: "test_player_silver",
            level: 15,
            exp: 5000,
            displayName: "测试玩家（白银）",
        },
        {
            uid: "test_player_gold",
            level: 35,
            exp: 15000,
            displayName: "测试玩家（黄金）",
        },
    ];

    for (const player of testPlayers) {
        // 检查玩家是否已存在
        const existing = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", player.uid))
            .first();

        if (!existing) {
            await ctx.db.insert("players", {
                uid: player.uid,
                level: player.level,
                exp: player.exp,
                displayName: player.displayName,
                isActive: true,
                createdAt: nowISO,
                updatedAt: nowISO,
            });
        } else {
            // 更新现有玩家数据
            await ctx.db.patch(existing._id, {
                level: player.level,
                exp: player.exp,
                displayName: player.displayName,
                isActive: true,
                updatedAt: nowISO,
            });
        }

        playerIds.push(player.uid);
    }

    return playerIds;
}

/**
 * 创建测试玩家资源数据
 * @param playerIds 玩家UID列表
 */
export async function createTestResources(ctx: any, playerIds: string[]): Promise<void> {
    const nowISO = new Date().toISOString();

    for (const uid of playerIds) {
        // 创建/更新 player_inventory
        const existingInventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!existingInventory) {
            await ctx.db.insert("player_inventory", {
                uid,
                coins: 10000,
                createdAt: nowISO,
                updatedAt: nowISO,
            });
        } else {
            await ctx.db.patch(existingInventory._id, {
                coins: 10000,
                updatedAt: nowISO,
            });
        }

        // 创建/更新 player_energy
        const existingEnergy = await ctx.db
            .query("player_energy")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!existingEnergy) {
            await ctx.db.insert("player_energy", {
                uid,
                current: 130,
                max: 130,
                lastRegenAt: nowISO,
                updatedAt: nowISO,
            });
        } else {
            await ctx.db.patch(existingEnergy._id, {
                current: 130,
                max: 130,
                lastRegenAt: nowISO,
                updatedAt: nowISO,
            });
        }
    }
}

/**
 * 创建测试挑战关卡配置
 * 从 tournamentConfigs.ts 读取配置并插入到 tournament_types 表
 * @param typeId 关卡typeId，默认为第一个Bronze关卡
 * @returns 创建的tournament_type的typeId
 */
export async function createTestChallengeLevel(
    ctx: any,
    typeId: string = "monster_rumble_challenge_bronze_boss_1"
): Promise<string> {
    // 使用静态导入的 getTournamentConfig
    const config = getTournamentConfig(typeId);

    if (!config) {
        throw new Error(`未找到关卡配置: ${typeId}`);
    }

    // 检查是否已存在
    const existing = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q: any) => q.eq("typeId", typeId))
        .first();

    // 转换为数据库格式
    const tournamentTypeData: any = {
        typeId: config.typeId,
        name: config.name,
        description: config.description,
        gameType: config.gameType,
        isActive: config.isActive,
        priority: 1,
        timeRange: config.timeRange || undefined,
        entryRequirements: config.entryRequirements
            ? {
                isSubscribedRequired: config.entryRequirements.isSubscribedRequired,
                // tier 字段已移除，不再使用
                entryFee: {
                    coins: config.entryRequirements.entryFee.coins,
                    gems: config.entryRequirements.entryFee.gems,
                    energy: config.entryRequirements.entryFee.energy,
                },
            }
            : undefined,
        matchRules: {
            matchType: config.matchRules.matchType,
            minPlayers: config.matchRules.minPlayers,
            maxPlayers: config.matchRules.maxPlayers,
            rankingMethod: config.matchRules.rankingMethod,
            timeLimit: config.matchRules.timeLimit,
        },
        rewards: {
            baseRewards: {
                coins: config.rewards.baseRewards.coins,
                energy: config.rewards.baseRewards.energy,
            },
            rankRewards: config.rewards.rankRewards || [],
            tierBonus: config.rewards.tierBonus,
            subscriptionBonus: config.rewards.subscriptionBonus,
            participationReward: config.rewards.participationReward,
            performanceRewards: config.rewards.performanceRewards,
        },
        schedule: config.schedule,
        limits: config.limits,
        soloChallenge: config.soloChallenge,
    };

    if (existing) {
        // 更新现有配置
        await ctx.db.patch(existing._id, tournamentTypeData);
    } else {
        // 创建新配置
        await ctx.db.insert("tournament_types", tournamentTypeData);
    }

    return typeId;
}

