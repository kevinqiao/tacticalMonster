# 游戏系统集成设计文档

## 📋 系统概述

本游戏平台基于赛季制设计，包含以下核心系统：
- **段位系统** - 驱动玩家竞技动力
- **Battle Pass系统** - 基于赛季积分的进度系统
- **排行榜系统** - 综合和游戏特定排行榜
- **任务系统** - 多样化的任务和奖励
- **门票系统** - 统一的游戏门票
- **快速对局系统** - 基于锦标赛的快速匹配

## 🎯 赛季积分 (Season Points) 来源

### 主要来源
1. **任务奖励** - 完成任务获得赛季积分
2. **快速对局** - 参与快速对局获得赛季积分
3. **每日/每周排行榜** - 排行榜奖励包含赛季积分
4. **段位升级** - 段位升级时获得赛季积分奖励

### 积分分配策略
```typescript
// 任务奖励
taskSeasonPoints: 50-200 // 根据任务难度

// 快速对局
quickMatchSeasonPoints: 10-30 // 根据排名

// 排行榜奖励
leaderboardSeasonPoints: 100-500 // 根据排名

// 段位升级
segmentUpgradeSeasonPoints: 50-1000 // 根据段位等级
```

## 🏆 段位系统设计

### 段位等级
```typescript
const segments = {
    bronze: { minPoints: 0, maxPoints: 999, rewards: { coins: 100, seasonPoints: 50 } },
    silver: { minPoints: 1000, maxPoints: 2499, rewards: { coins: 200, seasonPoints: 100 } },
    gold: { minPoints: 2500, maxPoints: 4999, rewards: { coins: 300, seasonPoints: 150 } },
    platinum: { minPoints: 5000, maxPoints: 9999, rewards: { coins: 500, seasonPoints: 250 } },
    diamond: { minPoints: 10000, maxPoints: 19999, rewards: { coins: 800, seasonPoints: 400 } },
    master: { minPoints: 20000, maxPoints: 49999, rewards: { coins: 1200, seasonPoints: 600 } },
    grandmaster: { minPoints: 50000, maxPoints: 999999, rewards: { coins: 2000, seasonPoints: 1000 } }
};
```

### 段位积分来源
1. **锦标赛** - 根据排名获得段位积分
2. **快速对局** - 胜利获得段位积分
3. **排行榜** - 排行榜奖励包含段位积分
4. **任务** - 任务奖励包含段位积分

## 🎮 Battle Pass系统设计

### 核心特性
- **25级设计** - 总共25个等级
- **每级100赛季积分** - 升级门槛适中
- **免费轨道** - 基础奖励轨道
- **付费轨道** - 高级奖励轨道

### 奖励结构
```typescript
// 免费轨道总奖励
freeTrackRewards = {
    coins: 2500,
    tickets: [
        { type: "bronze", quantity: 8 },
        { type: "silver", quantity: 3 },
        { type: "gold", quantity: 1 }
    ]
};

// 付费轨道总奖励
premiumTrackRewards = {
    coins: 5000,
    tickets: [
        { type: "bronze", quantity: 15 },
        { type: "silver", quantity: 8 },
        { type: "gold", quantity: 6 }
    ],
    exclusiveItems: [
        { itemId: "premium_avatar_25", itemType: "avatar", rarity: "legendary" }
    ]
};
```

## 📊 排行榜系统设计

### 双重排行榜结构
1. **综合排行榜** - 所有游戏的累积积分
2. **游戏特定排行榜** - 特定游戏的积分

### 数据库设计
```typescript
// 综合排行榜
daily_leaderboard_points: {
    date: string,
    uid: string,
    totalScore: number,    // 所有游戏累积积分
    matchesPlayed: number  // 所有游戏对局数
}

// 游戏特定排行榜
daily_leaderboard_points_by_game: {
    date: string,
    uid: string,
    gameType: string,      // 特定游戏类型
    totalScore: number,    // 特定游戏累积积分
    matchesPlayed: number  // 特定游戏对局数
}
```

### 奖励机制
```typescript
// 每日排行榜奖励
dailyRewards = [
    { rankRange: [1, 1], rankPoints: 100, seasonPoints: 200, coins: 500 },
    { rankRange: [2, 3], rankPoints: 50, seasonPoints: 100, coins: 200 },
    { rankRange: [4, 10], rankPoints: 20, seasonPoints: 50, coins: 100 }
];

// 每周排行榜奖励
weeklyRewards = [
    { rankRange: [1, 1], rankPoints: 500, seasonPoints: 1000, coins: 2000 },
    { rankRange: [2, 5], rankPoints: 200, seasonPoints: 400, coins: 800 },
    { rankRange: [6, 20], rankPoints: 100, seasonPoints: 200, coins: 400 }
];
```

## 🔄 系统集成流程

### 快速对局完成流程
```typescript
// 1. 更新排行榜积分
await LeaderboardSystem.updatePoints(ctx, {
    uid: "player123",
    gameType: "solitaire",
    score: 3 // 根据排名计算的积分
});

// 2. 添加段位积分
await ctx.runMutation(api.segmentManagerFunctions.addRankPoints, {
    uid: "player123",
    rankPoints: 5,
    source: "quick_match"
});

// 3. 添加赛季积分到Battle Pass
await BattlePassSystem.addSeasonPoints(ctx, "player123", 10, "quick_match");
```

### 任务完成流程
```typescript
// 1. 完成任务
await TaskSystem.completeTask(ctx, "player123", "task_id");

// 2. 发放奖励
await TaskIntegration.grantComprehensiveRewards(ctx, "player123", {
    coins: 100,
    seasonPoints: 50,
    rankPoints: 20,
    tickets: [{ type: "bronze", quantity: 1 }]
});

// 3. 更新Battle Pass
await BattlePassSystem.addSeasonPoints(ctx, "player123", 50, "task");

// 4. 更新段位
await ctx.runMutation(api.segmentManagerFunctions.addRankPoints, {
    uid: "player123",
    rankPoints: 20,
    source: "task"
});
```

### 段位升级流程
```typescript
// 1. 检查段位升级
const result = await ctx.runMutation(api.segmentManagerFunctions.addRankPoints, {
    uid: "player123",
    rankPoints: 100,
    source: "tournament"
});

// 2. 如果升级，发放奖励
if (result.newSegment && result.upgradeRewards) {
    // 发放金币、门票、道具
    await grantUpgradeRewards(ctx, "player123", result.upgradeRewards);
    
    // 添加赛季积分到Battle Pass
    await BattlePassSystem.addSeasonPoints(ctx, "player123", 
        result.upgradeRewards.seasonPoints, "segment_upgrade");
}
```

## 🎯 经济平衡设计

### 积分获取平衡
```typescript
// 每日可获得的赛季积分上限
dailySeasonPointsLimit = {
    tasks: 200,        // 任务奖励
    quickMatches: 150, // 快速对局
    leaderboards: 300, // 排行榜奖励
    total: 650         // 每日总计
};

// 每周可获得的段位积分上限
weeklyRankPointsLimit = {
    tournaments: 500,  // 锦标赛
    quickMatches: 100, // 快速对局
    leaderboards: 1000, // 排行榜奖励
    tasks: 200,        // 任务奖励
    total: 1800        // 每周总计
};
```

### 奖励分配策略
1. **免费玩家** - 通过任务和排行榜获得基础奖励
2. **付费玩家** - 通过Battle Pass获得额外奖励
3. **竞技玩家** - 通过段位系统获得高级奖励

## 📈 数据架构

### 核心表结构
```typescript
// 玩家段位
player_segments: {
    uid: string,
    segmentName: string,
    rankPoints: number,
    seasonId: string,
    upgradeHistory: SegmentUpgradeHistory[]
}

// 玩家Battle Pass
player_battle_pass: {
    uid: string,
    seasonId: string,
    currentLevel: number,
    currentSeasonPoints: number,
    isPremium: boolean,
    progress: BattlePassProgress
}

// 排行榜积分
daily_leaderboard_points: {
    date: string,
    uid: string,
    totalScore: number,
    matchesPlayed: number
}

// 任务系统
player_tasks: {
    uid: string,
    templateId: string,
    progress: TaskProgress,
    status: TaskStatus
}
```

## 🚀 性能优化

### 索引策略
```typescript
// 段位系统索引
player_segments: {
    by_uid_season: ["uid", "seasonId"],
    by_season: ["seasonId"],
    by_rank_points: ["rankPoints"]
}

// Battle Pass索引
player_battle_pass: {
    by_uid_season: ["uid", "seasonId"],
    by_season: ["seasonId"]
}

// 排行榜索引
daily_leaderboard_points: {
    by_date: ["date"],
    by_uid_date: ["uid", "date"],
    by_date_score: ["date", "totalScore"]
}
```

### 缓存策略
1. **配置缓存** - 段位配置、Battle Pass配置
2. **排行榜缓存** - 每日/每周排行榜结果
3. **玩家状态缓存** - 当前段位、Battle Pass等级

## 🔧 扩展性设计

### 新游戏类型支持
```typescript
// 添加新游戏类型
const newGameType = "chess";

// 自动创建游戏特定排行榜
await LeaderboardSystem.accumulateDailyPointsByGame(ctx, {
    uid: "player123",
    gameType: newGameType,
    score: 10
});
```

### 新段位等级支持
```typescript
// 添加新段位
const newSegment = {
    name: "legendary",
    displayName: "传奇",
    minRankPoints: 100000,
    maxRankPoints: 999999,
    upgradeRewards: { coins: 3000, seasonPoints: 1500 }
};
```

### 新奖励类型支持
```typescript
// 扩展奖励类型
interface ExtendedRewards {
    coins: number;
    seasonPoints: number;
    rankPoints: number;
    tickets: Ticket[];
    props: Prop[];
    exclusiveItems: ExclusiveItem[];
    newRewardType: NewRewardType[];
}
```

## 📊 监控和分析

### 关键指标
1. **段位分布** - 各段位玩家数量
2. **Battle Pass进度** - 平均等级、付费转化率
3. **排行榜参与度** - 每日/每周参与人数
4. **任务完成率** - 各类任务完成情况

### 数据报表
```typescript
// 段位分布报表
segmentDistribution = {
    bronze: 45,      // 45% 青铜
    silver: 25,      // 25% 白银
    gold: 15,        // 15% 黄金
    platinum: 10,    // 10% 铂金
    diamond: 3,      // 3% 钻石
    master: 1.5,     // 1.5% 大师
    grandmaster: 0.5 // 0.5% 宗师
};

// Battle Pass进度报表
battlePassProgress = {
    averageLevel: 12.5,
    premiumConversionRate: 15, // 15% 付费率
    completionRate: 8.2        // 8.2% 完成率
};
```

这个集成设计确保了所有系统之间的协调工作，为玩家提供完整的游戏体验！ 