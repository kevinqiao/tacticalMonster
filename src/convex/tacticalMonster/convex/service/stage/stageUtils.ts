/**
 * Stage 工具类
 * 处理 Stage 相关的工具方法
 */

import { Stage } from "../../../../../component/battle/games/tacticalMonster/types/StageTypes";

export class StageUtils {
    /**
     * 从数据库文档构建 Stage 对象
     */
    static buildStageFromDoc(stageDoc: any): Stage {
        return {
            stageId: stageDoc.stageId,
            bossId: stageDoc.bossId,
            map: stageDoc.map,
            difficulty: stageDoc.difficulty,
            seed: stageDoc.seed,
            attempts: stageDoc.attempts,
            createdAt: stageDoc.createdAt,
        };
    }

    /**
     * 生成唯一的 stageId
     */
    static generateStageId(ruleId: string, seed: string): string {
        // 使用 seed 的哈希值生成 stageId，确保相同 seed 生成相同的 stageId
        const seedHash = StageUtils.hashSeed(seed);
        return `stage_${ruleId}_${seedHash}`;
    }

    /**
     * 简单哈希 seed 字符串
     */
    static hashSeed(seed: string): string {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }
}

