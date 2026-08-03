/**
 * 权威实现见 `src/convex/tacticalMonster/convex/data/bossConfigs.ts`。
 * 此处仅 re-export，避免与 Convex 侧手写双份漂移。
 */
export type { CalculateScaleBossParams } from "@/convex/tacticalMonster/convex/data/bossConfigs";
export type { BossScalingTuning } from "@/convex/tacticalMonster/convex/data/bossConfigs";
export {
    BOSS_CONFIGS,
    SOLO_MAIN_BOSS_ID_ROWS,
    bossScalingTuningFromDifficultyAdjustment,
    computeBossStatScale,
    DEFAULT_BOSS_SCALING_TUNING,
    mergeBossScalingTuning,
    getBossConfig,
    getBossIdsByDifficulty,
    getMergedBossConfig,
    calculateScaleBoss,
    calculateBossPower,
} from "@/convex/tacticalMonster/convex/data/bossConfigs";
