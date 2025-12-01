import { v } from "convex/values";
import { TIER_CONFIGS } from "../../data/tierConfigs";

/**
 * Monster Rumble Tier 服务
 * 负责 Power 计算、Tier 验证等游戏特定逻辑
 */
export class MonsterRumbleTierService {
    /**
     * 计算队伍 Power
     */
    static async calculateTeamPower(ctx: any, uid: string): Promise<number> {
        // 1. 获取玩家的4个怪物（队伍中的怪物）
        const team = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid_inTeam", (q) => 
                q.eq("uid", uid).eq("inTeam", true)
            )
            .collect();
        
        // 2. 计算每个怪物的 Power
        let totalPower = 0;
        for (const monster of team) {
            const power = this.calculateMonsterPower(monster);
            totalPower += power;
        }
        
        return totalPower;
    }
    
    /**
     * 验证 Tier 访问权限
     */
    static async validateTierAccess(ctx: any, uid: string, tier: string): Promise<{
        valid: boolean;
        reason?: string;
        teamPower?: number;
    }> {
        // 1. 获取 Tier 配置
        const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
        if (!tierConfig) {
            return { valid: false, reason: `Tier 配置不存在: ${tier}` };
        }
        
        // 2. 获取玩家信息（从 tournament 模块获取，这里简化处理）
        // 注意：实际实现中需要从 tournament 模块查询玩家等级
        // 这里假设玩家等级已传入或通过其他方式获取
        // const player = await getPlayerFromTournament(uid);
        // if (!player) {
        //     return { valid: false, reason: "玩家不存在" };
        // }
        
        // 3. 验证解锁等级（简化：假设等级验证通过）
        // if (player.level < tierConfig.unlockLevel) {
        //     return {
        //         valid: false,
        //         reason: `需要玩家等级 ${tierConfig.unlockLevel}，当前 ${player.level}`,
        //     };
        // }
        
        // 4. 计算并验证 Power
        const teamPower = await this.calculateTeamPower(ctx, uid);
        
        if (teamPower < tierConfig.powerMin) {
            return {
                valid: false,
                reason: `Power 不足，需要 ${tierConfig.powerMin}，当前 ${teamPower}`,
                teamPower,
            };
        }
        
        if (teamPower > tierConfig.powerMax && tier !== "platinum") {
            // Power 超限，应自动匹配更高 Tier
            return {
                valid: false,
                reason: `Power 超出上限 ${tierConfig.powerMax}，应匹配更高 Tier`,
                teamPower,
            };
        }
        
        // 5. 验证通过
        return {
            valid: true,
            teamPower,
        };
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
        return tierConfig?.bossIds || [];
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

