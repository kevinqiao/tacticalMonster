/**
 * TournamentType → Tier 映射配置
 * 
 * 规则：
 * 1. 通过命名约定推导（如 "monster_rumble_bronze" → "bronze"）
 * 2. 支持挑战关卡格式（如 "monster_rumble_challenge_bronze_boss_1" → "bronze"）
 * 3. 通过映射表覆盖（特殊情况）
 */

export const TOURNAMENT_TYPE_TO_TIER_MAPPING: Record<string, string> = {
    "monster_rumble_bronze": "bronze",
    "monster_rumble_bronze_daily": "bronze",
    "monster_rumble_silver": "silver",
    "monster_rumble_silver_daily": "silver",
    "monster_rumble_gold": "gold",
    "monster_rumble_gold_daily": "gold",
    "monster_rumble_platinum": "platinum",
    "monster_rumble_platinum_daily": "platinum",
};

/**
 * 从 TournamentType 推导 Tier
 */
export function getTierFromTournamentType(tournamentType: string): string | null {
    // 1. 优先使用映射表
    if (TOURNAMENT_TYPE_TO_TIER_MAPPING[tournamentType]) {
        return TOURNAMENT_TYPE_TO_TIER_MAPPING[tournamentType];
    }

    // 2. 通过命名约定推导
    // 支持格式：
    // - monster_rumble_bronze
    // - monster_rumble_challenge_bronze_boss_1
    // - monster_rumble_challenge_silver_boss_2
    // - monster_rumble_bronze_daily
    // 等等
    // 直接匹配 tier 名称，允许后面有任意字符
    const match = tournamentType.match(/monster_rumble_(?:challenge_)?(bronze|silver|gold|platinum)(?:_|$)/);
    if (match) {
        return match[1];
    }

    // 更宽松的匹配：tier后面可以是任意字符（用于处理 monster_rumble_challenge_bronze_boss_1 这种情况）
    const flexibleMatch = tournamentType.match(/monster_rumble_(?:challenge_)?(bronze|silver|gold|platinum)/);
    if (flexibleMatch) {
        return flexibleMatch[1];
    }

    // 3. 未知类型
    return null;
}

