import type { ChestType } from "../types/chestTypes";

/**
 * 章节通关：**通章宝箱**（开箱随机，池内为「二选一」两只怪，与 [`chestConfigs.ts`](./chestConfigs.ts) 中 `chapter_clear_*` 行一致）
 *
 * **与整卡直发区别**：不再直接 `addMonsterToPlayer`；改为 `ChestService.grantChestToPlayer`，奖励为**预生成碎片**（开箱时领取）。
 *
 * **稀有度与章节顺序**：第 1 章箱以 **Rare** 池为主；第 2～4 章为 **Epic** 池。池内 `monsterId` 须 **∉** 该章 `SOLO_MAIN_BOSS_GRID` 五关 Boss。
 *
 * **触发条件**（见 `StageRewardSettlementService.grantChapterClearRewardIfEligible`）：
 * 胜利、Solo 线、**`chapter`: 1～4** 且 **`stageNumber`: 5**、且本表对该章有配置。
 */

/** 每章通章发放的宝箱：`stageRuleId` 对应 `CHEST_CONFIGS` 中带 `chapter_clear_N` 的行 */
export const CHAPTER_CLEAR_CHEST_BY_CHAPTER: Partial<Record<number, { chestType: ChestType; stageRuleId: string }>> = {
    1: { chestType: "gold", stageRuleId: "chapter_clear_1" },
    2: { chestType: "purple", stageRuleId: "chapter_clear_2" },
    3: { chestType: "purple", stageRuleId: "chapter_clear_3" },
    4: { chestType: "purple", stageRuleId: "chapter_clear_4" },
};

/**
 * @deprecated 通章已改为宝箱；保留导出避免外部引用报错，勿用于新逻辑
 */
export const CHAPTER_CLEAR_MONSTER_IDS: Partial<Record<number, string>> = {};
