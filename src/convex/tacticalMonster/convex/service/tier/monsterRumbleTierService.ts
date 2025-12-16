import { v } from "convex/values";
import { query } from "../../_generated/server";
import { TIER_CONFIGS } from "../../data/tierConfigs";

/**
 * Monster Rumble Tier 服务
 * 负责 Power 计算、Tier 验证等游戏特定逻辑
 */
export class MonsterRumbleTierService {
    /**
     * 计算队伍 Power
     * 只计算上场队伍（teamPosition >= 0 的怪物，最多4个）
     * 使用 by_uid_teamPosition 索引和 gte(0) 优化查询
     */
    static async calculateTeamPower(ctx: any, uid: string): Promise<number> {
        // 1. 使用索引范围查询，只查询 teamPosition >= 0 的记录（即所有在队伍中的怪物）
        const teamMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid_teamPosition", (q: any) =>
                q.eq("uid", uid)
                    .gte("teamPosition", 0)
            )
            .collect();

        // 2. 按位置排序并限制最多4个
        const team = teamMonsters
            .sort((a: any, b: any) => (a.teamPosition || 0) - (b.teamPosition || 0))
            .slice(0, 4);

        // 3. 验证队伍有效性
        if (team.length === 0) {
            throw new Error("队伍为空，请至少添加1个怪物到队伍");
        }

        // 4. 计算每个怪物的 Power
        let totalPower = 0;
        for (const monster of team) {
            const power = await this.calculateMonsterPower(ctx, monster);
            totalPower += power;
        }

        return totalPower;
    }

    /**
     * 验证 Power 范围（只验证Power，不验证等级）
     * 
     * 注意：
     * - Power 基于上场队伍（teamPosition 不为 null 的怪物，最多4个）计算
     * - 玩家可以通过选择低 Power 的队伍来加入低 Tier 锦标赛
     * - 等级验证已移至 Tournament 模块，此方法不再验证等级
     */
    static async validatePowerRange(
        ctx: any,
        uid: string,
        tier: string
    ): Promise<{
        valid: boolean;
        reason?: string;
        teamPower?: number;
    }> {
        // 1. 获取 Tier 配置
        const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
        if (!tierConfig) {
            return { valid: false, reason: `Tier 配置不存在: ${tier}` };
        }

        // 2. 计算当前队伍的 Power（基于 teamPosition 不为 null 的怪物）
        const teamPower = await this.calculateTeamPower(ctx, uid);

        // 3. 验证 Power 是否在 Tier 范围内
        if (teamPower < tierConfig.powerMin) {
            return {
                valid: false,
                reason: `Power 不足，需要至少 ${tierConfig.powerMin}，当前 ${teamPower}。请选择更强的队伍或加入更低 Tier 的锦标赛`,
                teamPower,
            };
        }

        if (teamPower > tierConfig.powerMax && tier !== "platinum") {
            return {
                valid: false,
                reason: `Power 超出上限 ${tierConfig.powerMax}，当前 ${teamPower}。请选择更弱的队伍或加入更高 Tier 的锦标赛`,
                teamPower,
            };
        }

        // 4. 验证通过
        return {
            valid: true,
            teamPower,
        };
    }

    /**
     * 验证 Tier 访问权限
     * 
     * @deprecated 使用 validatePowerRange 替代。等级验证已移至 Tournament 模块。
     * 
     * 注意：Power 基于上场队伍（teamPosition 不为 null 的怪物，最多4个）计算
     * 玩家可以通过选择低 Power 的队伍来加入低 Tier 锦标赛
     */
    static async validateTierAccess(
        ctx: any,
        uid: string,
        tier: string
    ): Promise<{
        valid: boolean;
        reason?: string;
        teamPower?: number;
    }> {
        // 向后兼容：调用新的 validatePowerRange 方法
        // 等级验证现在在 Tournament 模块进行
        return this.validatePowerRange(ctx, uid, tier);
    }

    /**
     * 获取 Boss 难度
     */
    static getBossDifficultyForTier(tier: string): string {
        const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
        return tierConfig?.bossDifficulty || "easy";
    }

    /**
     * 获取 Boss ID 列表（根据 Tier）
     */
    static getBossIdsForTier(tier: string): string[] {
        const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
        return tierConfig?.bossIds ? [...tierConfig.bossIds] : [];
    }

    /**
     * 计算怪物 Power
     * Power = (HP + Attack * 2 + Defense * 1.5) * StarMultiplier
     * HP/Attack/Defense 根据等级增长：每级增长15%基础HP，10%基础伤害，12%基础防御
     */
    private static async calculateMonsterPower(ctx: any, monster: any): Promise<number> {
        // 从数据库获取怪物配置
        const config = await ctx.db
            .query("mr_monster_configs")
            .withIndex("by_monsterId", (q: any) => q.eq("monsterId", monster.monsterId))
            .first();

        if (!config) {
            throw new Error(`怪物配置不存在: ${monster.monsterId}`);
        }

        // 计算等级加成的实际属性
        // 每级增长15%基础HP，10%基础伤害，12%基础防御
        const hpGrowthRate = 0.15;
        const damageGrowthRate = 0.10;
        const defenseGrowthRate = 0.12;

        const actualHp = config.baseHp * (1 + (monster.level - 1) * hpGrowthRate);
        const actualAttack = config.baseDamage * (1 + (monster.level - 1) * damageGrowthRate);
        const actualDefense = config.baseDefense * (1 + (monster.level - 1) * defenseGrowthRate);

        // 基础Power计算
        const basePower = actualHp + actualAttack * 2 + actualDefense * 1.5;

        // 星级倍数（每星增加10%）
        const starMultiplier = 1 + (monster.stars - 1) * 0.1;

        return Math.floor(basePower * starMultiplier);
    }
}

/**
 * 计算队伍 Power (Query)
 * 用于在 action 中通过 runQuery 调用
 */
export const calculateTeamPower = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await MonsterRumbleTierService.calculateTeamPower(ctx, args.uid);
    },
});

/**
 * 验证 Power 范围 (Query)
 * 用于在 action 中通过 runQuery 调用
 */
export const validatePowerRange = query({
    args: {
        uid: v.string(),
        tier: v.string(),
    },
    handler: async (ctx, args) => {
        return await MonsterRumbleTierService.validatePowerRange(ctx, args.uid, args.tier);
    },
});
