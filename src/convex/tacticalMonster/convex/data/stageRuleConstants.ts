/** 单人 score_tiers 类关卡默认档位（与 rewardPolicy.scoreTiers 共用） */
export const DEFAULT_SOLO_SCORE_TIERS = [
    {
        minScore: 4000,
        rewardKey: "solo_s",
        chestType: "purple",
        directShardQuantity: 24,
        coins: 220,
    },
    {
        minScore: 2500,
        rewardKey: "solo_a",
        chestType: "gold",
        directShardQuantity: 16,
        coins: 150,
    },
    {
        minScore: 1000,
        rewardKey: "solo_b",
        chestType: "silver",
        directShardQuantity: 10,
        coins: 90,
    },
    /** 最低档：chestType 与 ChestType 枚举一致；历史 `bronze` 在 getChestConfig 中映射为 silver */
    {
        minScore: 0,
        rewardKey: "solo_c",
        chestType: "silver",
        directShardQuantity: 5,
        coins: 40,
    },
];
