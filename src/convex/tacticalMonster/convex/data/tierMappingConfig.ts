/**
 * TournamentType → Tier 映射配置
 * 
 * 规则：
 * 1. 通过命名约定推导（如 "monster_rumble_bronze" → "bronze"）
 * 2. 通过映射表覆盖（特殊情况）
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
    const match = tournamentType.match(/monster_rumble_(bronze|silver|gold|platinum)/);
    if (match) {
        return match[1];
    }
    
    // 3. 未知类型
    return null;
}

