# 段位系统设计文档

## 📋 概述

段位系统是锦标赛系统的核心组件，负责管理玩家的技能等级、匹配分组和成长激励。系统支持多种游戏类型，每个游戏类型独立计算段位，确保公平性和准确性。

## 🎯 核心特性

### 1. 多游戏类型支持
- 每个游戏类型（solitaire、uno、rummy、ludo）独立段位
- 段位分数不跨游戏类型共享
- 支持不同游戏的段位要求配置

### 2. 段位等级体系
- **8个段位等级**：Bronze → Silver → Gold → Platinum → Diamond → Master → GrandMaster → Legend
- **分数区间**：0-9999+ 分，每个段位有明确的分数范围
- **等级标识**：每个段位有独特的颜色和图标

### 3. 锦标赛积分系统
- 根据锦标赛类型和排名分配段位分数
- 支持加分和扣分机制
- 大规模锦标赛的动态分数计算

### 4. 赛季管理
- 赛季结束时的段位重置
- 历史段位数据保留
- 赛季奖励和成就系统

## 🏗️ 系统架构

### 1. 核心组件

```
SegmentSystem (核心逻辑)
├── 段位定义和配置
├── 分数计算和更新
├── 段位变更处理
├── 奖励发放
└── 排行榜管理

SegmentAPI (API接口)
├── 玩家段位管理
├── 分数更新接口
├── 排行榜查询
├── 统计信息
└── 配置管理

Database Schema
├── player_segments (玩家段位)
├── segment_changes (段位变更记录)
├── segment_rewards (段位奖励配置)
├── leaderboards (排行榜)
└── segment_statistics (统计信息)
```

### 2. 数据流

```
锦标赛结算 → 计算排名 → 分配段位分数 → 更新玩家段位 → 记录变更 → 发放奖励
```

## 📊 段位等级配置

### 段位定义

```typescript
const SEGMENT_LEVELS = {
  Bronze: { minScore: 0, maxScore: 999, color: "#CD7F32", tier: 1 },
  Silver: { minScore: 1000, maxScore: 1999, color: "#C0C0C0", tier: 2 },
  Gold: { minScore: 2000, maxScore: 2999, color: "#FFD700", tier: 3 },
  Platinum: { minScore: 3000, maxScore: 3999, color: "#E5E4E2", tier: 4 },
  Diamond: { minScore: 4000, maxScore: 4999, color: "#B9F2FF", tier: 5 },
  Master: { minScore: 5000, maxScore: 6999, color: "#FF6B6B", tier: 6 },
  GrandMaster: { minScore: 7000, maxScore: 9999, color: "#4ECDC4", tier: 7 },
  Legend: { minScore: 10000, maxScore: Infinity, color: "#FFE66D", tier: 8 }
};
```

### 锦标赛分数奖励

#### 单场比赛（4人）
```typescript
single_match: {
  1: { score: 20, description: "冠军" },
  2: { score: 10, description: "亚军" },
  3: { score: 2, description: "季军" },
  4: { score: -3, description: "第四名" }
}
```

#### 每日锦标赛（16人）
```typescript
daily: {
  1: { score: 50, description: "日冠军" },
  2: { score: 35, description: "日亚军" },
  // ... 更多排名
  16: { score: -5, description: "第十六名" }
}
```

#### 每周锦标赛（32人）
```typescript
weekly: {
  1: { score: 150, description: "周冠军" },
  2: { score: 100, description: "周亚军" },
  // ... 更多排名
  32: { score: -65, description: "第三十二名" }
}
```

#### 赛季锦标赛（大规模）
```typescript
seasonal: {
  calculateByRank: (rank: number, totalPlayers: number) => {
    const percentage = (rank / totalPlayers) * 100;
    
    if (percentage <= 10) {
      // 前10%：+200到+500
      return Math.max(200, 500 - (rank - 1) * 0.3);
    } else if (percentage <= 25) {
      // 前25%：+50到+199
      return Math.max(50, 150 - (rank - 1001) * 0.067);
    } else if (percentage <= 50) {
      // 前50%：+0到+49
      return Math.max(0, 30 - (rank - 2501) * 0.012);
    } else {
      // 后50%：-1到-100
      const bottomPercentage = (rank - 5000) / 5000;
      return -Math.floor(bottomPercentage * 100);
    }
  }
}
```

## 🔧 核心功能

### 1. 玩家段位初始化

```typescript
// 初始化玩家段位
const result = await SegmentSystem.initializePlayerSegment(ctx, uid, gameType);

// 返回结果
{
  success: true,
  playerSegment: {
    uid: "player123",
    gameType: "solitaire",
    segmentName: "Bronze",
    currentPoints: 0,
    highestPoints: 0,
    // ... 其他字段
  }
}
```

### 2. 段位分数更新

```typescript
// 更新玩家段位分数
const result = await SegmentSystem.updatePlayerSegmentScore(ctx, {
  uid: "player123",
  gameType: "solitaire",
  scoreChange: 50,
  tournamentType: "daily",
  tournamentId: "tournament123",
  rank: 1,
  totalPlayers: 16
});

// 返回结果
{
  success: true,
  oldSegment: "Bronze",
  newSegment: "Silver",
  oldPoints: 950,
  newPoints: 1000,
  scoreChange: 50,
  segmentChanged: true,
  isPromotion: true
}
```

### 3. 段位信息查询

```typescript
// 获取玩家段位信息
const result = await SegmentSystem.getPlayerSegment(ctx, uid, gameType);

// 返回结果
{
  success: true,
  playerSegment: {
    uid: "player123",
    gameType: "solitaire",
    segmentName: "Silver",
    currentPoints: 1250,
    highestPoints: 1250,
    progress: 25,        // 到下一段位进度
    pointsToNext: 750,   // 还需多少分晋级
    nextSegment: "Gold",
    segmentConfig: { minScore: 1000, maxScore: 1999, color: "#C0C0C0", tier: 2 }
  }
}
```

### 4. 段位排行榜

```typescript
// 获取段位排行榜
const result = await SegmentSystem.getSegmentLeaderboard(ctx, gameType, segmentName, limit);

// 返回结果
{
  success: true,
  leaderboard: [
    {
      rank: 1,
      uid: "player123",
      displayName: "玩家A",
      avatar: "avatar1.png",
      segmentName: "Gold",
      currentPoints: 2500,
      highestPoints: 2500
    },
    // ... 更多玩家
  ],
  gameType: "solitaire",
  segmentName: "Gold",
  totalCount: 50
}
```

## 🎮 锦标赛集成

### 1. 段位要求检查

```typescript
// 检查玩家是否满足锦标赛段位要求
const eligibility = await checkSegmentRequirement(ctx, {
  uid: "player123",
  gameType: "solitaire",
  requiredSegment: "Gold"
});

// 返回结果
{
  success: true,
  eligible: true,
  reason: "段位满足要求",
  currentSegment: "Gold",
  requiredSegment: "Gold",
  currentTier: 3,
  requiredTier: 3
}
```

### 2. 锦标赛结算流程

```typescript
// 锦标赛结算时的段位更新
const { rankings, segmentRewards, totalPlayers } = await calculateTournamentRankingsAndSegmentRewards(
  ctx, 
  tournamentId, 
  tournamentType
);

// 每个玩家都会获得相应的段位分数奖励
for (const ranking of rankings) {
  const scoreChange = SegmentSystem.calculateTournamentSegmentReward(
    tournamentType, 
    ranking.rank, 
    totalPlayers
  );
  
  await SegmentSystem.updatePlayerSegmentScore(ctx, {
    uid: ranking.uid,
    gameType: ranking.gameType,
    scoreChange,
    tournamentType,
    tournamentId,
    rank: ranking.rank,
    totalPlayers
  });
}
```

## 📈 赛季管理

### 1. 赛季结束重置

```typescript
// 赛季结束时的段位重置
const result = await SegmentSystem.resetSeasonSegments(ctx, seasonId);

// 重置规则
const resetRules = {
  Legend: "Master",
  GrandMaster: "Diamond",
  Master: "Platinum",
  Diamond: "Gold",
  Platinum: "Silver",
  Gold: "Bronze",
  Silver: "Bronze",
  Bronze: "Bronze"
};
```

### 2. 历史数据保留

```typescript
// 段位变更记录
await ctx.db.insert("segment_changes", {
  uid: "player123",
  gameType: "solitaire",
  oldSegment: "Gold",
  newSegment: "Platinum",
  pointsChange: 500,
  reason: "promotion",
  createdAt: now.iso
});
```

## 🏆 奖励系统

### 1. 晋级奖励

```typescript
// 段位晋级时自动发放奖励
await SegmentSystem.grantPromotionRewards(ctx, uid, gameType, newSegment);

// 奖励配置示例
{
  segmentName: "Gold",
  rewardType: "promotion",
  rewards: [
    { type: "coins", itemId: "gold_coins", quantity: 1000 },
    { type: "props", itemId: "gold_badge", quantity: 1 },
    { type: "tickets", itemId: "premium_ticket", quantity: 2 }
  ]
}
```

### 2. 段位维护奖励

```typescript
// 高段位玩家的维护奖励
{
  segmentName: "Master",
  rewardType: "maintenance",
  rewards: [
    { type: "coins", itemId: "master_coins", quantity: 500 },
    { type: "props", itemId: "master_chest", quantity: 1 }
  ]
}
```

## 📊 统计和分析

### 1. 段位分布统计

```typescript
// 获取段位统计信息
const stats = await getSegmentStatistics(ctx, {
  gameType: "solitaire",
  segmentName: "Gold"
});

// 返回结果
{
  success: true,
  statistics: {
    totalPlayers: 1250,
    totalPoints: 3125000,
    averagePoints: 2500,
    segmentDistribution: {
      Bronze: 500,
      Silver: 300,
      Gold: 250,
      Platinum: 150,
      Diamond: 50
    },
    topPlayers: [
      // 前10名玩家信息
    ]
  }
}
```

### 2. 段位变更趋势

```typescript
// 获取玩家段位历史
const history = await getPlayerSegmentHistory(ctx, {
  uid: "player123",
  gameType: "solitaire",
  limit: 20
});

// 返回结果
{
  success: true,
  history: [
    {
      uid: "player123",
      gameType: "solitaire",
      oldSegment: "Bronze",
      newSegment: "Silver",
      pointsChange: 100,
      reason: "promotion",
      createdAt: "2024-01-01T00:00:00Z"
    },
    // ... 更多历史记录
  ]
}
```

## 🔄 使用流程

### 1. 新玩家流程

```typescript
// 1. 玩家首次参与游戏时初始化段位
await SegmentSystem.initializePlayerSegment(ctx, uid, gameType);

// 2. 参与锦标赛
const tournament = await joinTournament(ctx, { uid, gameType, tournamentType });

// 3. 提交分数
await submitScore(ctx, { tournamentId, uid, gameType, score, gameData });

// 4. 锦标赛结算时自动更新段位
await settleTournament(ctx, tournamentId);
```

### 2. 段位查询流程

```typescript
// 1. 获取玩家当前段位信息
const segmentInfo = await SegmentSystem.getPlayerSegment(ctx, uid, gameType);

// 2. 检查锦标赛资格
const eligibility = await checkSegmentRequirement(ctx, { uid, gameType, requiredSegment });

// 3. 查看排行榜
const leaderboard = await SegmentSystem.getSegmentLeaderboard(ctx, gameType, segmentName);
```

### 3. 赛季管理流程

```typescript
// 1. 赛季结束前备份数据
const backupData = await backupSeasonData(ctx, seasonId);

// 2. 执行段位重置
const resetResult = await SegmentSystem.resetSeasonSegments(ctx, seasonId);

// 3. 发放赛季奖励
await distributeSeasonRewards(ctx, seasonId);
```

## 🛠️ API 接口

### 核心接口

| 接口 | 类型 | 描述 |
|------|------|------|
| `initializePlayerSegment` | mutation | 初始化玩家段位 |
| `updatePlayerSegmentScore` | mutation | 更新玩家段位分数 |
| `getPlayerSegment` | query | 获取玩家段位信息 |
| `getSegmentLeaderboard` | query | 获取段位排行榜 |
| `resetSeasonSegments` | mutation | 赛季段位重置 |
| `getSegmentLevels` | query | 获取段位定义配置 |
| `calculateTournamentSegmentReward` | query | 计算锦标赛段位奖励 |
| `getPlayerSegmentHistory` | query | 获取玩家段位历史 |
| `getSegmentStatistics` | query | 获取段位统计信息 |
| `checkSegmentRequirement` | query | 检查段位要求 |
| `batchUpdateSegmentScores` | mutation | 批量更新段位分数 |

### 使用示例

```typescript
// 前端调用示例
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// 获取玩家段位信息
const playerSegment = useQuery(api.segmentAPI.getPlayerSegment, {
  uid: "player123",
  gameType: "solitaire"
});

// 更新段位分数
const updateSegmentScore = useMutation(api.segmentAPI.updatePlayerSegmentScore);

// 获取排行榜
const leaderboard = useQuery(api.segmentAPI.getSegmentLeaderboard, {
  gameType: "solitaire",
  segmentName: "Gold",
  limit: 20
});
```

## 🎯 设计原则

### 1. 公平性
- 每个游戏类型独立计算段位
- 段位分数基于实际比赛表现
- 支持加分和扣分机制

### 2. 激励性
- 明确的段位晋升路径
- 丰富的奖励机制
- 赛季重置保持新鲜感

### 3. 可扩展性
- 支持新增游戏类型
- 可配置的段位等级
- 灵活的奖励系统

### 4. 性能优化
- 批量更新支持
- 索引优化查询
- 缓存常用数据

## 🔮 未来扩展

### 1. 段位保护机制
- 新段位保护期
- 连续失败保护
- 回归玩家保护

### 2. 段位挑战系统
- 段位挑战赛
- 跨段位对战
- 特殊挑战奖励

### 3. 段位成就系统
- 段位相关成就
- 历史最高段位记录
- 段位里程碑奖励

### 4. 段位社交功能
- 段位好友系统
- 段位公会
- 段位排行榜分享

## 📝 总结

段位系统为多游戏平台提供了完整的技能等级管理解决方案，通过公平的分数计算、丰富的奖励机制和灵活的配置选项，为玩家提供了清晰的成长路径和持续的参与动力。系统的模块化设计确保了良好的可维护性和扩展性，能够适应不同游戏类型和业务需求的变化。 