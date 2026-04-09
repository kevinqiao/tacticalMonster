import type { TournamentConfig } from "./tournamentConfigTypes";

/** TacticalMonster mode: solo_challenge */
export const TOURNAMENT_CONFIGS_SOLO_CHALLENGE: TournamentConfig[] = [


    // ============================================
    // Solo Lab 1–5（可选 debugTeamProfileKey，见 stageRuleConfigsSoloChallenge + soloDebugTeamProfiles）
    // ============================================
    {
        typeId: "monster_rumble_solo_lab_1",
        name: "Solo Lab 1",
        description: "单人实验室 1：玩家编队；可配 debug 试用队",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1,
            entryFee: { coins: 0, energy: 6 },
        },
        mode: "solo_challenge",
        matchRules: { minPlayers: 1, maxPlayers: 1, ruleId: "monster_rumble_solo_lab_1" },
        rewards: {
            baseRewards: { coins: 40, energy: 5 },
            performanceRewards: { baseReward: { coins: 120 } },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 6 } },
    },
    {
        typeId: "monster_rumble_solo_lab_2",
        name: "Solo Lab 2",
        description: "单人实验室 2",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1,
            entryFee: { coins: 0, energy: 6 },
        },
        mode: "solo_challenge",
        matchRules: { minPlayers: 1, maxPlayers: 1, ruleId: "monster_rumble_solo_lab_2" },
        rewards: {
            baseRewards: { coins: 45, energy: 5 },
            performanceRewards: { baseReward: { coins: 140 } },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 6 } },
    },
    {
        typeId: "monster_rumble_solo_lab_3",
        name: "Solo Lab 3",
        description: "单人实验室 3",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1,
            entryFee: { coins: 0, energy: 8 },
        },
        mode: "solo_challenge",
        matchRules: { minPlayers: 1, maxPlayers: 1, ruleId: "monster_rumble_solo_lab_3" },
        rewards: {
            baseRewards: { coins: 50, energy: 6 },
            performanceRewards: { baseReward: { coins: 160 } },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 8 } },
    },
    {
        typeId: "monster_rumble_solo_lab_4",
        name: "Solo Lab 4",
        description: "单人实验室 4",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1,
            entryFee: { coins: 0, energy: 8 },
        },
        mode: "solo_challenge",
        matchRules: { minPlayers: 1, maxPlayers: 1, ruleId: "monster_rumble_solo_lab_4" },
        rewards: {
            baseRewards: { coins: 55, energy: 6 },
            performanceRewards: { baseReward: { coins: 180 } },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 8 } },
    },
    {
        typeId: "monster_rumble_solo_lab_5",
        name: "Solo Lab 5",
        description: "单人实验室 5",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1,
            entryFee: { coins: 0, energy: 10 },
        },
        mode: "solo_challenge",
        matchRules: { minPlayers: 1, maxPlayers: 1, ruleId: "monster_rumble_solo_lab_5" },
        rewards: {
            baseRewards: { coins: 60, energy: 8 },
            performanceRewards: { baseReward: { coins: 200 } },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 10 } },
    },
];
