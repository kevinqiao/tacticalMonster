/**
 * Solo `score_tiers` 直发碎片目标怪解析（与 StageRewardSettlementService 一致）。
 *
 * 优先级：
 * 1. `StageRuleConfig.soloDirectRewardMonsterId`（显式配表，推荐主线/策划表）
 * 2. `stageContent.bossConfig.bossId` → `BOSS_CONFIGS[bossId].monsterId`（与关卡 Boss 一致）
 *
 * **策划核对节奏**：以 `monster_rumble_solo_main_*`（[`stageRuleConfigsSoloMain`](./stageRuleConfigsSoloMain.ts)）为准；`monster_rumble_solo_lab_*` 为测试链，不纳入正式节奏表。
 */
import { BOSS_CONFIGS } from "./bossConfigs";
import type { StageRuleConfig } from "../types/stageRuleTypes";

export function resolveSoloDirectShardMonsterId(
    stageRule: StageRuleConfig | undefined | null
): string | null {
    if (!stageRule) return null;
    const explicit = stageRule.soloDirectRewardMonsterId;
    if (typeof explicit === "string" && explicit.trim().length > 0) {
        return explicit.trim();
    }
    const bossId = stageRule.stageContent?.bossConfig?.bossId;
    if (!bossId || typeof bossId !== "string") return null;
    return BOSS_CONFIGS[bossId]?.monsterId ?? null;
}
