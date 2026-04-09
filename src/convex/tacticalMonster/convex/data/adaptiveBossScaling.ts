/**
 * Boss 属性缩放（与玩家战力、关卡 difficultyMultiplier 解耦的可调参数）
 * 供 gameLifecycleService、calculateScaleBoss、仿真等共用同一套公式。
 */

/** 与 stageRuleTypes.difficultyAdjustment 中缩放相关字段对齐；可单独传入或从关卡配置映射 */
export type BossScalingTuning = {
    /**
     * 次线性指数：adjustedPower = referencePower * (effectivePlayerPower / referencePower) ^ scalingExponent
     * 1 = 与旧版一致（对玩家战力线性）；小于 1 则玩家战力上涨时 Boss 增长更慢。
     */
    scalingExponent?: number;
    /** 与 scalingExponent 配套，默认 1000 */
    referencePower?: number;
    /** 对 raw 倍率的第一道夹逼（默认 0.1～10） */
    scaleFloor?: number;
    scaleCeiling?: number;
    /**
     * 第二道夹逼：通常取较窄区间（如 0.5～2），对应关卡配置里的 minMultiplier/maxMultiplier
     */
    minMultiplier?: number;
    maxMultiplier?: number;
    /** 与当前队战力取 max，用于防脱装备压战力；也可作账号保底 */
    playerPowerFloor?: number;
};

const EPS = 1e-9;

export const DEFAULT_BOSS_SCALING_TUNING: Required<
    Pick<BossScalingTuning, "scalingExponent" | "referencePower" | "scaleFloor" | "scaleCeiling">
> = {
    scalingExponent: 1,
    referencePower: 1000,
    scaleFloor: 0.1,
    scaleCeiling: 10,
};

/**
 * 由关卡 difficultyAdjustment 映射为缩放参数（仅包含已定义字段）
 */
export function bossScalingTuningFromDifficultyAdjustment(
    adj?: {
        scalingExponent?: number;
        referencePower?: number;
        scaleFloor?: number;
        scaleCeiling?: number;
        minMultiplier?: number;
        maxMultiplier?: number;
        playerPowerFloor?: number;
    } | null
): BossScalingTuning | undefined {
    if (!adj) return undefined;
    const out: BossScalingTuning = {};
    if (adj.scalingExponent !== undefined) out.scalingExponent = adj.scalingExponent;
    if (adj.referencePower !== undefined) out.referencePower = adj.referencePower;
    if (adj.scaleFloor !== undefined) out.scaleFloor = adj.scaleFloor;
    if (adj.scaleCeiling !== undefined) out.scaleCeiling = adj.scaleCeiling;
    if (adj.minMultiplier !== undefined) out.minMultiplier = adj.minMultiplier;
    if (adj.maxMultiplier !== undefined) out.maxMultiplier = adj.maxMultiplier;
    if (adj.playerPowerFloor !== undefined) out.playerPowerFloor = adj.playerPowerFloor;
    return Object.keys(out).length ? out : undefined;
}

/**
 * 合并：默认 < 关卡配置 < 单次调用覆盖（便于测试与调试）
 */
export function mergeBossScalingTuning(
    base?: BossScalingTuning,
    override?: BossScalingTuning
): BossScalingTuning | undefined {
    if (!base && !override) return undefined;
    return { ...base, ...override };
}

/**
 * 计算应用于 Boss/小怪基础属性的统一倍率（相对模板 Boss 战力 baseBossPower）
 */
export function computeBossStatScale(
    playerPower: number,
    baseBossPower: number,
    difficultyMultiplier: number,
    tuning?: BossScalingTuning
): number {
    const t = tuning ?? {};
    const exp = t.scalingExponent ?? DEFAULT_BOSS_SCALING_TUNING.scalingExponent;
    const ref = t.referencePower ?? DEFAULT_BOSS_SCALING_TUNING.referencePower;
    const sf = t.scaleFloor ?? DEFAULT_BOSS_SCALING_TUNING.scaleFloor;
    const sc = t.scaleCeiling ?? DEFAULT_BOSS_SCALING_TUNING.scaleCeiling;

    const floor = t.playerPowerFloor ?? 0;
    const p = Math.max(EPS, playerPower, floor);
    const refSafe = Math.max(EPS, ref);
    const adjustedPower = refSafe * Math.pow(p / refSafe, exp);
    const targetBossPower = adjustedPower * difficultyMultiplier;
    const denom = Math.max(EPS, baseBossPower);
    let scale = targetBossPower / denom;

    scale = Math.max(sf, Math.min(sc, scale));

    const hasMin = t.minMultiplier !== undefined && t.minMultiplier !== null;
    const hasMax = t.maxMultiplier !== undefined && t.maxMultiplier !== null;
    if (hasMin && hasMax) {
        scale = Math.max(t.minMultiplier!, Math.min(t.maxMultiplier!, scale));
    } else if (hasMin) {
        scale = Math.max(t.minMultiplier!, scale);
    } else if (hasMax) {
        scale = Math.min(t.maxMultiplier!, scale);
    }

    return scale;
}
