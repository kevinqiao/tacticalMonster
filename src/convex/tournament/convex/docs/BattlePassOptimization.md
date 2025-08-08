# Battle Pass系统优化设计文档

## 📋 系统概述

Battle Pass系统是基于赛季积分的进度系统，为玩家提供丰富的奖励和进度体验。经过重新整理和优化，系统更加完善、高效和用户友好。

## 🎯 核心优化

### 1. 接口设计优化

#### **新增字段**
```typescript
// BattlePassConfig
interface BattlePassConfig {
    description: string;    // 赛季描述
    theme: string;         // 赛季主题
}

// BattlePassLevel
interface BattlePassLevel {
    isClaimed: boolean;    // 是否已领取
    progress: number;      // 进度百分比 (0-100)
}

// PlayerBattlePass
interface PlayerBattlePass {
    claimedLevels: number[];     // 已领取的等级
    nextRewardLevel: number;     // 下一个可领取的等级
}

// BattlePassProgress
interface BattlePassProgress {
    segmentUpgradeSeasonPoints: number;  // 段位升级赛季积分
    monthlySeasonPoints: { [month: string]: number }; // 月度统计
}
```

#### **奖励类型扩展**
```typescript
interface BattlePassRewards {
    rankPoints?: number;           // 段位积分
    exclusiveItems?: ExclusiveItem[]; // 专属物品
}

interface ExclusiveItem {
    itemType: "avatar" | "frame" | "emote" | "title" | "background" | "effect";
    previewUrl?: string;           // 预览图片
}
```

### 2. 数据库架构优化

#### **新增表结构**
```typescript
// 赛季积分日志表
battle_pass_season_points_logs: {
    uid: string,
    seasonPointsAmount: number,
    source: string,
    currentLevel: number,
    totalSeasonPoints: number
}

// 购买日志表
battle_pass_purchase_logs: {
    uid: string,
    seasonId: string,
    price: number,
    purchasedAt: string
}

// 奖励领取日志表
battle_pass_reward_claims: {
    uid: string,
    seasonId: string,
    level: number,
    rewards: BattlePassRewards,
    claimedAt: string
}

// 统计表
battle_pass_stats: {
    seasonId: string,
    totalPlayers: number,
    averageLevel: number,
    completionRate: number,
    premiumConversionRate: number
}

// 专属物品表
battle_pass_exclusive_items: {
    itemId: string,
    itemType: string,
    name: string,
    rarity: string,
    previewUrl?: string
}

// 进度快照表
battle_pass_snapshots: {
    uid: string,
    seasonId: string,
    currentLevel: number,
    claimedLevels: number[],
    snapshotDate: string
}
```

### 3. 功能增强

#### **智能奖励系统**
```typescript
// 自动检测新解锁等级
const unlockedRewards: BattlePassRewards[] = [];
if (newLevel > oldLevel) {
    for (let level = oldLevel + 1; level <= newLevel; level++) {
        const levelConfig = track.levels.find(l => l.level === level);
        if (levelConfig && levelConfig.rewards) {
            unlockedRewards.push(levelConfig.rewards);
        }
    }
}
```

#### **批量操作支持**
```typescript
// 批量领取奖励
batchClaimBattlePassRewards(uid, [1, 2, 3, 4, 5])

// 批量添加赛季积分
batchAddBattlePassSeasonPoints([
    { uid: "player1", seasonPointsAmount: 100, source: "task" },
    { uid: "player2", seasonPointsAmount: 50, source: "quick_match" }
])
```

#### **进度跟踪优化**
```typescript
// 计算下一个可领取等级
calculateNextRewardLevel(playerBattlePass: PlayerBattlePass): number {
    for (let level = 1; level <= playerBattlePass.currentLevel; level++) {
        if (!playerBattlePass.claimedLevels.includes(level)) {
            return level;
        }
    }
    return playerBattlePass.currentLevel + 1;
}
```

### 4. 统计和分析

#### **综合统计数据**
```typescript
interface BattlePassStats {
    totalPlayers: number;
    averageLevel: number;
    averageSeasonPoints: number;
    premiumPlayers: number;
    maxLevel: number;
    totalSeasonPoints: number;
    levelDistribution: { [level: number]: number };
    sourceDistribution: {
        tournament: number;
        quickMatch: number;
        propMatch: number;
        task: number;
        social: number;
        achievement: number;
        segmentUpgrade: number;
    };
    completionRate: number;
    premiumConversionRate: number;
}
```

#### **来源分布分析**
```typescript
// 各来源赛季积分统计
sourceDistribution: {
    tournament: 15000,      // 锦标赛
    quickMatch: 8000,       // 快速对局
    propMatch: 5000,        // 道具对局
    task: 12000,           // 任务
    social: 3000,          // 社交
    achievement: 2000,     // 成就
    segmentUpgrade: 6000   // 段位升级
}
```

### 5. 性能优化

#### **索引策略**
```typescript
// 玩家Battle Pass表索引
player_battle_pass: {
    by_uid_season: ["uid", "seasonId"],
    by_season: ["seasonId"],
    by_season_totalSeasonPoints: ["seasonId", "totalSeasonPoints"],
    by_season_currentLevel: ["seasonId", "currentLevel"],
    by_is_premium: ["isPremium"]
}

// 日志表索引
battle_pass_season_points_logs: {
    by_uid: ["uid"],
    by_source: ["source"],
    by_created_at: ["createdAt"],
    by_uid_created_at: ["uid", "createdAt"]
}
```

#### **缓存策略**
```typescript
// 配置缓存
const configCache = new Map<string, BattlePassConfig>();

// 排行榜缓存
const leaderboardCache = new Map<string, any[]>();

// 统计数据缓存
const statsCache = new Map<string, BattlePassStats>();
```

### 6. 用户体验优化

#### **进度可视化**
```typescript
// 等级进度计算
const progressPercentage = (currentLevel / maxLevel) * 100;
const seasonPointsToNextLevel = seasonPointsPerLevel - currentSeasonPoints;

// 可领取奖励提示
const availableRewards = currentLevel - totalClaimedRewards;
const nextRewardLevel = calculateNextRewardLevel(playerBattlePass);
```

#### **奖励预览**
```typescript
// 专属物品预览
interface ExclusiveItem {
    itemId: string;
    itemType: "avatar" | "frame" | "emote" | "title" | "background" | "effect";
    name: string;
    description: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    previewUrl?: string;  // 预览图片URL
}
```

### 7. 管理功能

#### **快照系统**
```typescript
// 创建进度快照
createBattlePassSnapshot(uid: string)

// 获取快照历史
getBattlePassSnapshots(uid: string, seasonId?: string)
```

#### **重置功能**
```typescript
// 重置玩家Battle Pass
resetPlayerBattlePass(uid: string)
```

### 8. 集成优化

#### **段位系统集成**
```typescript
// 段位升级时自动添加赛季积分
addSegmentUpgradeSeasonPoints(uid, fromSegment, toSegment, seasonPointsAmount)
```

#### **任务系统集成**
```typescript
// 任务完成时自动添加赛季积分
addTaskSeasonPoints(uid, taskId, taskType, seasonPointsAmount)
```

#### **排行榜系统集成**
```typescript
// 排行榜奖励时自动添加赛季积分
addLeaderboardSeasonPoints(uid, leaderboardType, rank, seasonPointsAmount)
```

## 🎮 奖励配置

### 免费轨道奖励
```typescript
freeTrackRewards = {
    coins: 2500,           // 总金币
    tickets: [
        { type: "bronze", quantity: 8 },
        { type: "silver", quantity: 3 },
        { type: "gold", quantity: 1 }
    ]
};
```

### 付费轨道奖励
```typescript
premiumTrackRewards = {
    coins: 5000,           // 总金币
    tickets: [
        { type: "bronze", quantity: 15 },
        { type: "silver", quantity: 8 },
        { type: "gold", quantity: 6 }
    ],
    exclusiveItems: [
        {
            itemId: "premium_avatar_25",
            itemType: "avatar",
            name: "宗师头像",
            description: "25级付费轨道专属头像",
            rarity: "legendary",
            previewUrl: "/assets/avatars/premium_25.png"
        }
    ]
};
```

## 📊 监控指标

### 关键性能指标
```typescript
const kpis = {
    totalPlayers: 10000,           // 总玩家数
    averageLevel: 12.5,            // 平均等级
    premiumConversionRate: 15.2,   // 付费转化率
    completionRate: 8.5,           // 完成率
    averageSeasonPoints: 1250,     // 平均赛季积分
    maxLevel: 25                   // 最高等级
};
```

### 来源分布
```typescript
const sourceDistribution = {
    tournament: 30,        // 30% 来自锦标赛
    quickMatch: 20,        // 20% 来自快速对局
    task: 25,             // 25% 来自任务
    social: 10,           // 10% 来自社交
    achievement: 5,       // 5% 来自成就
    segmentUpgrade: 10    // 10% 来自段位升级
};
```

## 🚀 扩展性设计

### 新奖励类型支持
```typescript
interface ExtendedRewards extends BattlePassRewards {
    newRewardType?: NewRewardType[];
    customItems?: CustomItem[];
    specialEffects?: SpecialEffect[];
}
```

### 新赛季主题支持
```typescript
interface SeasonTheme {
    themeId: string;
    name: string;
    description: string;
    visualAssets: {
        background: string;
        icons: string[];
        colors: string[];
    };
    specialEvents: Event[];
}
```

### 动态配置支持
```typescript
interface DynamicConfig {
    seasonPointsPerLevel: number;
    maxLevel: number;
    price: number;
    rewards: BattlePassRewards;
    canBeModified: boolean;
}
```

## 🔧 部署和维护

### 数据库迁移
```sql
-- 添加新字段
ALTER TABLE player_battle_pass ADD COLUMN claimedLevels ARRAY<INTEGER>;
ALTER TABLE player_battle_pass ADD COLUMN nextRewardLevel INTEGER;

-- 创建新索引
CREATE INDEX idx_battle_pass_claimed_levels ON player_battle_pass(claimedLevels);
CREATE INDEX idx_battle_pass_next_reward ON player_battle_pass(nextRewardLevel);
```

### 监控告警
```typescript
const alerts = {
    lowCompletionRate: "完成率低于5%",
    highErrorRate: "错误率高于1%",
    slowResponseTime: "响应时间超过2秒",
    lowPremiumConversion: "付费转化率低于10%"
};
```

这个优化后的Battle Pass系统提供了更好的用户体验、更强的功能和更高的性能！ 