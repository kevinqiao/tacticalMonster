/**
 * Battle Pass 集成测试数据
 */

export interface TestBattlePassPlayer {
    uid: string;
    initialLevel?: number;
    initialSeasonPoints?: number;
    isPremium?: boolean;
}

/**
 * Battle Pass 测试玩家数据
 */
export const TEST_BATTLE_PASS_PLAYERS: TestBattlePassPlayer[] = [
    { uid: "test_bp_player_1", initialLevel: 1, initialSeasonPoints: 0, isPremium: false },
    { uid: "test_bp_player_2", initialLevel: 5, initialSeasonPoints: 400, isPremium: false },
    { uid: "test_bp_player_3", initialLevel: 10, initialSeasonPoints: 900, isPremium: true },
    { uid: "test_bp_player_4", initialLevel: 15, initialSeasonPoints: 1400, isPremium: false },
    { uid: "test_bp_player_5", initialLevel: 25, initialSeasonPoints: 2400, isPremium: true },
];

/**
 * 测试积分来源
 */
export const TEST_SEASON_POINTS_SOURCES = [
    { source: "tournament", amount: 50 },
    { source: "quick_match", amount: 10 },
    { source: "task", amount: 20 },
    { source: "social", amount: 5 },
    { source: "achievement", amount: 15 },
    { source: "tacticalMonster:monster_rumble", amount: 30 },
    { source: "tacticalMonster:monster_upgrade", amount: 10 },
];

/**
 * 测试奖励验证数据
 */
export const EXPECTED_REWARDS_BY_LEVEL = {
    free: {
        1: { coins: 100, tickets: [{ type: "bronze", quantity: 1 }] },
        2: { coins: 20 },
        3: { coins: 50 }, // 基础20 + 每3级额外30
        4: { coins: 20 },
        5: { coins: 100, tickets: [{ type: "bronze", quantity: 1 }] },
        10: { coins: 200, tickets: [{ type: "bronze", quantity: 2 }] },
        15: { coins: 300, tickets: [{ type: "silver", quantity: 1 }] },
        20: { coins: 500, tickets: [{ type: "silver", quantity: 2 }] },
        25: { coins: 1000, tickets: [{ type: "gold", quantity: 1 }] },
    },
    premium: {
        1: { coins: 100, tickets: [{ type: "bronze", quantity: 2 }] },
        2: { coins: 100, tickets: [{ type: "bronze", quantity: 1 }] }, // 基础50 + 每2级额外50+1ticket
        3: { coins: 150 }, // 基础50 + 每3级额外100
        4: { coins: 100, tickets: [{ type: "bronze", quantity: 1 }] },
        5: { coins: 200, tickets: [{ type: "bronze", quantity: 3 }, { type: "silver", quantity: 1 }] },
        10: { coins: 400, tickets: [{ type: "silver", quantity: 2 }] },
        15: { coins: 600, tickets: [{ type: "silver", quantity: 3 }, { type: "gold", quantity: 1 }] },
        20: { coins: 1000, tickets: [{ type: "gold", quantity: 2 }] },
        25: { coins: 2000, tickets: [{ type: "gold", quantity: 3 }], exclusiveItems: [{ itemId: "premium_avatar_25" }] },
    },
};

