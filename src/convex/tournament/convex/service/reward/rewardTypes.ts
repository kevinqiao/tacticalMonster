/**
 * 统一奖励类型定义
 */

export interface RewardProp {
    gameType: string;
    propType: string;
    quantity: number;
    rarity?: "common" | "rare" | "epic" | "legendary";
}

export interface RewardMonster {
    monsterId: string;
    level?: number;
    stars?: number;
}

export interface RewardMonsterShard {
    monsterId: string;
    quantity: number;
}

export interface RewardTicket {
    type: string; // "bronze", "silver", "gold"
    quantity: number;
}

export interface RewardExclusiveItem {
    itemId: string;
    itemType: string;
    quantity: number;
}

/**
 * 统一奖励接口
 */
export interface UnifiedRewards {
    // 通用资源
    coins?: number;
    gems?: number;
    seasonPoints?: number;
    prestige?: number;
    
    // 玩家成长
    exp?: number; // 玩家经验值
    
    // 道具和门票
    props?: RewardProp[];
    tickets?: RewardTicket[];
    
    // 游戏特定奖励（TacticalMonster）
    monsters?: RewardMonster[];
    monsterShards?: RewardMonsterShard[];
    energy?: number;
    
    // 其他奖励
    exclusiveItems?: RewardExclusiveItem[];
}

/**
 * 奖励发放结果
 */
export interface RewardGrantResult {
    success: boolean;
    message: string;
    grantedRewards?: Partial<UnifiedRewards>;
    failedRewards?: Array<{
        type: string;
        reason: string;
    }>;
}

/**
 * 奖励来源信息
 */
export interface RewardSource {
    source: string; // "task", "leaderboard", "battle_pass", "chest", "tournament", etc.
    sourceId?: string; // 具体的来源ID（如任务ID、排行榜ID等）
    metadata?: Record<string, any>; // 额外的元数据
}

