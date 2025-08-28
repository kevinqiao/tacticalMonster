# Segment DataAccess.ts 修复说明

## 🎯 修复原因

`segment/dataAccess.ts` 中错误地使用了 `player_performance_metrics` 表，这个表属于分数门槛控制系统，而不是段位系统。这违反了模块化设计原则，导致了架构混乱。

### 问题分析

1. **表结构不匹配**：期望的字段在实际表中不存在
2. **职责混乱**：段位系统访问其他系统的表
3. **架构错误**：违反了模块化设计原则

## 🔄 修复方案

### 修复前的错误架构

```
segment/dataAccess.ts
    ↓
player_performance_metrics (❌ 错误的表)
    ↓
分数门槛控制系统的表
```

### 修复后的正确架构

```
segment/dataAccess.ts
    ↓
player_segments (✅ 正确的段位表)
segment_points_logs (✅ 正确的积分记录表)
match_results (✅ 正确的比赛记录表)
    ↓
段位系统自己的专用表
```

## 🛠️ 具体修复

### 1. 修复的表访问

#### **PlayerSegmentDataAccess 类**

**之前（错误）**：
```typescript
// 使用错误的表
const playerData = await ctx.db
    .query("player_performance_metrics")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
    .unique();

return {
    currentSegment: playerData.segmentName,  // ❌ 字段不存在
    points: playerData.points,               // ❌ 字段不存在
    // ...
};
```

**现在（正确）**：
```typescript
// 使用正确的段位表
const playerSegment = await ctx.db
    .query("player_segments")
    .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", "current"))
    .unique();

return {
    currentSegment: playerSegment.segmentName,  // ✅ 字段存在
    points: playerSegment.rankPoints,          // ✅ 字段存在
    // ...
};
```

### 2. 新增的方法

#### **getPlayerMatchStats 方法**
```typescript
/**
 * 获取玩家比赛统计信息
 * 从 match_results 表获取，而不是跨模块访问
 */
static async getPlayerMatchStats(
    ctx: DatabaseContext,
    uid: string
): Promise<{
    totalMatches: number;
    totalWins: number;
    currentWinStreak: number;
    currentLoseStreak: number;
}> {
    // 从 match_results 表获取比赛统计
    const matches = await ctx.db
        .query("match_results")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .collect();
    
    // 计算统计信息...
}
```

#### **getSegmentPointsStats 方法**
```typescript
/**
 * 获取段位积分统计
 * 从 player_segments 表获取段位积分统计
 */
static async getSegmentPointsStats(
    ctx: DatabaseContext
): Promise<Record<SegmentName, { avgPoints: number; minPoints: number; maxPoints: number }>> {
    const players = await ctx.db
        .query("player_segments")
        .withIndex("by_season", (q: any) => q.eq("seasonId", "current"))
        .collect();
    
    // 计算统计信息...
}
```

### 3. 修复的类型问题

#### **ProtectionLevel 类型**
```typescript
// 之前：缺少类型导入
protectionLevel: number,  // ❌ 类型错误

// 现在：正确导入和使用类型
import { ProtectionLevel } from './types';
protectionLevel: ProtectionLevel,  // ✅ 类型正确
```

## 📊 表结构对比

### 修复前使用的错误表

**player_performance_metrics** (分数门槛控制系统)：
```typescript
{
    uid: v.string(),
    totalMatches: v.number(),
    totalWins: v.number(),
    totalLosses: v.number(),
    totalPoints: v.number(),        // ❌ 不是段位积分
    averageScore: v.number(),
    // ❌ 缺少段位相关字段
}
```

### 修复后使用的正确表

**player_segments** (段位系统)：
```typescript
{
    uid: v.string(),
    segmentName: v.string(),        // ✅ 段位名称
    rankPoints: v.number(),         // ✅ 段位积分
    seasonId: v.string(),           // ✅ 赛季ID
    upgradeHistory: v.array(...),   // ✅ 升级历史
    // ✅ 完整的段位信息
}
```

**segment_points_logs** (段位系统)：
```typescript
{
    uid: v.string(),
    points: v.number(),             // ✅ 积分数量
    source: v.string(),             // ✅ 积分来源
    seasonId: v.string(),           // ✅ 赛季ID
    // ✅ 完整的积分记录
}
```

## 🔧 使用方法

### 获取玩家段位数据

```typescript
import { PlayerSegmentDataAccess } from './dataAccess';

const playerData = await PlayerSegmentDataAccess.getPlayerSegmentData(ctx, uid);
if (playerData) {
    console.log(`玩家段位: ${playerData.currentSegment}`);
    console.log(`段位积分: ${playerData.points}`);
}
```

### 获取玩家比赛统计

```typescript
const matchStats = await PlayerSegmentDataAccess.getPlayerMatchStats(ctx, uid);
console.log(`总比赛数: ${matchStats.totalMatches}`);
console.log(`胜场数: ${matchStats.totalWins}`);
console.log(`连胜: ${matchStats.currentWinStreak}`);
```

### 获取段位分布统计

```typescript
import { StatisticsAccess } from './dataAccess';

const distribution = await StatisticsAccess.getSegmentDistribution(ctx);
console.log(`青铜段位玩家数: ${distribution.bronze}`);
console.log(`白银段位玩家数: ${distribution.silver}`);
```

## 📈 修复优势

### 1. 架构清晰

- **段位系统**：使用自己的专用表
- **分数门槛控制系统**：使用自己的专用表
- **职责分离**：每个系统管理自己的数据

### 2. 数据一致性

- 不再有跨模块的数据访问
- 每个系统维护自己的数据完整性
- 避免了数据不一致的问题

### 3. 易于维护

- 段位相关的修改只需在段位系统中进行
- 分数门槛相关的修改只需在分数门槛系统中进行
- 影响范围可控

### 4. 性能提升

- 使用正确的索引进行查询
- 避免了不必要的跨表连接
- 查询效率更高

## 🚫 注意事项

### 不要做的事情

1. **不要跨模块访问其他系统的表**：违反模块化设计原则
2. **不要在段位系统中使用 `player_performance_metrics`**：这个表不属于段位系统
3. **不要混合不同系统的数据访问逻辑**：保持职责单一

### 应该做的事情

1. **使用段位系统自己的表**：`player_segments`、`segment_points_logs` 等
2. **通过标准接口获取其他系统的数据**：如需要比赛数据，通过 `match_results` 表
3. **保持模块间的清晰边界**：每个系统管理自己的数据

## 📝 总结

通过修复 `segment/dataAccess.ts`，我们实现了：

1. **正确的架构**：段位系统使用自己的专用表
2. **职责清晰**：每个系统管理自己的数据
3. **数据一致**：避免了跨模块数据访问的问题
4. **易于维护**：修改影响范围可控

这种修复使得系统更加健壮、可维护，并且符合模块化设计的最佳实践。段位系统现在完全独立，不再依赖其他系统的表结构。
