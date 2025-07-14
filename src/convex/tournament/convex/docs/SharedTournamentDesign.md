# 多人共享锦标赛设计文档

## 概述

多人共享锦标赛是一种创新的锦标赛模式，允许多个玩家共享同一个锦标赛实例，但每个玩家进行独立的单人比赛。这种设计结合了多人参与的热闹氛围和单人游戏的专注体验。

## 核心概念

### 1. 共享锦标赛实例
- **多个玩家共享同一个锦标赛实例**
- **统一的开始时间和结束时间**
- **共享的奖励池和排名系统**

### 2. 独立单人比赛
- **每个玩家进行独立的单人比赛**
- **不与其他玩家直接互动**
- **专注于个人技能发挥**

### 3. 统一排名系统
- **根据所有玩家的独立比赛成绩进行排名**
- **支持多次尝试，取最高分**
- **实时更新排名和奖励**

## 配置参数

### 基础配置
```typescript
{
    typeId: "shared_tournament_independent_matches",
    name: "多人共享锦标赛",
    description: "多个玩家共享同一个锦标赛，但每人进行独立的单人比赛",
    category: "tournament",
    gameType: "solitaire",
    isActive: true,
    priority: 3
}
```

### 比赛规则
```typescript
matchRules: {
    matchType: "single_match",        // 单人比赛
    minPlayers: 1,                   // 每个比赛最少1人
    maxPlayers: 1,                   // 每个比赛最多1人
    isSingleMatch: true,             // 单人比赛
    maxAttempts: 3,                  // 每个玩家在锦标赛中最多3次尝试
    allowMultipleAttempts: true,     // 允许多次尝试
    rankingMethod: "highest_score",  // 取最高分排名
    timeLimit: {
        perMatch: 600,               // 每场比赛10分钟
        total: 1800                  // 总时间30分钟
    }
}
```

### 高级配置
```typescript
advanced: {
    matching: {
        algorithm: "shared_tournament",  // 共享锦标赛算法
        maxWaitTime: 300,                // 最大等待时间5分钟
        fallbackToAI: false,             // 不使用AI回退
        maxPlayersPerTournament: 50      // 每个锦标赛最多50个玩家
    },
    settlement: {
        autoSettle: true,
        settleDelay: 300,                // 5分钟后自动结算
        requireMinimumPlayers: false,
        minimumPlayers: 1
    }
}
```

## 实现逻辑

### 1. 锦标赛创建和加入

#### 查找现有锦标赛
```typescript
// 查找现有的开放共享锦标赛
const existingTournament = await ctx.db
    .query("tournaments")
    .withIndex("by_type_status_game", (q: any) =>
        q.eq("tournamentType", tournamentType)
            .eq("status", "open")
            .eq("gameType", gameType)
    )
    .filter((q: any) => q.eq(q.field("segmentName"), player.segmentName))
    .first();
```

#### 玩家参与检查
```typescript
// 检查玩家是否已经参与了这个锦标赛
const existingParticipation = await ctx.db
    .query("player_tournaments")
    .withIndex("by_uid_tournamentType_gameType", (q: any) =>
        q.eq("uid", uid)
            .eq("tournamentType", tournamentType)
            .eq("gameType", gameType)
    )
    .filter((q: any) => q.eq(q.field("tournamentId"), existingTournament._id))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();
```

### 2. 独立比赛创建

每个玩家加入锦标赛时，都会创建一个独立的单人比赛：

```typescript
// 创建独立的单人比赛
const matchId = await createMatchCommon(ctx, {
    tournamentId: tournament._id,
    gameType,
    tournamentType,
    attemptNumber: attempts + 1
});

// 玩家加入比赛
const matchResult = await joinMatchCommon(ctx, {
    matchId,
    tournamentId: tournament._id,
    uid,
    gameType
});
```

### 3. 分数提交和排名

#### 分数提交
```typescript
// 更新比赛记录
await MatchManager.submitScore(ctx, {
    matchId: playerMatch.matchId,
    tournamentId,
    uid,
    gameType,
    score,
    gameData,
    propsUsed,
    attemptNumber: 1
});
```

#### 排名计算
```typescript
// 计算玩家排名
const sortedPlayers = await calculatePlayerRankings(ctx, tournamentId);

// 分配奖励
for (const player of sortedPlayers) {
    const reward = calculateReward(player.rank, tournament.config.rewards);
    await distributeReward(ctx, {
        uid: player.uid,
        rank: player.rank,
        score: player.score,
        tournament,
        matches: completedMatches,
        reward
    });
}
```

## 数据库结构

### tournaments 表
```typescript
{
    _id: Id<"tournaments">,
    seasonId: Id<"seasons">,
    gameType: "solitaire",
    segmentName: "bronze",
    status: "open",
    tournamentType: "shared_tournament_independent_matches",
    isSubscribedRequired: false,
    isSingleMatch: false,  // 共享锦标赛不是单人比赛
    prizePool: 48,         // 入场费 * 0.8
    config: {
        // ... 标准配置
        sharedTournament: {
            maxPlayersPerTournament: 50,
            currentPlayerCount: 1
        }
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    endTime: "2024-01-01T01:00:00.000Z"
}
```

### player_tournaments 表
```typescript
{
    _id: Id<"player_tournaments">,
    uid: "player123",
    tournamentId: Id<"tournaments">,
    tournamentType: "shared_tournament_independent_matches",
    gameType: "solitaire",
    status: "active",
    joinedAt: "2024-01-01T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### player_matches 表
```typescript
{
    _id: Id<"player_matches">,
    matchId: Id<"matches">,
    tournamentId: Id<"tournaments">,
    uid: "player123",
    gameType: "solitaire",
    score: 1500,
    rank: 3,
    completed: true,
    gameData: { /* 游戏数据 */ },
    propsUsed: ["undo", "hint"],
    attemptNumber: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
}
```

## 使用场景

### 1. 技能挑战赛
- 多个玩家同时参与技能挑战
- 每个人独立完成挑战
- 根据完成质量进行排名

### 2. 限时竞赛
- 在固定时间内完成挑战
- 支持多次尝试提高成绩
- 实时查看其他玩家进度

### 3. 段位晋升赛
- 同段位玩家参与
- 独立完成晋升挑战
- 根据表现决定晋升资格

## 优势

### 1. 社交体验
- **多人参与的热闹氛围**
- **实时排名和进度显示**
- **玩家间的间接竞争**

### 2. 专注体验
- **独立的单人游戏环境**
- **不受其他玩家干扰**
- **专注于个人技能发挥**

### 3. 灵活参与
- **支持多次尝试**
- **随时加入和退出**
- **灵活的参与时间**

### 4. 公平竞争
- **统一的比赛环境**
- **相同的游戏规则**
- **客观的评分标准**

## 注意事项

### 1. 性能考虑
- 大量玩家同时参与时需要考虑数据库性能
- 实时排名更新需要优化查询效率
- 结算时的奖励分配需要事务处理

### 2. 用户体验
- 需要清晰显示当前排名和进度
- 提供多次尝试的机会和反馈
- 及时通知比赛结果和奖励

### 3. 系统稳定性
- 防止重复参与和作弊
- 确保数据一致性和完整性
- 提供错误处理和恢复机制

## 扩展功能

### 1. 实时排行榜
- 显示当前参与玩家的实时排名
- 支持按分数、完成时间等排序
- 提供历史最佳成绩对比

### 2. 成就系统
- 设置参与人数里程碑
- 提供特殊成就和奖励
- 记录个人最佳成绩

### 3. 社交功能
- 允许玩家查看其他玩家的成绩
- 提供点赞和评论功能
- 支持分享成绩到社交媒体

## 总结

多人共享锦标赛模式成功结合了多人参与的社交体验和单人游戏的专注体验，为玩家提供了一种全新的锦标赛参与方式。通过合理的配置和实现，可以支持各种不同的游戏场景和用户需求。 