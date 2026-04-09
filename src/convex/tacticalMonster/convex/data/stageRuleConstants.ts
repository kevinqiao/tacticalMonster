/** 单人 score_tiers 类关卡默认档位（与 rewardPolicy.scoreTiers 共用） */
export const DEFAULT_SOLO_SCORE_TIERS = [
    { minScore: 4000, rewardKey: "solo_s", chestType: "purple" },
    { minScore: 2500, rewardKey: "solo_a", chestType: "gold" },
    { minScore: 1000, rewardKey: "solo_b", chestType: "silver" },
    { minScore: 0, rewardKey: "solo_c", chestType: "bronze" },
];
