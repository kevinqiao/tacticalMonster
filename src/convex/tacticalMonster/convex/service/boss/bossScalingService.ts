/**
 * Boss缩放服务
 * 负责计算和应用Boss属性的自适应缩放
 * 
 * 支持两种缩放模式：
 * 1. 单人挑战关卡自适应缩放：基于玩家Power和difficultyMultiplier计算
 *    - difficultyMultiplier 表示 "Boss Power / Player Team Power" 的目标比率
 *    - 计算流程：目标Boss Power = 玩家Power × difficultyMultiplier
 *               缩放比例 = 目标Boss Power / 基础Boss Power
 * 2. 多人PVE锦标赛自适应缩放：基于房间平均Power和玩家Power计算
 *    - 使用公式：scale = K × (Avg_Tier_Power / Player_Power)
 */

import { MergedBossConfig } from "./bossConfigService";
import { EMAService } from "./emaService";

/**
 * Boss缩放配置
 */
export interface BossScalingConfig {
    // 单人挑战关卡自适应模式
    difficultyMultiplier?: number;  // 难度倍数（Boss Power / Player Team Power 的比率）
    playerPower?: number;           // 玩家Power（单人关卡需要）
    baseBossPower?: number;         // 基础Boss Power（用于计算缩放比例）
    
    // 多人PVE锦标赛自适应模式
    baseK?: number;            // 基础缩放系数（默认1.2）
    minScale?: number;         // 最小缩放（默认0.95）
    maxScale?: number;         // 最大缩放（默认1.05）
    avgTierPower?: number;     // 房间平均Tier Power
}

/**
 * 缩放后的Boss属性
 */
export interface ScaledBossStats {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
}

/**
 * Boss缩放服务
 */
export class BossScalingService {
    /**
     * 计算Boss基础Power（用于单人关卡的自适应缩放）
     * 使用与玩家Power相同的公式：HP + Attack * 2 + Defense * 1.5
     * 
     * @param bossConfig Boss合并后的配置
     * @returns Boss基础Power
     */
    static calculateBossPower(bossConfig: MergedBossConfig): number {
        // 使用与玩家Power计算相同的公式
        // Power = HP + Attack * 2 + Defense * 1.5
        const basePower = bossConfig.baseHp + bossConfig.baseDamage * 2 + bossConfig.baseDefense * 1.5;
        return Math.floor(basePower);
    }

    /**
     * 计算Boss缩放倍数
     * 
     * @param config 缩放配置
     * @returns 缩放倍数
     */
    static calculateBossScale(config: BossScalingConfig): number {
        // 1. 单人挑战关卡自适应模式
        // difficultyMultiplier 表示 "Boss Power / Player Team Power" 的目标比率
        if (config.difficultyMultiplier !== undefined && config.playerPower !== undefined && config.baseBossPower !== undefined) {
            // 计算目标Boss Power = 玩家Power × 难度倍数
            const targetBossPower = config.playerPower * config.difficultyMultiplier;
            
            // 计算缩放比例 = 目标Boss Power / 基础Boss Power
            const scale = targetBossPower / config.baseBossPower;
            
            // 限制在合理范围（0.1 - 10.0）
            return Math.max(0.1, Math.min(10.0, scale));
        }

        // 2. 多人PVE锦标赛自适应模式
        if (config.avgTierPower !== undefined && config.playerPower !== undefined && config.baseK !== undefined) {
            const baseK = config.baseK;
            const minScale = config.minScale ?? 0.95;
            const maxScale = config.maxScale ?? 1.05;

            // 计算目标缩放：K × (Avg / Player_Power)
            // K=1.2恒定，确保所有玩家的相对难度相同
            const targetScale = baseK * (config.avgTierPower / config.playerPower);

            // 限制在范围内（混合匹配优化）
            const clampedScale = Math.max(minScale, Math.min(maxScale, targetScale));

            return clampedScale;
        }

        // 默认不缩放
        return 1.0;
    }

    /**
     * 应用缩放到Boss属性
     * 
     * @param baseConfig Boss基础配置（合并后）
     * @param scale 缩放倍数
     * @returns 缩放后的属性
     */
    static applyBossScale(
        baseConfig: MergedBossConfig,
        scale: number
    ): ScaledBossStats {
        return {
            hp: Math.floor(baseConfig.baseHp * scale),
            attack: Math.floor(baseConfig.baseDamage * scale),
            defense: Math.floor(baseConfig.baseDefense * scale),
            speed: Math.floor(baseConfig.baseSpeed * scale),
        };
    }

    /**
     * 计算房间平均Tier Power
     * 使用加权平均：0.8×房间均值 + 0.2×EMA
     * 
     * @param ctx Convex上下文（可选，用于查询EMA）
     * @param playerPowers 所有玩家的Power列表
     * @param tier Tier名称（可选，用于查询EMA）
     * @param emaPower EMA平滑值（可选，如果没有则查询或使用房间均值）
     * @returns 平均Tier Power
     */
    static async calculateAvgTierPower(
        ctx: any,
        playerPowers: number[],
        tier?: string,
        emaPower?: number
    ): Promise<number> {
        if (playerPowers.length === 0) {
            return 0;
        }

        // 计算房间均值
        const roomMean = playerPowers.reduce((sum, p) => sum + p, 0) / playerPowers.length;

        // 如果没有提供EMA值，尝试从数据库查询
        let finalEMAPower = emaPower;
        if (finalEMAPower === undefined && tier && ctx) {
            const today = EMAService.getTodayDateString();
            finalEMAPower = await EMAService.getEMAForDate(ctx, tier, today);
        }

        // 如果没有EMA值，直接使用房间均值
        if (finalEMAPower === undefined) {
            return roomMean;
        }

        // 加权平均：0.8×房间均值 + 0.2×EMA
        const avgTierPower = 0.8 * roomMean + 0.2 * finalEMAPower;

        return avgTierPower;
    }

    /**
     * 同步版本：计算房间平均Tier Power（不使用EMA查询）
     * 用于不需要EMA的场景或测试
     */
    static calculateAvgTierPowerSync(
        playerPowers: number[],
        emaPower?: number
    ): number {
        if (playerPowers.length === 0) {
            return 0;
        }

        // 计算房间均值
        const roomMean = playerPowers.reduce((sum, p) => sum + p, 0) / playerPowers.length;

        // 如果没有EMA值，直接使用房间均值
        if (emaPower === undefined) {
            return roomMean;
        }

        // 加权平均：0.8×房间均值 + 0.2×EMA
        const avgTierPower = 0.8 * roomMean + 0.2 * emaPower;

        return avgTierPower;
    }

    /**
     * 为每个玩家计算Boss缩放倍数（PVE锦标赛模式）
     * 
     * @param playerPowers 玩家Power列表（[{uid: string, power: number}]）
     * @param avgTierPower 房间平均Tier Power
     * @param config 缩放配置
     * @returns 每个玩家的缩放倍数映射
     */
    static calculatePlayerBossScales(
        playerPowers: Array<{ uid: string; power: number }>,
        avgTierPower: number,
        config?: {
            baseK?: number;
            minScale?: number;
            maxScale?: number;
        }
    ): Record<string, number> {
        const scales: Record<string, number> = {};
        const baseK = config?.baseK ?? 1.2;
        const minScale = config?.minScale ?? 0.95;
        const maxScale = config?.maxScale ?? 1.05;

        for (const player of playerPowers) {
            const scale = this.calculateBossScale({
                avgTierPower,
                playerPower: player.power,
                baseK,
                minScale,
                maxScale,
            });
            scales[player.uid] = scale;
        }

        return scales;
    }
}

