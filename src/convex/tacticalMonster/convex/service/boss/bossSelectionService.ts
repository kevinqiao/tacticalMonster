/**
 * Boss选择服务
 * 实现从Tier的Boss列表中随机选择Boss组合
 */

import { getTierConfig } from "../../data/tierConfigs";
import { SeededRandom } from "../../utils/seededRandom";

export class BossSelectionService {
    /**
     * 根据Tier随机选择一个Boss组合
     * @param tier - Tier名称（"bronze", "silver", "gold", "platinum"）
     * @param randomSeed - 随机种子（用于确保确定性）
     * @returns Boss配置ID
     */
    static selectRandomBoss(tier: string, randomSeed?: string): string {
        const tierConfig = getTierConfig(tier);

        if (!tierConfig || !tierConfig.bossIds) {
            throw new Error(`Tier ${tier} 没有可用的Boss`);
        }

        // 使用随机种子确保所有玩家选择相同
        const seed = randomSeed || this.generateSeed();
        const random = new SeededRandom(seed);

        const index = random.randomInt(0, tierConfig.bossIds.length);
        return tierConfig.bossIds[index];
    }

    /**
     * 生成随机种子（如果没有提供）
     */
    private static generateSeed(): string {
        // 使用当前时间和随机数生成种子
        return `boss_selection_${Date.now()}_${Math.random()}`;
    }
}
