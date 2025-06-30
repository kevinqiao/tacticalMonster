# applyRules 调用位置详解

## 概述

`applyRules` 是锦标赛系统的核心规则引擎方法，在多个地方被调用以实现不同的业务场景。本文档详细分析了所有调用位置及其上下文。

## 调用位置总览

| 文件位置 | 调用方法 | 调用场景 | 调用时机 |
|----------|----------|----------|----------|
| `tournaments.ts` | `submitScore` | 每日特殊赛分数提交 | 玩家提交分数时 |
| `dailySpecial.ts` | `submitScore` | 每日特殊赛单局结算 | 玩家完成比赛时 |
| `dailySpecial.ts` | `settle` | 每日特殊赛批量结算 | 锦标赛结算时 |
| `multiAttemptRanked.ts` | `settle` | 多尝试排名赛结算 | 锦标赛结算时 |

## 详细调用分析

### 1. tournaments.ts - submitScore 方法

**文件位置**: `develop/src/convex/tournament/convex/service/tournaments.ts:115`

**调用上下文**:
```typescript
export const submitScore = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    uid: v.string(),
    gameType: v.string(),
    score: v.number(),
    gameData: v.any(),
    propsUsed: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // ... 验证和处理逻辑
    
    if (tournament.tournamentType === "daily_special") {
      // 收集玩家数据
      const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
      const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
      const playerSeason = await ctx.db.query("player_seasons").withIndex("by_uid_season", (q) => q.eq("uid", args.uid).eq("seasonId", tournament.seasonId)).first();
      const matches = await ctx.db.query("matches").withIndex("by_tournament_uid", (q) => q.eq("tournamentId", args.tournamentId).eq("uid", args.uid)).collect();

      // 调用 applyRules
      const { rank, finalReward } = await applyRules(ctx, {
        tournament,
        uid: args.uid,
        matches,
        player,
        inventory,
        playerSeason,
      });

      return { ...result, rank, rewards: finalReward, shared: !!matches.find((m) => m.uid === args.uid && m.score >= tournament.config.rules.scoreThreshold) };
    }
  }
});
```

**调用目的**:
- 为每日特殊赛提供即时的排名和奖励计算
- 在玩家提交分数后立即返回结果
- 支持社交分享功能（基于分数阈值）

**调用时机**:
- 玩家完成每日特殊赛并提交分数时
- 锦标赛类型为 "daily_special" 时

**数据流向**:
```
玩家提交分数 → 验证分数 → 收集玩家数据 → applyRules → 返回排名和奖励
```

### 2. dailySpecial.ts - submitScore 方法

**文件位置**: `develop/src/convex/tournament/convex/service/handler/dailySpecial.ts:35`

**调用上下文**:
```typescript
export const dailySpecialHandler: TournamentHandler = {
  ...baseHandler,
  async submitScore(ctx, args) {
    const now = getTorontoDate();
    const tournament = await ctx.db.get(args.tournamentId);
    const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", args.uid)).first();
    
    // 扣除道具
    await deductProps(ctx, { uid: args.uid, gameType: args.gameType, propsUsed: args.propsUsed, inventory });

    // 更新比赛记录
    const matches = await ctx.db.query("matches").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", args.tournamentId).eq("uid", args.uid)).collect();
    const currentAttempt = matches.find((m: any) => !m.completed);
    
    await ctx.db.patch(currentAttempt._id, {
      score: args.score,
      completed: true,
      gameData: args.gameData,
      propsUsed: args.propsUsed,
      updatedAt: now.iso,
    });

    // 立即结算（单局模式）
    await ctx.db.patch(tournament._id, { status: "completed", updatedAt: now.iso });
    
    // 收集玩家数据
    const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", args.uid)).first();
    const playerSeason = await ctx.db.query("player_seasons").withIndex("by_uid_season", (q: any) => q.eq("uid", args.uid).eq("seasonId", tournament.seasonId)).first();

    // 调用 applyRules
    await applyRules(ctx, { tournament, uid: args.uid, matches, player, inventory, playerSeason });

    return { success: true, attemptNumber: currentAttempt.attemptNumber };
  }
};
```

**调用目的**:
- 实现每日特殊赛的单局结算模式
- 玩家完成比赛后立即分配奖励
- 更新锦标赛状态为已完成

**调用时机**:
- 玩家完成每日特殊赛的单个比赛时
- 在比赛记录更新后立即执行

**数据流向**:
```
完成比赛 → 更新比赛记录 → 立即结算 → applyRules → 分配奖励
```

### 3. dailySpecial.ts - settle 方法

**文件位置**: `develop/src/convex/tournament/convex/service/handler/dailySpecial.ts:143`

**调用上下文**:
```typescript
async settle(ctx, tournamentId) {
  // 获取锦标赛信息
  const tournament = await ctx.db.get(tournamentId);
  
  // 获取所有比赛记录
  const allMatches = await ctx.db.query("matches").filter((q: any) => q.eq(q.field("tournamentId"), tournamentId)).collect();
  
  // 计算每个玩家的最高分数和排名
  const playerScores = new Map<string, { highestScore: number; bestMatch: Doc<"matches">; totalAttempts: number; }>();
  // ... 排名计算逻辑
  
  // 为每个玩家分配奖励
  for (const playerData of sortedPlayers) {
    try {
      // 收集玩家数据
      const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", playerData.uid)).first();
      const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", playerData.uid)).first();
      const playerSeason = await ctx.db.query("player_seasons").withIndex("by_uid_season", (q: any) => q.eq("uid", playerData.uid).eq("seasonId", tournament.seasonId)).first();
      const playerMatches = allMatches.filter((m: any) => m.uid === playerData.uid);

      // 调用 applyRules
      const { rank, finalReward } = await applyRules(ctx, {
        tournament,
        uid: playerData.uid,
        matches: playerMatches,
        player,
        inventory,
        playerSeason
      });

      // 记录结算结果
      settlementResults.push({
        uid: playerData.uid,
        rank: playerData.rank,
        score: playerData.highestScore,
        attempts: playerData.totalAttempts,
        rewards: finalReward
      });
    } catch (error) {
      // 错误处理
    }
  }
  
  // 发送通知
  for (const result of settlementResults) {
    if (!result.error && result.rewards) {
      await ctx.db.insert("notifications", {
        uid: result.uid,
        message: `您在每日特殊赛中排名第${result.rank}，获得${result.rewards.coins}金币和${result.rewards.gamePoints}积分！`,
        createdAt: now.iso
      });
    }
  }
}
```

**调用目的**:
- 实现每日特殊赛的批量结算
- 为所有参与玩家分配奖励
- 发送结算通知

**调用时机**:
- 锦标赛过期时自动结算
- 手动触发结算时
- 在 `settleTournaments` 中被调用

**数据流向**:
```
锦标赛过期 → 收集所有比赛记录 → 计算排名 → 为每个玩家调用 applyRules → 发送通知
```

### 4. multiAttemptRanked.ts - settle 方法

**文件位置**: `develop/src/convex/tournament/convex/service/handler/multiAttemptRanked.ts:27`

**调用上下文**:
```typescript
export const multiAttemptRankedHandler: TournamentHandler = {
  ...baseHandler,
  async settle(ctx, tournamentId) {
    const now = getTorontoDate();
    const tournament = await ctx.db.get(tournamentId);
    
    // 更新锦标赛状态
    await ctx.db.patch(tournament._id, { status: "completed", updatedAt: now.iso });
    
    // 获取所有比赛记录
    const matches = await ctx.db.query("matches").filter((q: any) => q.eq(q.field("tournamentId"), tournamentId)).collect();

    // 为每个玩家分配奖励
    const playerUids = Array.from(new Set(matches.map((m: any) => m.uid)));
    for (const uid of playerUids) {
      // 收集玩家数据
      const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
      const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
      const playerSeason = await ctx.db.query("player_seasons").withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", tournament.seasonId)).first();
      const playerMatches = matches.filter((m: any) => m.uid === uid);

      // 调用 applyRules
      await applyRules(ctx, { tournament, uid, matches: playerMatches, player, inventory, playerSeason });
    }
  }
};
```

**调用目的**:
- 实现多尝试排名赛的批量结算
- 为所有参与玩家分配奖励
- 支持多尝试的排名计算

**调用时机**:
- 锦标赛过期时自动结算
- 手动触发结算时
- 在 `settleTournaments` 中被调用

**数据流向**:
```
锦标赛过期 → 收集所有比赛记录 → 为每个玩家调用 applyRules → 完成结算
```

## 调用模式分析

### 1. 即时结算模式
**适用场景**: 每日特殊赛的 `submitScore`
**特点**:
- 玩家完成比赛后立即结算
- 单局模式，一次比赛即完成
- 立即返回排名和奖励

### 2. 批量结算模式
**适用场景**: 所有锦标赛的 `settle` 方法
**特点**:
- 锦标赛结束后批量处理所有玩家
- 支持多玩家、多尝试的复杂场景
- 发送通知和记录日志

### 3. 混合模式
**适用场景**: 每日特殊赛同时支持即时和批量结算
**特点**:
- 既支持单局即时结算
- 也支持批量结算作为备份
- 确保奖励分配的可靠性

## 数据准备模式

### 1. 单玩家数据收集
```typescript
// 收集单个玩家的所有相关数据
const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", uid)).first();
const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q) => q.eq("uid", uid)).first();
const playerSeason = await ctx.db.query("player_seasons").withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", tournament.seasonId)).first();
const matches = await ctx.db.query("matches").withIndex("by_tournament_uid", (q) => q.eq("tournamentId", tournamentId).eq("uid", uid)).collect();
```

### 2. 批量数据收集
```typescript
// 收集所有玩家的数据
for (const playerData of sortedPlayers) {
  const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", playerData.uid)).first();
  const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q) => q.eq("uid", playerData.uid)).first();
  const playerSeason = await ctx.db.query("player_seasons").withIndex("by_uid_season", (q) => q.eq("uid", playerData.uid).eq("seasonId", tournament.seasonId)).first();
  const playerMatches = allMatches.filter((m) => m.uid === playerData.uid);
}
```

## 错误处理模式

### 1. 单玩家错误处理
```typescript
// 单个玩家结算失败不影响其他玩家
try {
  await applyRules(ctx, { tournament, uid, matches, player, inventory, playerSeason });
} catch (error) {
  console.error(`结算玩家 ${uid} 时出错:`, error);
  // 继续处理其他玩家
}
```

### 2. 批量错误处理
```typescript
// 记录每个玩家的结算结果
settlementResults.push({
  uid: playerData.uid,
  rank: playerData.rank,
  score: playerData.highestScore,
  attempts: playerData.totalAttempts,
  rewards: finalReward,
  error: error?.message
});
```

## 性能考虑

### 1. 数据库查询优化
- 使用索引进行快速查询
- 批量收集数据减少查询次数
- 合理使用 `first()` 和 `collect()`

### 2. 并发处理
- 单个玩家结算失败不影响其他玩家
- 使用事务确保数据一致性
- 异步处理提高响应速度

### 3. 内存使用
- 及时释放临时变量
- 避免大量数据在内存中累积
- 使用流式处理大量数据

## 总结

`applyRules` 的调用体现了以下设计原则：

1. **统一接口**: 所有调用都使用相同的参数结构
2. **灵活应用**: 支持即时结算和批量结算两种模式
3. **错误隔离**: 单个玩家错误不影响整体流程
4. **数据驱动**: 所有调用都基于完整的数据收集
5. **配置驱动**: 规则逻辑完全基于配置，无需修改代码

这种设计确保了 `applyRules` 能够在不同的业务场景中灵活应用，同时保持代码的一致性和可维护性。 