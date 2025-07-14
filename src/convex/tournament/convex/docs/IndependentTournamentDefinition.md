# 独立锦标赛定义和规则

## 📋 独立锦标赛的定义

### 核心概念
**独立锦标赛**是指每个玩家都有自己独立的锦标赛实例，不与其他玩家共享同一个锦标赛。

### 基本特征
1. **独立实例**：每个玩家加入时都会创建新的锦标赛实例
2. **单人模式**：每个玩家在自己的锦标赛中进行单人比赛
3. **独立排名**：每个玩家独立计算排名和奖励
4. **隔离环境**：不同玩家之间完全隔离，互不影响

## 🎯 独立锦标赛的规则

### 1. 锦标赛创建规则

#### 每次加入都创建新实例
```typescript
// 独立锦标赛创建逻辑
if (isIndependent) {
    // 每次玩家加入都创建新的锦标赛
    const tournamentId = await createIndependentTournament(ctx, {
        uid,
        gameType,
        tournamentType,
        player,
        season,
        config,
        now,
        attemptNumber
    });
}
```

#### 锦标赛配置
```typescript
{
    seasonId: season._id,
    gameType,
    segmentName: player.segmentName,
    status: "open",
    tournamentType,
    isSubscribedRequired: false,
    isSingleMatch: true, // 独立锦标赛是单人比赛
    prizePool: entryFee * 0.8,
    config: {
        entryRequirements,
        matchRules,
        rewards,
        schedule,
        limits,
        advanced
    },
    createdAt: now.iso,
    updatedAt: now.iso
}
```

### 2. 比赛规则

#### 单人比赛模式
- **最大玩家数**：1人
- **最小玩家数**：1人
- **比赛类型**：单人比赛
- **游戏环境**：完全独立

#### 比赛创建
```typescript
// 创建单人比赛
const matchId = await MatchManager.createMatch(ctx, {
    tournamentId: tournament._id,
    gameType,
    matchType: "tournament",
    maxPlayers: 1,
    minPlayers: 1,
    gameData: { 
        tournamentType, 
        attemptNumber,
        isIndependent: true 
    }
});
```

### 3. 参与规则

#### 参与限制
- **参赛次数**：根据配置的 `maxAttempts` 限制
- **时间范围**：根据配置的 `timeRange` 限制
- **段位要求**：根据配置的 `minSegment` 要求
- **订阅要求**：根据配置的 `isSubscribedRequired` 要求

#### 参与流程
```typescript
// 1. 验证加入条件
await validateJoinConditions(ctx, { uid, gameType, tournamentType, player, season });

// 2. 扣除入场费
if (entryFee) {
    await deductEntryFeeCommon(ctx, { uid, entryFee, inventory });
}

// 3. 检查参赛次数
const attempts = await getPlayerAttempts(ctx, { uid, tournamentType, gameType, timeRange });
if (attempts >= maxAttempts) {
    throw new Error("已达最大尝试次数");
}

// 4. 创建独立锦标赛
const tournament = await createIndependentTournament(ctx, { ... });

// 5. 创建单人比赛
const match = await createMatch(ctx, { ... });

// 6. 玩家加入比赛
const playerMatch = await joinMatch(ctx, { ... });
```

### 4. 分数提交规则

#### 分数验证
- **分数范围**：不能为负数
- **提交限制**：已完成比赛不能再次提交
- **道具使用**：支持道具使用和扣除

#### 分数处理
```typescript
// 验证分数提交
await validateScoreSubmission(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed });

// 更新比赛记录
await MatchManager.submitScore(ctx, {
    matchId,
    tournamentId,
    uid,
    gameType,
    score,
    gameData,
    propsUsed,
    attemptNumber
});
```

### 5. 结算规则

#### 结算条件
- **立即结算**：单人比赛完成后立即结算
- **延迟结算**：根据配置的结算策略

#### 奖励计算
```typescript
// 计算玩家排名（独立锦标赛中排名总是1）
const rank = 1;

// 计算奖励
const reward = calculateReward(rank, tournament.config.rewards);

// 分配奖励
await distributeReward(ctx, {
    uid,
    rank,
    score,
    tournament,
    matches,
    reward
});
```

## 🔧 技术实现

### 1. 处理器映射

#### 使用 `multiPlayerTournamentHandler`
```typescript
// 独立锦标赛类型映射
"single_player_tournament": multiPlayerTournamentHandler,
"independent_tournament": multiPlayerTournamentHandler,
"single_player_threshold_tournament": multiPlayerTournamentHandler,
```

#### 独立状态检测
```typescript
// 获取锦标赛的独立状态
const { getIndependentFromTournamentType } = await import("../utils/tournamentTypeUtils");
const isIndependent = await getIndependentFromTournamentType(ctx, tournamentType);
```

### 2. 数据库结构

#### tournaments 表
```typescript
{
    _id: "tournament_123",
    seasonId: "season_1",
    gameType: "solitaire",
    segmentName: "gold",
    status: "open",
    tournamentType: "independent_tournament",
    isSubscribedRequired: false,
    isSingleMatch: true, // 关键标识
    prizePool: 24,
    config: {
        entryRequirements: { ... },
        matchRules: { ... },
        rewards: { ... }
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
}
```

#### player_tournaments 表
```typescript
{
    _id: "pt_123",
    uid: "user_123",
    tournamentId: "tournament_123",
    tournamentType: "independent_tournament",
    gameType: "solitaire",
    status: "active",
    joinedAt: "2024-01-01T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
}
```

#### matches 表
```typescript
{
    _id: "match_123",
    tournamentId: "tournament_123",
    gameType: "solitaire",
    matchType: "tournament",
    maxPlayers: 1,
    minPlayers: 1,
    status: "completed",
    gameData: {
        tournamentType: "independent_tournament",
        attemptNumber: 1,
        isIndependent: true
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### 3. 配置示例

#### 独立锦标赛配置
```typescript
{
    typeId: "independent_tournament",
    name: "独立锦标赛",
    description: "每次尝试都是独立的锦标赛",
    category: "casual",
    gameType: "solitaire",
    isActive: true,
    priority: 4,

    entryRequirements: {
        minSegment: "bronze",
        isSubscribedRequired: false,
        entryFee: {
            coins: 30
        }
    },

    matchRules: {
        matchType: "single_match",
        minPlayers: 1,
        maxPlayers: 1,
        isSingleMatch: true, // 关键配置
        maxAttempts: 3,
        allowMultipleAttempts: true,
        rankingMethod: "highest_score",
        timeLimit: {
            perMatch: 480 // 8分钟
        }
    },

    rewards: {
        baseRewards: {
            coins: 60,
            gamePoints: 30,
            props: [...],
            tickets: []
        },
        rankRewards: [
            {
                rankRange: [1, 1],
                multiplier: 2.5
            }
        ]
    }
}
```

## 📊 独立锦标赛 vs 其他模式对比

| 特性 | 独立锦标赛 | 共享锦标赛 | 多人单场比赛 | 多人独立游戏 |
|------|------------|------------|--------------|--------------|
| **锦标赛实例** | 每个玩家独立 | 多个玩家共享 | 多个玩家共享 | 多个玩家共享 |
| **比赛模式** | 单人比赛 | 独立比赛 | 单场比赛 | 独立游戏 |
| **玩家数量** | 1人 | 多人 | 多人 | 多人 |
| **排名方式** | 独立排名 | 共享排名 | 共享排名 | 共享排名 |
| **隔离程度** | 完全隔离 | 部分隔离 | 无隔离 | 部分隔离 |
| **使用场景** | 单人挑战 | 技能比拼 | 实时竞争 | 公平竞争 |

## 🎮 使用场景

### 1. 单人挑战
- 玩家想要独立练习和挑战
- 不受其他玩家干扰
- 专注于个人技能提升

### 2. 测试环境
- 新功能测试
- 平衡性测试
- 性能测试

### 3. 特殊邀请赛
- VIP玩家专属比赛
- 特殊奖励比赛
- 封闭式比赛

### 4. 技能评估
- 个人技能评估
- 段位晋升测试
- 能力认证

## ⚠️ 注意事项

### 1. 资源管理
- 独立锦标赛会创建大量锦标赛实例
- 需要定期清理过期的锦标赛
- 注意数据库存储空间

### 2. 性能考虑
- 每个玩家都有独立的锦标赛可能影响性能
- 需要优化查询和索引
- 考虑批量处理机制

### 3. 用户体验
- 确保玩家理解独立锦标赛的概念
- 提供清晰的参与反馈
- 优化奖励分配流程

## 🔄 总结

独立锦标赛是一个重要的锦标赛模式，它为玩家提供了完全独立的比赛环境。通过明确的定义和规则，我们可以确保：

1. **概念清晰**：每个玩家都有独立的锦标赛实例
2. **规则明确**：单人比赛，独立排名，完全隔离
3. **实现简单**：基于现有的处理器架构
4. **扩展友好**：支持多种配置和定制

这种模式特别适合需要隔离环境的比赛场景，为玩家提供了专注和公平的比赛体验。 