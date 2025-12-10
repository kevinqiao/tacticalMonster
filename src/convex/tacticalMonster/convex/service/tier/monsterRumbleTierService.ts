import { TIER_CONFIGS } from "../../data/tierConfigs";

/**
 * Monster Rumble Tier 服务
 * 负责 Power 计算、Tier 验证等游戏特定逻辑
 */
export class MonsterRumbleTierService {
    /**
     * 计算队伍 Power
     * 只计算上场队伍（teamPosition 不为 null 的怪物，最多4个）
     */
    static async calculateTeamPower(ctx: any, uid: string): Promise<number> {
        // 1. 获取玩家的所有怪物
        const allMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        // 2. 获取上场队伍（teamPosition 不为 null，按位置排序，最多4个）
        const team = allMonsters
            .filter((m: any) => m.teamPosition !== null && m.teamPosition !== undefined)
            .sort((a: any, b: any) => (a.teamPosition || 0) - (b.teamPosition || 0))
            .slice(0, 4); // 最多4个

        // 3. 验证队伍有效性
        if (team.length === 0) {
            throw new Error("队伍为空，请至少添加1个怪物到队伍");
        }

        // 4. 计算每个怪物的 Power
        let totalPower = 0;
        for (const monster of team) {
            const power = this.calculateMonsterPower(monster);
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
     * 计算怪物 Power（简化示例）
     * Power = (HP + Attack * 2 + Defense * 1.5) * LevelMultiplier * StarMultiplier
     */
    private static calculateMonsterPower(monster: any): number {
        // 获取怪物基础属性（从配置中）
        // 这里简化处理，假设 monster 对象包含必要信息
        // 实际实现需要查询 mr_monster_configs 表获取基础属性

        const baseHp = 1000;  // 简化：实际应从配置获取
        const baseAttack = 100;  // 简化：实际应从配置获取
        const baseDefense = 50;  // 简化：实际应从配置获取

        const basePower = baseHp + baseAttack * 2 + baseDefense * 1.5;
        const levelMultiplier = 1 + (monster.level - 1) * 0.05;
        const starMultiplier = 1 + (monster.stars - 1) * 0.1;

        return Math.floor(basePower * levelMultiplier * starMultiplier);
    }
}

