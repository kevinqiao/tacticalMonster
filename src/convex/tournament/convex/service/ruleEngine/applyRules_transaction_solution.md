# 使用事务解决 applyRules 两次调用的数据一致性问题

## 问题背景

在锦标赛系统中，`applyRules` 可能在 `submitScore` 和 `settle` 中被调用两次，这会导致以下数据一致性问题：

1. **重复奖励分配**: 玩家可能获得两次奖励
2. **数据状态不一致**: 库存、积分等数据可能不一致
3. **并发冲突**: 多个操作同时修改同一数据
4. **部分失败**: 某些操作成功，某些失败，导致数据不完整

## 事务解决方案

### 1. 事务基础设计

```typescript
// 在 applyRules 中使用事务确保数据一致性
export async function applyRules(ctx: any, { tournament, uid, matches, player, inventory, playerSeason }: any) {
  return await ctx.db.runTransaction(async (txn) => {
    // 在事务中执行所有数据更新操作
    return await applyRulesInternal(txn, { tournament, uid, matches, player, inventory, playerSeason });
  });
}

// 内部实现，在事务中执行
async function applyRulesInternal(txn: any, { tournament, uid, matches, player, inventory, playerSeason }: any) {
  const now = getTorontoDate();
  
  // 1. 检查是否已经分配过奖励（幂等性检查）
  const existingReward = await txn
    .query("player_rewards")
    .withIndex("by_tournament_uid", (q) => 
      q.eq("tournamentId", tournament._id).eq("uid", uid)
    )
    .first();

  if (existingReward) {
    console.log(`玩家 ${uid} 在锦标赛 ${tournament._id} 中已经获得奖励`);
    return { 
      rank: existingReward.rank, 
      finalReward: existingReward.rewards,
      alreadyRewarded: true 
    };
  }

  // 2. 计算排名和奖励
  const { rank, finalReward } = calculateRankAndRewards(tournament, uid, matches);

  // 3. 在事务中更新所有相关数据
  await updatePlayerData(txn, { uid, inventory, playerSeason, finalReward, tournament, now });
  
  // 4. 记录奖励分配
  await recordRewardAllocation(txn, { tournament, uid, rank, finalReward, now });

  return { rank, finalReward, alreadyRewarded: false };
}
```

### 2. 数据更新函数

```typescript
// 在事务中更新玩家数据
async function updatePlayerData(txn: any, { uid, inventory, playerSeason, finalReward, tournament, now }: any) {
  // 1. 更新库存
  await txn.patch(inventory._id, {
    coins: inventory.coins + finalReward.coins,
    props: updateProps(inventory.props, finalReward.props),
    tickets: updateTickets(inventory.tickets, finalReward.tickets || []),
    updatedAt: now.iso,
  });

  // 2. 更新赛季积分
  await txn.patch(playerSeason._id, {
    seasonPoints: playerSeason.seasonPoints + finalReward.gamePoints,
    gamePoints: {
      ...playerSeason.gamePoints,
      [tournament.gameType]: playerSeason.gamePoints[tournament.gameType] + finalReward.gamePoints,
    },
    updatedAt: now.iso,
  });

  // 3. 检查并更新玩家段位
  const newSegment = determineSegment(playerSeason.gamePoints[tournament.gameType] + finalReward.gamePoints);
  if (newSegment !== player.segmentName) {
    await txn.patch(player._id, { 
      segmentName: newSegment,
      updatedAt: now.iso 
    });
  }
}

// 记录奖励分配
async function recordRewardAllocation(txn: any, { tournament, uid, rank, finalReward, now }: any) {
  await txn.insert("player_rewards", {
    tournamentId: tournament._id,
    uid,
    rank,
    rewards: finalReward,
    createdAt: now.iso,
    updatedAt: now.iso
  });
}
```

### 3. 增强的 Handler 实现

#### submitScore 中的事务处理

```typescript
// dailySpecial.ts:submitScore
export const dailySpecialHandler: TournamentHandler = {
  ...baseHandler,
  async submitScore(ctx, args) {
    return await ctx.db.runTransaction(async (txn) => {
      const now = getTorontoDate();
      
      // 1. 获取最新数据（在事务中）
      const tournament = await txn.get(args.tournamentId);
      const inventory = await txn
        .query("player_inventory")
        .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
        .first();
      
      // 2. 验证和扣除道具
      await deductProps(txn, { 
        uid: args.uid, 
        gameType: args.gameType, 
        propsUsed: args.propsUsed, 
        inventory 
      });

      // 3. 更新比赛记录
      const matches = await txn
        .query("matches")
        .withIndex("by_tournament_uid", (q: any) => 
          q.eq("tournamentId", args.tournamentId).eq("uid", args.uid)
        )
        .collect();
      
      const currentAttempt = matches.find((m: any) => !m.completed);
      if (!currentAttempt) throw new Error("未找到未完成尝试");

      await txn.patch(currentAttempt._id, {
        score: args.score,
        completed: true,
        gameData: args.gameData,
        propsUsed: args.propsUsed,
        updatedAt: now.iso,
      });

      // 4. 更新锦标赛状态
      await txn.patch(tournament._id, { 
        status: "completed", 
        updatedAt: now.iso 
      });

      // 5. 获取玩家数据
      const player = await txn
        .query("players")
        .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
        .first();
      
      const playerSeason = await txn
        .query("player_seasons")
        .withIndex("by_uid_season", (q: any) => 
          q.eq("uid", args.uid).eq("seasonId", tournament.seasonId)
        )
        .first();

      // 6. 应用规则（在事务中）
      const { rank, finalReward, alreadyRewarded } = await applyRules(txn, { 
        tournament, 
        uid: args.uid, 
        matches, 
        player, 
        inventory, 
        playerSeason 
      });

      // 7. 计算分享标志
      const shared = !!matches.find((m: any) => 
        m.uid === args.uid && m.score >= tournament.config.rules.scoreThreshold
      );

      return { 
        success: true, 
        attemptNumber: currentAttempt.attemptNumber,
        rank,
        rewards: finalReward,
        shared,
        alreadyRewarded
      };
    });
  }
};
```

#### settle 中的事务处理

```typescript
// dailySpecial.ts:settle
async settle(ctx, tournamentId) {
  return await ctx.db.runTransaction(async (txn) => {
    const now = getTorontoDate();

    // 1. 获取锦标赛信息
    const tournament = await txn.get(tournamentId);
    if (!tournament) {
      throw new Error(`锦标赛 ${tournamentId} 不存在`);
    }

    // 2. 检查锦标赛状态
    if (tournament.status === "completed") {
      console.log(`锦标赛 ${tournamentId} 已经结算完成`);
      return { alreadySettled: true };
    }

    // 3. 获取所有比赛记录
    const allMatches = await txn
      .query("matches")
      .filter((q: any) => q.eq(q.field("tournamentId"), tournamentId))
      .collect();

    if (allMatches.length === 0) {
      console.log(`锦标赛 ${tournamentId} 没有比赛记录`);
      await txn.patch(tournamentId, {
        status: "completed",
        updatedAt: now.iso
      });
      return { noMatches: true };
    }

    // 4. 计算排名
    const sortedPlayers = calculatePlayerRankings(allMatches);

    // 5. 为每个玩家分配奖励（在事务中）
    const settlementResults = [];
    for (const playerData of sortedPlayers) {
      try {
        const result = await processPlayerSettlement(txn, { 
          tournament, 
          playerData, 
          allMatches, 
          now 
        });
        settlementResults.push(result);
      } catch (error) {
        console.error(`结算玩家 ${playerData.uid} 时出错:`, error);
        settlementResults.push({
          uid: playerData.uid,
          rank: playerData.rank,
          score: playerData.highestScore,
          attempts: playerData.totalAttempts,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 6. 更新锦标赛状态
    await txn.patch(tournamentId, {
      status: "completed",
      updatedAt: now.iso
    });

    return { 
      settlementResults,
      totalPlayers: sortedPlayers.length,
      totalMatches: allMatches.length
    };
  });
}

// 处理单个玩家结算
async function processPlayerSettlement(txn: any, { tournament, playerData, allMatches, now }: any) {
  // 获取玩家数据
  const player = await txn
    .query("players")
    .withIndex("by_uid", (q: any) => q.eq("uid", playerData.uid))
    .first();

  if (!player) {
    throw new Error(`玩家 ${playerData.uid} 不存在`);
  }

  const inventory = await txn
    .query("player_inventory")
    .withIndex("by_uid", (q: any) => q.eq("uid", playerData.uid))
    .first();

  if (!inventory) {
    throw new Error(`玩家 ${playerData.uid} 库存不存在`);
  }

  const playerSeason = await txn
    .query("player_seasons")
    .withIndex("by_uid_season", (q: any) =>
      q.eq("uid", playerData.uid).eq("seasonId", tournament.seasonId)
    )
    .first();

  if (!playerSeason) {
    throw new Error(`玩家 ${playerData.uid} 赛季信息不存在`);
  }

  const playerMatches = allMatches.filter((m: any) => m.uid === playerData.uid);

  // 应用规则（在事务中）
  const { rank, finalReward, alreadyRewarded } = await applyRules(txn, {
    tournament,
    uid: playerData.uid,
    matches: playerMatches,
    player,
    inventory,
    playerSeason
  });

  return {
    uid: playerData.uid,
    rank: playerData.rank,
    score: playerData.highestScore,
    attempts: playerData.totalAttempts,
    rewards: finalReward,
    alreadyRewarded
  };
}
```

### 4. 数据库 Schema 增强

```typescript
// 添加奖励记录表
export default defineSchema({
  // ... 其他表
  player_rewards: defineTable({
    tournamentId: v.id("tournaments"),
    uid: v.string(),
    rank: v.number(),
    rewards: v.object({
      coins: v.number(),
      gamePoints: v.number(),
      props: v.array(v.any()),
      tickets: v.array(v.any())
    }),
    createdAt: v.string(),
    updatedAt: v.string()
  })
    .index("by_tournament_uid", ["tournamentId", "uid"])
    .index("by_uid", ["uid"])
    .index("by_tournament", ["tournamentId"])
});
```

### 5. 错误处理和回滚

```typescript
// 事务错误处理
async function safeTransaction(ctx: any, operation: () => Promise<any>) {
  try {
    return await ctx.db.runTransaction(async (txn) => {
      return await operation();
    });
  } catch (error) {
    console.error("事务执行失败:", error);
    
    // 记录错误日志
    await ctx.db.insert("error_logs", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: getTorontoDate().iso,
      operation: "applyRules_transaction"
    });
    
    throw error;
  }
}

// 使用安全事务
export async function applyRules(ctx: any, params: any) {
  return await safeTransaction(ctx, async () => {
    return await applyRulesInternal(ctx, params);
  });
}
```

### 6. 性能优化

```typescript
// 批量处理优化
async function batchApplyRules(txn: any, { tournament, players, allMatches }: any) {
  const results = [];
  
  // 并行处理多个玩家（在事务内）
  const promises = players.map(async (playerData) => {
    try {
      return await processPlayerSettlement(txn, { 
        tournament, 
        playerData, 
        allMatches, 
        now: getTorontoDate() 
      });
    } catch (error) {
      return {
        uid: playerData.uid,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  
  const batchResults = await Promise.all(promises);
  results.push(...batchResults);
  
  return results;
}
```

### 7. 监控和日志

```typescript
// 事务监控
async function applyRulesWithMonitoring(ctx: any, params: any) {
  const startTime = Date.now();
  
  try {
    const result = await applyRules(ctx, params);
    
    // 记录成功日志
    await ctx.db.insert("transaction_logs", {
      operation: "applyRules",
      tournamentId: params.tournament.uid,
      uid: params.uid,
      duration: Date.now() - startTime,
      status: "success",
      timestamp: getTorontoDate().iso
    });
    
    return result;
  } catch (error) {
    // 记录失败日志
    await ctx.db.insert("transaction_logs", {
      operation: "applyRules",
      tournamentId: params.tournament.uid,
      uid: params.uid,
      duration: Date.now() - startTime,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      timestamp: getTorontoDate().iso
    });
    
    throw error;
  }
}
```

## 事务解决方案的优势

### 1. **数据一致性**
- ✅ 所有相关数据更新要么全部成功，要么全部失败
- ✅ 避免部分更新导致的数据不一致
- ✅ 自动回滚机制确保数据完整性

### 2. **并发安全**
- ✅ 防止多个操作同时修改同一数据
- ✅ 事务隔离确保操作原子性
- ✅ 避免竞态条件

### 3. **幂等性**
- ✅ 多次调用不会产生副作用
- ✅ 重复奖励分配检查
- ✅ 状态检查确保操作安全

### 4. **错误处理**
- ✅ 统一的错误处理机制
- ✅ 详细的错误日志记录
- ✅ 优雅的失败处理

### 5. **性能优化**
- ✅ 批量处理减少事务开销
- ✅ 并行处理提高效率
- ✅ 监控和性能分析

## 实施建议

### 1. 渐进式迁移
```typescript
// 第一阶段：添加事务包装
export async function applyRules(ctx: any, params: any) {
  // 保持原有接口，内部使用事务
  return await ctx.db.runTransaction(async (txn) => {
    return await applyRulesInternal(txn, params);
  });
}

// 第二阶段：完全事务化
export async function applyRules(ctx: any, params: any) {
  return await applyRulesWithMonitoring(ctx, params);
}
```

### 2. 测试策略
```typescript
// 单元测试
describe("applyRules transaction", () => {
  it("should handle concurrent calls correctly", async () => {
    // 测试并发调用
  });
  
  it("should rollback on error", async () => {
    // 测试错误回滚
  });
  
  it("should be idempotent", async () => {
    // 测试幂等性
  });
});
```

### 3. 监控指标
- 事务执行时间
- 事务成功率
- 并发冲突次数
- 数据一致性检查

通过这种事务解决方案，可以有效解决 `applyRules` 两次调用的数据一致性问题，确保系统的可靠性和数据完整性。 