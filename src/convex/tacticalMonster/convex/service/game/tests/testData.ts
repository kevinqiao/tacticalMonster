/**
 * 游戏集成测试数据
 * 定义测试用的玩家、怪物、游戏场景等数据
 */

export interface TestPlayer {
    uid: string;
    name: string;
    initialCoins: number;
    token?: string;
}

export interface TestMonster {
    monsterId: string;
    level: number;
    stars: number;
    power: number;
    rarity?: string;
}

export interface TestGameScenario {
    tier: "bronze" | "silver" | "gold" | "platinum";
    playerCount: number;
    scores: number[];
    bossId?: string;
}

/**
 * 测试玩家数据
 */
export const TEST_PLAYERS: TestPlayer[] = [
    { uid: "test_player_1", name: "测试玩家1", initialCoins: 1000 },
    { uid: "test_player_2", name: "测试玩家2", initialCoins: 1000 },
    { uid: "test_player_3", name: "测试玩家3", initialCoins: 1000 },
    { uid: "test_player_4", name: "测试玩家4", initialCoins: 1000 },
    { uid: "test_player_5", name: "测试玩家5", initialCoins: 1000 },
    { uid: "test_player_6", name: "测试玩家6", initialCoins: 1000 },
    { uid: "test_player_7", name: "测试玩家7", initialCoins: 1000 },
    { uid: "test_player_8", name: "测试玩家8", initialCoins: 1000 },
    { uid: "test_player_9", name: "测试玩家9", initialCoins: 1000 },
    { uid: "test_player_10", name: "测试玩家10", initialCoins: 1000 },
];

/**
 * 测试怪物数据
 * 注意：这些是测试用的怪物配置，实际使用时需要确保怪物配置存在于数据库中
 */
export const TEST_MONSTERS: TestMonster[] = [
    { monsterId: "monster_001", level: 1, stars: 1, power: 100, rarity: "Common" },
    { monsterId: "monster_002", level: 2, stars: 1, power: 150, rarity: "Common" },
    { monsterId: "monster_003", level: 3, stars: 1, power: 200, rarity: "Rare" },
    { monsterId: "monster_004", level: 4, stars: 2, power: 250, rarity: "Rare" },
    { monsterId: "monster_005", level: 5, stars: 2, power: 300, rarity: "Epic" },
    { monsterId: "monster_006", level: 6, stars: 3, power: 350, rarity: "Epic" },
    { monsterId: "monster_007", level: 7, stars: 3, power: 400, rarity: "Legendary" },
    { monsterId: "monster_008", level: 8, stars: 4, power: 450, rarity: "Legendary" },
];

/**
 * 测试游戏场景数据
 */
export const TEST_GAME_SCENARIOS: TestGameScenario[] = [
    {
        tier: "bronze",
        playerCount: 10,
        scores: [1000, 950, 900, 850, 800, 750, 700, 650, 600, 550],
        bossId: "boss_bronze_1",
    },
    {
        tier: "silver",
        playerCount: 10,
        scores: [1200, 1150, 1100, 1050, 1000, 950, 900, 850, 800, 750],
        bossId: "boss_silver_1",
    },
    {
        tier: "gold",
        playerCount: 10,
        scores: [1500, 1450, 1400, 1350, 1300, 1250, 1200, 1150, 1100, 1050],
        bossId: "boss_gold_1",
    },
];

/**
 * 测试锦标赛类型
 */
export const TEST_TOURNAMENT_TYPES = {
    bronze: "monster_rumble_bronze_daily",
    silver: "monster_rumble_silver_daily",
    gold: "monster_rumble_gold_daily",
    platinum: "monster_rumble_platinum_daily",
};

/**
 * Tier Power 范围（用于测试）
 */
export const TIER_POWER_RANGES = {
    bronze: { min: 100, max: 500 },
    silver: { min: 500, max: 1000 },
    gold: { min: 1000, max: 2000 },
    platinum: { min: 2000, max: 5000 },
};

/**
 * 生成测试玩家的上场队伍（确保 Power 在指定 Tier 范围内）
 */
export function generateTestTeamForTier(tier: keyof typeof TIER_POWER_RANGES): string[] {
    const range = TIER_POWER_RANGES[tier];
    const team: string[] = [];
    let totalPower = 0;

    // 选择怪物，确保总 Power 在范围内
    for (const monster of TEST_MONSTERS) {
        if (totalPower + monster.power <= range.max) {
            team.push(monster.monsterId);
            totalPower += monster.power;
            if (team.length >= 4) break; // 最多4个
        }
    }

    // 如果队伍 Power 太低，添加更多怪物
    if (totalPower < range.min && team.length < 4) {
        for (const monster of TEST_MONSTERS) {
            if (!team.includes(monster.monsterId) && totalPower + monster.power <= range.max) {
                team.push(monster.monsterId);
                totalPower += monster.power;
                if (team.length >= 4) break;
            }
        }
    }

    return team;
}

