# applyRules 重复调用问题修复

## 问题描述

在锦标赛系统中，`applyRules` 方法被重复调用，导致以下问题：

1. **重复奖励分配**: 同一个玩家获得两次奖励
2. **数据不一致**: 两次调用可能导致数据状态不一致
3. **性能浪费**: 重复的数据库操作和计算
4. **逻辑混乱**: 不清楚哪个调用是有效的

## 问题根源

### 调用流程分析

```
tournaments.ts:submitScore 
  ↓
调用 handler.submitScore(ctx, args)  // 调用 dailySpecialHandler.submitScore
  ↓
dailySpecialHandler.submitScore 内部调用 applyRules  // 第一次调用
  ↓
回到 tournaments.ts:submitScore
  ↓
再次调用 applyRules  // 第二次调用 - 重复！
```

### 具体代码位置

1. **tournaments.ts:submitScore** (第115行)
   ```typescript
   if (tournament.tournamentType === "daily_special") {
     // 收集玩家数据...
     const { rank, finalReward } = await applyRules(ctx, {
       tournament, uid: args.uid, matches, player, inventory, playerSeason,
     });
     return { ...result, rank, rewards: finalReward, shared: ... };
   }
   ```

2. **dailySpecial.ts:submitScore** (第35行)
   ```typescript
   await applyRules(ctx, { tournament, uid: args.uid, matches, player, inventory, playerSeason });
   return { success: true, attemptNumber: currentAttempt.attemptNumber };
   ```

## 解决方案

### 1. 移除重复调用

**修改前** (`tournaments.ts`):
```typescript
export const submitScore = mutation({
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    const handler = getHandler(tournament.tournamentType);
    const result = await handler.submitScore(ctx, args);

    if (tournament.tournamentType === "daily_special") {
      // 重复的数据收集和 applyRules 调用
      const player = await ctx.db.query("players")...
      const inventory = await ctx.db.query("player_inventory")...
      const playerSeason = await ctx.db.query("player_seasons")...
      const matches = await ctx.db.query("matches")...

      const { rank, finalReward } = await applyRules(ctx, {
        tournament, uid: args.uid, matches, player, inventory, playerSeason,
      });

      return { ...result, rank, rewards: finalReward, shared: ... };
    }

    return result;
  }
});
```

**修改后** (`tournaments.ts`):
```typescript
export const submitScore = mutation({
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    const handler = getHandler(tournament.tournamentType);
    const result = await handler.submitScore(ctx, args);

    // 移除重复调用，handler 已经处理了所有逻辑
    return result;
  }
});
```

### 2. 增强 Handler 返回值

**修改前** (`dailySpecial.ts`):
```typescript
async submitScore(ctx, args) {
  // ... 处理逻辑
  await applyRules(ctx, { tournament, uid: args.uid, matches, player, inventory, playerSeason });
  return { success: true, attemptNumber: currentAttempt.attemptNumber };
}
```

**修改后** (`dailySpecial.ts`):
```typescript
async submitScore(ctx, args) {
  // ... 处理逻辑
  const { rank, finalReward } = await applyRules(ctx, { 
    tournament, uid: args.uid, matches, player, inventory, playerSeason 
  });

  // 计算是否满足分享条件
  const shared = !!matches.find((m: any) => m.uid === args.uid && m.score >= tournament.config.rules.scoreThreshold);

  return { 
    success: true, 
    attemptNumber: currentAttempt.attemptNumber,
    rank,
    rewards: finalReward,
    shared
  };
}
```

## 修复效果

### 1. 消除重复调用
- ✅ 每个 `submitScore` 操作只调用一次 `applyRules`
- ✅ 避免重复奖励分配
- ✅ 提高性能

### 2. 统一数据流
- ✅ Handler 负责所有业务逻辑
- ✅ 主入口只负责路由和错误处理
- ✅ 清晰的职责分离

### 3. 保持功能完整性
- ✅ 仍然返回排名和奖励信息
- ✅ 保持社交分享功能
- ✅ 维持原有的 API 接口

## 设计原则

### 1. 单一职责原则
- **Handler**: 负责特定锦标赛类型的业务逻辑
- **主入口**: 负责路由、验证和错误处理

### 2. DRY 原则 (Don't Repeat Yourself)
- 避免重复的数据收集逻辑
- 避免重复的规则应用逻辑

### 3. 开闭原则
- 新增锦标赛类型时，只需实现新的 Handler
- 主入口代码无需修改

## 验证方法

### 1. 功能测试
```typescript
// 测试每日特殊赛提交分数
const result = await submitScore({
  tournamentId: "daily_special_tournament_id",
  uid: "player_uid",
  score: 1000,
  // ... 其他参数
});

// 验证返回结果包含所有必要信息
expect(result).toHaveProperty('rank');
expect(result).toHaveProperty('rewards');
expect(result).toHaveProperty('shared');
expect(result).toHaveProperty('success');
```

### 2. 性能测试
- 监控 `applyRules` 调用次数
- 验证奖励分配只发生一次
- 检查数据库操作次数

### 3. 数据一致性测试
- 验证玩家库存更新正确
- 验证赛季积分计算正确
- 验证通知发送正确

## 总结

通过这次修复，我们：

1. **解决了重复调用问题**: 消除了 `applyRules` 的重复调用
2. **优化了架构设计**: 明确了 Handler 和主入口的职责
3. **提高了代码质量**: 遵循了单一职责和 DRY 原则
4. **保持了功能完整性**: 所有原有功能都得到保留

这种修复方式确保了系统的稳定性和可维护性，为后续的功能扩展奠定了良好的基础。 