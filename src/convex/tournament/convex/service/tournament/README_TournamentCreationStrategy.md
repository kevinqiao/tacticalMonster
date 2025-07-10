# 锦标赛创建策略

## 🎯 **策略概述**

采用**玩家加入前调用 + crons预创建 + 并发安全**的混合策略，确保锦标赛系统的可靠性和性能。

## 📋 **实现方案**

### 1. **玩家加入前调用**

#### 1.1 在 `joinTournament` 中调用
```typescript
// 在玩家加入前确保锦标赛存在
await this.ensureTournamentExists(ctx, {
    uid: params.uid,
    gameType: params.gameType,
    tournamentType: params.tournamentType,
    player,
    season,
    now
});
```

#### 1.2 并发安全检查
```typescript
private static async ensureTournamentExists(ctx: any, params: any) {
    // 检查是否需要创建锦标赛
    if (await this.shouldCreateTournament(ctx, { tournamentType, season, now })) {
        // 再次检查是否已被其他进程创建
        const existingTournament = await this.findExistingTournament(ctx, {
            tournamentType, season, now
        });

        if (!existingTournament) {
            // 创建锦标赛
            await this.createTournamentIfNeeded(ctx, {
                tournamentType, season, player, now
            });
        }
    }
}
```

### 2. **Crons预创建**

#### 2.1 每日锦标赛预创建
```typescript
// 每日凌晨 00:00 预创建每日锦标赛
crons.daily(
    "pre-create daily tournaments",
    { hourUTC: 0, minuteUTC: 0 },
    internal.service.tournament.tournamentScheduler.createDailyTournaments
);
```

#### 2.2 每周锦标赛预创建
```typescript
// 每周一凌晨 00:00 预创建每周锦标赛
crons.weekly(
    "pre-create weekly tournaments",
    { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
    internal.service.tournament.tournamentScheduler.createWeeklyTournaments
);
```

#### 2.3 赛季锦标赛预创建
```typescript
// 每月第一天凌晨 00:00 预创建赛季锦标赛
crons.monthly(
    "pre-create seasonal tournaments",
    { day: 1, hourUTC: 0, minuteUTC: 0 },
    internal.service.tournament.tournamentScheduler.createSeasonalTournaments
);
```

### 3. **并发安全机制**

#### 3.1 重复检查
```typescript
// 在创建前检查是否已存在
const existingTournament = await this.findExistingTournament(ctx, params);
if (!existingTournament) {
    await this.createTournament(ctx, params);
}
```

#### 3.2 时间范围检查
```typescript
// 根据锦标赛类型检查时间范围
switch (tournamentType.category) {
    case "daily":
        return await this.findDailyTournament(ctx, { tournamentType, now });
    case "weekly":
        return await this.findWeeklyTournament(ctx, { tournamentType, now });
    case "seasonal":
        return await this.findSeasonalTournament(ctx, { tournamentType, season });
}
```

## 🔄 **工作流程**

### 1. **正常流程**
```
玩家加入锦标赛 → 检查锦标赛是否存在 → 不存在则创建 → 继续加入逻辑
```

### 2. **预创建流程**
```
定时任务触发 → 检查关键锦标赛 → 不存在则创建 → 等待玩家加入
```

### 3. **并发处理**
```
多个玩家同时加入 → 检查现有锦标赛 → 只有一个创建成功 → 其他玩家使用已创建的
```

## ✅ **优势**

### 1. **性能优化**
- 减少不必要的锦标赛创建
- 避免查询时的自动创建延迟
- 预创建关键锦标赛提高响应速度

### 2. **并发安全**
- 避免重复创建锦标赛
- 使用检查机制确保唯一性
- 错误处理不影响玩家体验

### 3. **用户体验**
- 关键锦标赛预创建，减少等待时间
- 按需创建其他锦标赛，节省资源
- 错误处理确保流程不中断

## ⚠️ **注意事项**

### 1. **错误处理**
```typescript
try {
    await this.createTournament(ctx, params);
} catch (error) {
    console.error(`创建锦标赛失败:`, error);
    // 不抛出错误，让玩家继续尝试加入
}
```

### 2. **日志记录**
```typescript
console.log(`锦标赛 ${tournamentType} 已创建`);
console.log(`锦标赛 ${tournamentType} 已存在，跳过创建`);
```

### 3. **监控指标**
- 锦标赛创建成功率
- 并发创建冲突次数
- 玩家加入响应时间

## 🎮 **使用示例**

### 1. **玩家加入锦标赛**
```typescript
const result = await joinTournament({
    uid: "player123",
    gameType: "solitaire",
    tournamentType: "daily_special"
});
// 自动确保锦标赛存在，然后加入
```

### 2. **查看可用锦标赛**
```typescript
const tournaments = await getAvailableTournaments({
    uid: "player123",
    gameType: "solitaire"
});
// 返回现有锦标赛列表，不自动创建
```

### 3. **手动创建锦标赛**
```typescript
await createTournamentsIfNeeded({
    uid: "player123",
    gameType: "solitaire"
});
// 手动触发创建缺失的锦标赛
```

## 📊 **监控和调试**

### 1. **日志监控**
```typescript
// 监控锦标赛创建
console.log(`开始创建每日锦标赛 - ${today}`);
console.log(`已创建每日锦标赛: ${config.typeId}`);
console.log(`每日锦标赛已存在: ${config.typeId}`);
```

### 2. **错误处理**
```typescript
// 记录创建失败
console.error(`创建每日锦标赛失败 (${config.typeId}):`, error);
```

### 3. **性能指标**
- 锦标赛创建时间
- 并发冲突次数
- 玩家加入成功率

这个策略确保了锦标赛系统的可靠性、性能和用户体验的最佳平衡。 