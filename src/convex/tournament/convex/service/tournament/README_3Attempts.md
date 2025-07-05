# 如何在同一个锦标赛中设置3次尝试

## 概述

在锦标赛系统中，`maxAttempts` 参数控制玩家在同一个锦标赛中可以尝试的次数。设置为3表示玩家可以在同一个锦标赛中尝试3次，系统会取最高分进行排名。

## 关键配置参数

### 1. `maxAttempts: 3`
- **作用**: 在同一个锦标赛中允许的最大尝试次数
- **位置**: `matchRules.maxAttempts`
- **说明**: 这是核心设置，控制尝试次数

### 2. `allowMultipleAttempts: true`
- **作用**: 允许多次尝试
- **位置**: `matchRules.allowMultipleAttempts`
- **说明**: 必须设置为 `true` 才能启用多次尝试

### 3. `rankingMethod: "highest_score"`
- **作用**: 排名方法
- **位置**: `matchRules.rankingMethod`
- **说明**: 取最高分进行排名，这是多次尝试的推荐设置

## 配置示例

```typescript
{
    typeId: "three_attempts_tournament",
    name: "3次尝试锦标赛",
    category: "casual",
    gameType: "solitaire",
    
    matchRules: {
        matchType: "single_match",
        minPlayers: 1,
        maxPlayers: 1,
        isSingleMatch: true,
        maxAttempts: 3,  // 关键设置：允许3次尝试
        allowMultipleAttempts: true,  // 必须为true
        rankingMethod: "highest_score",  // 取最高分
        timeLimit: {
            perMatch: 600 // 10分钟
        }
    },
    
    limits: {
        daily: {
            maxParticipations: 3,  // 每日最多参与3次
            maxTournaments: 1,     // 每日最多1个锦标赛
            maxAttempts: 3         // 每日最多3次尝试
        }
    }
}
```

## 现有配置

### 已配置3次尝试的锦标赛

1. **daily_special** (每日特殊锦标赛)
   - `maxAttempts: 3`
   - `allowMultipleAttempts: true`
   - `rankingMethod: "highest_score"`

2. **independent_tournament** (独立锦标赛)
   - `maxAttempts: 3`
   - `allowMultipleAttempts: true`
   - `rankingMethod: "highest_score"`

## 工作流程

### 1. 玩家加入锦标赛
```typescript
// 检查尝试次数限制
const attempts = await getPlayerAttempts(ctx, { uid, tournamentType, gameType });
if (config.rules?.maxAttempts && attempts >= config.rules.maxAttempts) {
    throw new Error("已达最大尝试次数");
}
```

### 2. 创建比赛记录
```typescript
// 每次尝试都会创建新的比赛记录
const matchId = await MatchManager.createMatch(ctx, {
    tournamentId: tournament._id,
    gameType,
    matchType: "single_match",
    maxPlayers: 1,
    minPlayers: 1,
    gameData: {
        player: { uid, segmentName, eloScore },
        attemptNumber: attempts + 1  // 记录尝试次数
    }
});
```

### 3. 提交分数
```typescript
// 提交分数时会记录尝试次数
await MatchManager.submitScore(ctx, {
    matchId,
    tournamentId,
    uid,
    gameType,
    score,
    gameData,
    propsUsed,
    attemptNumber: match.attemptNumber
});
```

### 4. 结算锦标赛
```typescript
// 结算时取最高分
const playerScores = new Map<string, { totalScore: number; matchCount: number; bestScore: number }>();

for (const match of matches) {
    const playerMatches = await ctx.db
        .query("player_matches")
        .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
        .collect();

    for (const playerMatch of playerMatches) {
        if (!playerMatch.completed) continue;

        const current = playerScores.get(playerMatch.uid) || {
            totalScore: 0,
            matchCount: 0,
            bestScore: 0
        };

        playerScores.set(playerMatch.uid, {
            totalScore: current.totalScore + playerMatch.score,
            matchCount: current.matchCount + 1,
            bestScore: Math.max(current.bestScore, playerMatch.score)  // 取最高分
        });
    }
}
```

## 限制说明

### 1. 尝试次数限制
- 每个玩家在同一个锦标赛中最多尝试3次
- 超过限制后无法再次加入

### 2. 每日限制
- 每日最多参与3次该类型锦标赛
- 每日最多3次尝试

### 3. 时间限制
- 每次尝试有独立的时间限制
- 总时间限制适用于所有尝试

## 测试方法

### 1. 在 Convex 控制台中测试
```javascript
// 测试3次尝试
await testSpecificHandler({ 
    tournamentType: "daily_special",
    testAttempts: 3 
});
```

### 2. 验证尝试次数
```javascript
// 检查玩家尝试次数
const attempts = await getPlayerAttempts(ctx, { 
    uid: "test_user", 
    tournamentType: "daily_special", 
    gameType: "solitaire" 
});
console.log("尝试次数:", attempts);
```

## 注意事项

1. **排名方法**: 建议使用 `"highest_score"` 而不是 `"total_score"`
2. **结算时机**: 可以在每次尝试后立即结算，也可以等所有尝试完成后结算
3. **奖励分配**: 基于最高分分配奖励，而不是总分
4. **数据记录**: 每次尝试都会创建独立的比赛记录，便于追踪和分析

## 常见问题

### Q: 如何修改现有锦标赛的尝试次数？
A: 修改 `tournamentConfigs.ts` 中对应锦标赛的 `matchRules.maxAttempts` 值。

### Q: 如何禁用多次尝试？
A: 设置 `allowMultipleAttempts: false` 或 `maxAttempts: 1`。

### Q: 如何设置不同的尝试次数？
A: 修改 `maxAttempts` 的值，例如 `maxAttempts: 5` 允许5次尝试。 