/**
 * Solo **主线**（正式进度与怪物掉落 / Boss 节奏）：4 章 × 5 关 = 20 关
 *
 * - `ruleId`: `monster_rumble_solo_main_ch{1-4}_s{1-5}`
 * - `chapter` / `stageNumber`：用于章节叙事与 **通章整卡**（`stageNumber === 5` + `chapterRewards.ts`）
 * - `stageChain`：单线顺序解锁，上一章 5 关通关后解锁下一章第 1 关
 * - Boss：`bossConfigs` 中已有 id；难度用 `difficultyMultiplier` 递增
 * - 碎片目标怪：默认 `bossId → monsterId`（见 `soloRewardResolve.ts`），勿与通章宝箱池（`chapterRewards` / `chestConfigs` 的 `chapter_clear_*`）混为同一条叙事时可设 `soloDirectRewardMonsterId`
 *
 * 与 `stageRuleConfigsSoloChallenge`（`solo_lab`，仅测试）无关；策划核对经济以本文件 + `bossConfigs` 为准。
 */

import { StageRuleConfig } from "../types/stageRuleTypes";
import { SOLO_MAIN_BOSS_ID_ROWS } from "./bossConfigs";
import { DEFAULT_SOLO_SCORE_TIERS } from "./stageRuleConstants";

/** 与 [`bossConfigs.ts`](./bossConfigs.ts) `SOLO_MAIN_BOSS_ID_ROWS` 一致：20 个互不重复 `bossId`（`boss_main_ch{1-4}_s{1-5}`） */
const BOSS_ROWS = SOLO_MAIN_BOSS_ID_ROWS;

function ruleIdFor(chapter: number, stage: number): string {
    return `monster_rumble_solo_main_ch${chapter}_s${stage}`;
}

function staminaFor(chapter: number, stage: number): number {
    const base = 6 + (chapter - 1) * 2;
    const stageBump = stage >= 3 ? 2 : 0;
    const stageBump2 = stage >= 5 ? 2 : 0;
    return base + stageBump + stageBump2;
}

function difficultyMultiplierFor(chapter: number, stage: number): number {
    return 1.0 + (chapter - 1) * 0.14 + (stage - 1) * 0.035;
}

function recommendedPowerFor(chapter: number, stage: number): number {
    return 320 + (chapter - 1) * 220 + (stage - 1) * 45;
}

function buildSoloMainConfigs(): Record<string, StageRuleConfig> {
    const out: Record<string, StageRuleConfig> = {};

    for (let ch = 1; ch <= 4; ch++) {
        const bosses = BOSS_ROWS[ch - 1];
        for (let st = 1; st <= 5; st++) {
            const ruleId = ruleIdFor(ch, st);
            const bossId = bosses[st - 1];
            const prev =
                st === 1
                    ? ch === 1
                        ? []
                        : [ruleIdFor(ch - 1, 5)]
                    : [ruleIdFor(ch, st - 1)];
            const next =
                st === 5 ? (ch === 4 ? [] : [ruleIdFor(ch + 1, 1)]) : [ruleIdFor(ch, st + 1)];

            const cfg: StageRuleConfig = {
                ruleId,
                gameName: "tacticalMonster",
                rewardPolicy: { type: "score_tiers", scoreTiers: [...DEFAULT_SOLO_SCORE_TIERS] },
                stageType: "challenge",
                chapter: ch,
                stageNumber: st,
                recommendedPower: recommendedPowerFor(ch, st),
                stageChain: {
                    chainId: "solo_main",
                    chainOrder: (ch - 1) * 5 + st,
                    previousLevels: prev,
                    nextLevels: next,
                    unlockMode: "sequential",
                    autoUnlockNext: !(ch === 4 && st === 5),
                },
                stageContent: {
                    bossConfig: { bossId },
                    mapConfig: { mapSize: { rows: 7, cols: 8 }, templateId: "template_bronze_basic" },
                    difficultyAdjustment: {
                        powerBasedScaling: true,
                        difficultyMultiplier: difficultyMultiplierFor(ch, st),
                        minMultiplier: 0.45,
                        maxMultiplier: 2.35,
                    },
                },
                staminaCost: staminaFor(ch, st),
                isVisible: true,
                sortOrder: 300 + (ch - 1) * 10 + st,
            };
            out[ruleId] = cfg;
        }
    }

    return out;
}

export const STAGE_RULE_CONFIGS_SOLO_MAIN: Record<string, StageRuleConfig> = buildSoloMainConfigs();
