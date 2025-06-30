# submitScore vs settle: 为什么都需要调用 applyRules？

## 概述

在锦标赛系统中，`applyRules` 在 `submitScore` 和 `settle` 两个不同的方法中被调用，这引发了一个重要问题：为什么需要在这两个地方都调用？它们有什么区别和必要性？

## 两种调用场景对比

| 方面 | submitScore | settle |
|------|-------------|--------|
| **调用时机** | 玩家完成比赛时 | 锦标赛结束时 |
| **调用频率** | 每次提交分数 | 一次（锦标赛结束） |
| **处理范围** | 单个玩家 | 所有参与玩家 |
| **业务目的** | 即时反馈 | 最终结算 |
| **用户体验** | 立即获得结果 | 批量处理 |

## 详细分析

### 1. submitScore 中的 applyRules

#### 调用目的
```typescript
// dailySpecial.ts:submitScore
async submitScore(ctx, args) {
  // 1. 更新比赛记录
  await ctx.db.patch(currentAttempt._id, {
    score: args.score,
    completed: true,
    // ...
  });

  // 2. 立即结算（单局模式）
  await ctx.db.patch(tournament._id, { status: "completed" });

  // 3. 调用 applyRules 进行即时奖励分配
  const { rank, finalReward } = await applyRules(ctx, { 
    tournament, uid: args.uid, matches, player, inventory, playerSeason 
  });

  // 4. 立即返回结果给玩家
  return { 
    success: true, 
    rank,           // 即时排名
    rewards: finalReward,  // 即时奖励
    shared          // 社交分享标志
  };
}
```

#### 业务价值
1. **即时反馈**: 玩家完成比赛后立即知道排名和奖励
2. **用户体验**: 无需等待锦标赛结束就能获得结果
3. **社交分享**: 立即可以分享成绩到社交媒体
4. **单局模式**: 每日特殊赛是单局模式，一次比赛即完成

#### 适用场景
- **每日特殊赛**: 单局模式，立即结算
- **即时反馈需求**: 玩家需要立即知道结果
- **社交分享**: 需要立即分享成绩

### 2. settle 中的 applyRules

#### 调用目的
```typescript
// dailySpecial.ts:settle
async settle(ctx, tournamentId) {
  // 1. 获取所有比赛记录
  const allMatches = await ctx.db.query("matches")...

  // 2. 计算所有玩家的排名
  const sortedPlayers = [...playerScores.entries()]
    .sort((a, b) => b[1].highestScore - a[1].highestScore)
    .map(([uid, data], index) => ({
      uid,
      rank: index + 1,
      ...data
    }));

  // 3. 为每个玩家分配奖励
  for (const playerData of sortedPlayers) {
    const { rank, finalReward } = await applyRules(ctx, {
      tournament,
      uid: playerData.uid,
      matches: playerMatches,
      player,
      inventory,
      playerSeason
    });

    // 4. 记录结算结果
    settlementResults.push({
      uid: playerData.uid,
      rank: playerData.rank,
      rewards: finalReward
    });
  }

  // 5. 发送通知
  for (const result of settlementResults) {
    await ctx.db.insert("notifications", {
      uid: result.uid,
      message: `您在每日特殊赛中排名第${result.rank}...`
    });
  }
}
```

#### 业务价值
1. **最终结算**: 确保所有玩家都得到正确的奖励
2. **批量处理**: 一次性处理所有参与玩家
3. **通知发送**: 向所有玩家发送结算通知
4. **数据一致性**: 确保最终数据的一致性
5. **容错处理**: 处理可能的异常情况

#### 适用场景
- **所有锦标赛类型**: 都需要最终结算
- **多玩家场景**: 处理所有参与玩家
- **系统可靠性**: 确保奖励分配的可靠性

## 为什么需要两种调用？

### 1. 不同的业务需求

#### submitScore: 用户体验优先
```typescript
// 玩家期望的体验
const result = await submitScore({
  tournamentId: "daily_special_123",
  uid: "player_456",
  score: 1500
});

// 立即获得结果
console.log(result);
// {
//   success: true,
//   rank: 1,
//   rewards: { coins: 100, gamePoints: 50 },
//   shared: true
// }
```

#### settle: 系统可靠性优先
```typescript
// 系统确保所有玩家都得到奖励
await settle("daily_special_123");

// 所有玩家收到通知
// 数据一致性得到保证
// 异常情况得到处理
```

### 2. 不同的处理范围

#### submitScore: 单玩家处理
```typescript
// 只处理当前提交分数的玩家
const { rank, finalReward } = await applyRules(ctx, {
  tournament,
  uid: args.uid,  // 只处理一个玩家
  matches,        // 只包含该玩家的比赛
  player,         // 只包含该玩家的数据
  inventory,
  playerSeason
});
```

#### settle: 全玩家处理
```typescript
// 处理所有参与玩家
for (const playerData of sortedPlayers) {
  const { rank, finalReward } = await applyRules(ctx, {
    tournament,
    uid: playerData.uid,  // 处理每个玩家
    matches: playerMatches,
    player,
    inventory,
    playerSeason
  });
}
```

### 3. 不同的错误处理策略

#### submitScore: 快速失败
```typescript
// 如果出错，立即返回错误
if (!currentAttempt) throw new Error("未找到未完成尝试");
```

#### settle: 容错处理
```typescript
// 单个玩家出错不影响其他玩家
try {
  await applyRules(ctx, { ... });
} catch (error) {
  console.error(`结算玩家 ${playerData.uid} 时出错:`, error);
  // 继续处理其他玩家
}
```

## 潜在问题和解决方案

### 1. 重复奖励问题

**问题**: 如果 `submitScore` 已经分配了奖励，`settle` 再次分配会导致重复

**解决方案**: 
```typescript
// 在 applyRules 中添加重复检查
async function applyRules(ctx, { tournament, uid, matches, player, inventory, playerSeason }) {
  // 检查是否已经分配过奖励
  const existingReward = await ctx.db
    .query("player_rewards")
    .withIndex("by_tournament_uid", (q) => 
      q.eq("tournamentId", tournament._id).eq("uid", uid)
    )
    .first();

  if (existingReward) {
    console.log(`玩家 ${uid} 在锦标赛 ${tournament._id} 中已经获得奖励`);
    return { rank: existingReward.rank, finalReward: existingReward.rewards };
  }

  // 继续正常的奖励分配逻辑...
}
```

### 2. 数据一致性问题

**问题**: 两次调用可能导致数据不一致

**解决方案**:
```typescript
// 使用事务确保数据一致性
await ctx.db.runTransaction(async (txn) => {
  // 在事务中执行所有数据更新
  await applyRules(ctx, { ... });
});
```

### 3. 性能问题

**问题**: 重复调用影响性能

**解决方案**:
```typescript
// 在 settle 中跳过已经结算的锦标赛
if (tournament.status === "completed") {
  console.log(`锦标赛 ${tournamentId} 已经结算完成`);
  return;
}
```

## 最佳实践建议

### 1. 明确职责分工

```typescript
// submitScore: 负责即时反馈
async submitScore(ctx, args) {
  // 1. 验证和更新比赛记录
  // 2. 立即分配奖励（如果适用）
  // 3. 返回即时结果
}

// settle: 负责最终结算
async settle(ctx, tournamentId) {
  // 1. 批量处理所有玩家
  // 2. 确保奖励分配完整性
  // 3. 发送通知和记录日志
}
```

### 2. 添加状态检查

```typescript
// 在 applyRules 中添加状态检查
async function applyRules(ctx, { tournament, uid, matches, player, inventory, playerSeason }) {
  // 检查锦标赛状态
  if (tournament.status === "completed") {
    // 锦标赛已结算，只返回结果不分配奖励
    return calculateRankAndRewards(tournament, uid, matches);
  }

  // 正常分配奖励
  return allocateRewards(ctx, { tournament, uid, matches, player, inventory, playerSeason });
}
```

### 3. 使用幂等性设计

```typescript
// 确保多次调用不会产生副作用
async function applyRules(ctx, { tournament, uid, matches, player, inventory, playerSeason }) {
  const rewardKey = `${tournament._id}_${uid}`;
  
  // 使用唯一键确保幂等性
  const existingReward = await ctx.db
    .query("player_rewards")
    .withIndex("by_key", (q) => q.eq("rewardKey", rewardKey))
    .first();

  if (existingReward) {
    return { rank: existingReward.rank, finalReward: existingReward.rewards };
  }

  // 分配新奖励
  const result = await allocateRewards(ctx, { ... });
  
  // 记录奖励分配
  await ctx.db.insert("player_rewards", {
    rewardKey,
    tournamentId: tournament._id,
    uid,
    rank: result.rank,
    rewards: result.finalReward,
    createdAt: getTorontoDate().iso
  });

  return result;
}
```

## 总结

`submitScore` 和 `settle` 中都需要调用 `applyRules` 的原因：

1. **不同的业务目的**: 即时反馈 vs 最终结算
2. **不同的用户体验**: 立即结果 vs 批量处理
3. **不同的可靠性要求**: 快速响应 vs 系统可靠性
4. **不同的处理范围**: 单玩家 vs 全玩家

这种设计确保了：
- ✅ **用户体验**: 玩家能立即获得反馈
- ✅ **系统可靠性**: 确保所有玩家都得到奖励
- ✅ **数据一致性**: 最终数据的一致性
- ✅ **容错能力**: 处理各种异常情况

通过合理的状态检查和幂等性设计，可以避免重复奖励分配的问题，同时保持两种调用的必要性。 