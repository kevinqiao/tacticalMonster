/**
 * 怪物升级升星服务
 * 负责怪物的升级、升星操作和费用计算
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { TournamentProxyService } from "../tournament/tournamentProxyService";
import { MonsterService } from "./monsterService";
import { ShardService } from "./shardService";

/**
 * 升星碎片需求配置（根据稀有度）
 */
const STAR_UP_SHARD_REQUIREMENTS: Record<string, Record<number, number>> = {
    Common: {
        1: 10,   // 1→2
        2: 20,   // 2→3
        3: 30,   // 3→4
        4: 50,   // 4→5
        5: 80,   // 5→6
        6: 120,  // 6→7
    },
    Rare: {
        1: 10,
        2: 30,
        3: 50,
        4: 80,
        5: 120,
        6: 180,
    },
    Epic: {
        1: 15,
        2: 40,
        3: 70,
        4: 110,
        5: 160,
        6: 230,
    },
    Legendary: {
        1: 20,
        2: 50,
        3: 90,
        4: 140,
        5: 200,
        6: 300,
    },
};

/**
 * 升级费用配置（每级）
 */
const LEVEL_UP_COST_BASE = 100; // 基础费用
const LEVEL_UP_COST_MULTIPLIER = 1.15; // 每级递增倍率

/**
 * 升星费用配置（每次升星）
 */
const STAR_UP_COST_BASE = 500; // 基础费用
const STAR_UP_COST_MULTIPLIER: Record<string, number> = {
    Common: 1.0,
    Rare: 1.2,
    Epic: 1.5,
    Legendary: 2.0,
};

export class MonsterUpgradeService {
    /**
     * 计算升级费用
     */
    static calculateLevelUpCost(currentLevel: number, targetLevel: number): number {
        if (targetLevel <= currentLevel) {
            return 0;
        }

        let totalCost = 0;
        for (let level = currentLevel; level < targetLevel; level++) {
            const levelCost = Math.floor(LEVEL_UP_COST_BASE * Math.pow(LEVEL_UP_COST_MULTIPLIER, level - 1));
            totalCost += levelCost;
        }

        return totalCost;
    }

    /**
     * 计算升星费用
     */
    static calculateStarUpCost(rarity: string, currentStar: number): number {
        if (currentStar >= 7) {
            return 0; // 已满星
        }

        const multiplier = STAR_UP_COST_MULTIPLIER[rarity] || 1.0;
        const baseCost = STAR_UP_COST_BASE * multiplier;
        const starMultiplier = 1 + (currentStar - 1) * 0.2; // 星级越高费用越高

        return Math.floor(baseCost * starMultiplier);
    }

    /**
     * 获取升星所需碎片
     */
    static getStarUpShardRequirement(rarity: string, currentStar: number): number {
        if (currentStar >= 7) {
            return 0; // 已满星
        }

        const requirements = STAR_UP_SHARD_REQUIREMENTS[rarity];
        if (!requirements) {
            throw new Error(`未知的稀有度: ${rarity}`);
        }

        return requirements[currentStar] || 0;
    }

    /**
     * 升级怪物
     */
    static async levelUpMonster(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            targetLevel: number;
        }
    ) {
        const { uid, monsterId, targetLevel } = params;

        // 1. 获取玩家怪物
        const monster = await MonsterService.getPlayerMonster(ctx, uid, monsterId);
        if (!monster) {
            throw new Error(`玩家不拥有该怪物: ${monsterId}`);
        }

        // 2. 获取怪物配置
        const config = await MonsterService.getMonsterConfig(ctx, monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 3. 验证目标等级
        if (targetLevel <= monster.level) {
            throw new Error(`目标等级必须大于当前等级`);
        }

        if (targetLevel > 60) {
            throw new Error(`等级上限为60级`);
        }

        // 4. 计算升级费用
        const cost = this.calculateLevelUpCost(monster.level, targetLevel);

        // 5. 扣除金币（通过 TournamentProxyService）
        await TournamentProxyService.deductCoins(ctx, {
            uid,
            coins: cost,
            source: "monster_level_up",
            sourceId: `${monsterId}_${monster.level}_${targetLevel}`,
        });

        // 6. 更新怪物等级
        await MonsterService.updateMonster(ctx, {
            uid,
            monsterId,
            level: targetLevel,
        });

        // 7. 添加 Battle Pass 积分（通过统一奖励服务）
        const { TournamentProxyService } = await import("../tournament/tournamentProxyService");
        const { calculateUpgradePoints } = await import("../battlePass/battlePassPoints");

        const upgradePoints = calculateUpgradePoints(config.rarity, targetLevel);
        TournamentProxyService.grantRewards({
            uid,
            rewards: {
                seasonPoints: upgradePoints,
            },
            source: "tacticalMonster:monster_upgrade",
            sourceId: monsterId,
            gameType: "tacticalMonster",
            metadata: {
                oldLevel: monster.level,
                newLevel: targetLevel,
                sourceDetails: {
                    monsterId: monsterId,
                    oldLevel: monster.level,
                    newLevel: targetLevel,
                },
            },
        }).catch((error) => {
            console.error(`为玩家 ${uid} 添加升级积分失败:`, error);
        });

        return {
            ok: true,
            newLevel: targetLevel,
            cost,
        };
    }

    /**
     * 升星怪物
     */
    static async starUpMonster(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
        }
    ) {
        const { uid, monsterId } = params;

        // 1. 获取玩家怪物
        const monster = await MonsterService.getPlayerMonster(ctx, uid, monsterId);
        if (!monster) {
            throw new Error(`玩家不拥有该怪物: ${monsterId}`);
        }

        // 2. 获取怪物配置
        const config = await MonsterService.getMonsterConfig(ctx, monsterId);
        if (!config) {
            throw new Error(`怪物配置不存在: ${monsterId}`);
        }

        // 3. 验证是否可以升星
        if (monster.stars >= 7) {
            throw new Error(`怪物已达到最大星级`);
        }

        const targetStar = monster.stars + 1;

        // 4. 获取升星所需碎片和费用
        const shardRequirement = this.getStarUpShardRequirement(config.rarity, monster.stars);
        const coinCost = this.calculateStarUpCost(config.rarity, monster.stars);

        // 5. 检查碎片是否足够
        if (monster.shards < shardRequirement) {
            throw new Error(`碎片不足，需要 ${shardRequirement} 碎片，当前拥有 ${monster.shards}`);
        }

        // 6. 扣除金币
        await TournamentProxyService.deductCoins(ctx, {
            uid,
            coins: coinCost,
            source: "monster_star_up",
            sourceId: `${monsterId}_${monster.stars}_${targetStar}`,
        });

        // 7. 扣除碎片
        await ShardService.deductShards(ctx, {
            uid,
            monsterId,
            quantity: shardRequirement,
            source: "star_up",
        });

        // 8. 更新怪物星级
        await MonsterService.updateMonster(ctx, {
            uid,
            monsterId,
            stars: targetStar,
            shards: monster.shards - shardRequirement,
        });

        // 9. 添加 Battle Pass 积分（通过统一奖励服务）
        const { TournamentProxyService } = await import("../tournament/tournamentProxyService");
        const { calculateStarUpPoints } = await import("../battlePass/battlePassPoints");

        const starUpPoints = calculateStarUpPoints(config.rarity, targetStar);
        TournamentProxyService.grantRewards({
            uid,
            rewards: {
                seasonPoints: starUpPoints,
            },
            source: "tacticalMonster:monster_star_up",
            sourceId: monsterId,
            gameType: "tacticalMonster",
            metadata: {
                oldStars: monster.stars,
                newStars: targetStar,
                sourceDetails: {
                    monsterId: monsterId,
                    oldStars: monster.stars,
                    newStars: targetStar,
                },
            },
        }).catch((error) => {
            console.error(`为玩家 ${uid} 添加升星积分失败:`, error);
        });

        return {
            ok: true,
            newStar: targetStar,
            shardCost: shardRequirement,
            coinCost,
        };
    }

    /**
     * 添加经验值（战斗后使用）
     */
    static async addExperience(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            experience: number;
        }
    ) {
        const { uid, monsterId, experience } = params;

        // 1. 获取玩家怪物
        const monster = await MonsterService.getPlayerMonster(ctx, uid, monsterId);
        if (!monster) {
            throw new Error(`玩家不拥有该怪物: ${monsterId}`);
        }

        // 2. 计算新经验值
        const newExperience = monster.experience + experience;

        // 3. 计算经验值对应的等级（简化：每100经验升1级，最高60级）
        const newLevel = Math.min(Math.floor(newExperience / 100) + 1, 60);

        // 4. 更新怪物经验值和等级
        await MonsterService.updateMonster(ctx, {
            uid,
            monsterId,
            level: newLevel,
            experience: newExperience,
        });

        return {
            ok: true,
            newLevel,
            newExperience,
            levelUp: newLevel > monster.level,
        };
    }
}

// ============================================
// Convex API 接口
// ============================================

/**
 * 计算升级费用
 */
export const calculateLevelUpCost = query({
    args: {
        currentLevel: v.number(),
        targetLevel: v.number(),
    },
    handler: async (ctx, args) => {
        const cost = MonsterUpgradeService.calculateLevelUpCost(args.currentLevel, args.targetLevel);
        return { cost };
    },
});

/**
 * 计算升星费用和碎片需求
 */
export const calculateStarUpCost = query({
    args: {
        rarity: v.string(),
        currentStar: v.number(),
    },
    handler: async (ctx, args) => {
        const coinCost = MonsterUpgradeService.calculateStarUpCost(args.rarity, args.currentStar);
        const shardRequirement = MonsterUpgradeService.getStarUpShardRequirement(args.rarity, args.currentStar);
        return {
            coinCost,
            shardRequirement,
        };
    },
});

/**
 * 升级怪物
 */
export const levelUpMonster = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
        targetLevel: v.number(),
    },
    handler: async (ctx, args) => {
        const result = await MonsterUpgradeService.levelUpMonster(ctx, args);
        return result;
    },
});

/**
 * 升星怪物
 */
export const starUpMonster = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
    },
    handler: async (ctx, args) => {
        const result = await MonsterUpgradeService.starUpMonster(ctx, args);
        return result;
    },
});

/**
 * 添加经验值
 */
export const addExperience = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
        experience: v.number(),
    },
    handler: async (ctx, args) => {
        const result = await MonsterUpgradeService.addExperience(ctx, args);
        return result;
    },
});

