import type { TournamentConfig } from "./tournamentConfigTypes";

/**
 * Solo **Lab** 锦标赛（`solo_lab`）：与 `stageRuleConfigsSoloChallenge.ts` 逐条对应。
 *
 * **非正式产品进度**：仅测试管线 / 可选入口；正式 Boss 与碎片节奏以 `stageRuleConfigsSoloMain` + `bossConfigs` 为准。
 *
 * - `ruleId` === 关卡 `ruleId`，`typeId` 与之相同（锦标赛入口）
 * - `staminaCost` 与关卡 `staminaCost` 一致 → `entryFee.energy`、`limits.attemptCost.energy`
 * - 顺序 / 链：`solo_lab` chainOrder 1→5
 *
 * 修改关卡体力时，请同步更新本表 `staminaCost`。
 */
const SOLO_LAB_SPECS = [
    {
        ruleId: "monster_rumble_solo_lab_1",
        staminaCost: 6,
        name: "Solo Lab 1",
        description:
            "单人实验室 1：Boss boss_bronze_1；无 debug 预设队（可自配）；体力与 stageRuleConfigsSoloChallenge 一致",
        baseCoins: 40,
        baseEnergy: 5,
        perfCoins: 120,
    },
    {
        ruleId: "monster_rumble_solo_lab_2",
        staminaCost: 6,
        name: "Solo Lab 2",
        description: "单人实验室 2：Boss boss_bronze_1；可选 debugTeamProfileKey「default」试用队",
        baseCoins: 45,
        baseEnergy: 5,
        perfCoins: 140,
    },
    {
        ruleId: "monster_rumble_solo_lab_3",
        staminaCost: 8,
        name: "Solo Lab 3",
        description: "单人实验室 3：Boss boss_silver_1；debug 试用队",
        baseCoins: 50,
        baseEnergy: 6,
        perfCoins: 160,
    },
    {
        ruleId: "monster_rumble_solo_lab_4",
        staminaCost: 8,
        name: "Solo Lab 4",
        description: "单人实验室 4：Boss boss_silver_1；debug 试用队",
        baseCoins: 55,
        baseEnergy: 6,
        perfCoins: 180,
    },
    {
        ruleId: "monster_rumble_solo_lab_5",
        staminaCost: 10,
        name: "Solo Lab 5",
        description: "单人实验室 5：Boss boss_gold_1；链末关 autoUnlockNext=false",
        baseCoins: 60,
        baseEnergy: 8,
        perfCoins: 200,
    },
] as const;

function buildSoloLabTournaments(): TournamentConfig[] {
    return SOLO_LAB_SPECS.map((spec) => {
        const e = spec.staminaCost;
        return {
            typeId: spec.ruleId,
            name: spec.name,
            description: spec.description,
            gameType: "tacticalMonster",
            isActive: true,
            timeRange: "permanent",
            entryRequirements: {
                isSubscribedRequired: false,
                playerLevel: 1,
                entryFee: { coins: 0, energy: e },
            },
            mode: "solo_challenge",
            matchRules: { minPlayers: 1, maxPlayers: 1, ruleId: spec.ruleId },
            rewards: {
                baseRewards: { coins: spec.baseCoins, energy: spec.baseEnergy },
                performanceRewards: { baseReward: { coins: spec.perfCoins } },
            },
            limits: { maxAttempts: 999, attemptCost: { energy: e } },
        };
    });
}

/** TacticalMonster mode: solo_challenge — Solo Lab 1–5（测试）；与 stageRuleConfigsSoloChallenge 对齐 */
export const TOURNAMENT_CONFIGS_SOLO_CHALLENGE: TournamentConfig[] = buildSoloLabTournaments();
