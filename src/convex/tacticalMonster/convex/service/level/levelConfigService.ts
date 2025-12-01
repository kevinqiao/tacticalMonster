/**
 * 关卡配置服务
 * 管理关卡配置的查询和创建
 */

import { getBossConfig } from "../../data/bossConfigs";
import { generateDefaultLevelConfig, toDatabaseLevelConfig } from "../../data/levelConfigs";

export class LevelConfigService {
    /**
     * 获取或生成关卡配置
     * 如果数据库中已存在该Tier+Boss的配置，直接返回；否则基于规则生成新配置
     */
    static async getOrGenerateLevelConfig(
        ctx: any,
        tier: string,
        bossId: string,
        seed?: string
    ): Promise<any> {
        // 查询现有配置
        const existing = await ctx.db
            .query("mr_level_configs")
            .withIndex("by_tier", (q: any) => q.eq("tier", tier))
            .filter((q: any) => q.eq(q.field("bossId"), bossId))
            .first();

        if (existing) {
            return existing;
        }

        // 生成新配置（基于Tier和Boss难度）
        const bossConfig = getBossConfig(bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${bossId}`);
        }

        const defaultConfig = generateDefaultLevelConfig(tier, bossConfig.difficulty);
        const levelId = `level_${tier}_${bossId}`;
        const dbConfig = toDatabaseLevelConfig(levelId, tier, bossId, defaultConfig);

        // 保存到数据库
        await ctx.db.insert("mr_level_configs", dbConfig);

        return { ...dbConfig, _id: undefined };  // 返回配置对象
    }

    /**
     * 获取关卡配置
     */
    static async getLevelConfig(
        ctx: any,
        levelId: string
    ): Promise<any | null> {
        const config = await ctx.db
            .query("mr_level_configs")
            .withIndex("by_levelId", (q: any) => q.eq("levelId", levelId))
            .first();

        return config || null;
    }
}
