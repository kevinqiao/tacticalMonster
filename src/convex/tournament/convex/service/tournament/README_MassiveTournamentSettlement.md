# 巨量玩家锦标赛结算处理指南

## 概述

当锦标赛参与者数量巨大（>10,000人）时，传统的结算方式会遇到性能瓶颈。本系统提供了多层级的优化处理策略来高效处理巨量玩家的锦标赛结算。

## 处理策略

### 1. 参与者数量分级处理

```typescript
// 根据参与者数量自动选择处理策略
if (totalPlayers > 10000) {
    // 巨量用户：异步批量处理
    // 适用于 daily tournament 等超大规模场景
} else if (totalPlayers > 1000) {
    // 大量用户：优化同步批量处理
    // 适用于 weekly tournament 等大规模场景
} else {
    // 少量用户：传统处理方式
    // 适用于普通锦标赛
}
```

### 2. 优化处理流程

#### 异步批量处理（>10,000人）
- **特点**: 非阻塞，任务在后台执行
- **适用场景**: Daily tournament 等超大规模场景
- **参数配置**:
  ```typescript
  {
    batchSize: 50,        // 每批处理50个玩家
    maxConcurrency: 3     // 最多3个批次并发
  }
  ```

#### 优化同步批量处理（1,000-10,000人）
- **特点**: 避免一次性获取所有完成玩家列表
- **适用场景**: Weekly tournament 等大规模场景
- **参数配置**:
  ```typescript
  {
    batchSize: 100,       // 每批处理100个玩家
    maxConcurrency: 5     // 最多5个批次并发
  }
  ```

## 核心优化技术

### 1. 避免全量数据加载
```typescript
// ❌ 传统方式：一次性获取所有完成玩家
const completedPlayers = new Set<string>();
for (const match of completedMatches) {
    const playerMatches = await ctx.db.query("player_matches")...
    for (const playerMatch of playerMatches) {
        if (playerMatch.completed) {
            completedPlayers.add(playerMatch.uid);
        }
    }
}

// ✅ 优化方式：分批检查每个玩家
for (const playerTournament of batch) {
    const playerMatches = await ctx.db
        .query("player_matches")
        .withIndex("by_tournament_uid", (q) =>
            q.eq("tournamentId", tournamentId).eq("uid", playerTournament.uid)
        )
        .collect();
    
    let hasCompletedMatch = false;
    for (const playerMatch of playerMatches) {
        if (playerMatch.completed) {
            hasCompletedMatch = true;
            break;
        }
    }
}
```

### 2. 并发控制
```typescript
// 控制并发批次数量，避免资源耗尽
for (let i = 0; i < batches.length; i += maxConcurrency) {
    const currentBatches = batches.slice(i, i + maxConcurrency);
    const batchPromises = currentBatches.map(async (batch) => {
        return await this.processBatch(ctx, { batch, ... });
    });
    await Promise.allSettled(batchPromises);
}
```

### 3. 进度监控
```typescript
// 实时进度报告
console.log(`批次 ${i + maxConcurrency}/${batches.length} 处理完成，进度: ${Math.round((results.processed / results.total) * 100)}%`);
```

## 数据库优化

### 1. 索引优化
```typescript
// 关键索引确保查询性能
player_matches: defineTable({
    // ... 其他字段
}).index("by_tournament_uid", ["tournamentId", "uid"])
  .index("by_match", ["matchId"])
  .index("by_uid", ["uid"])
```

### 2. 批量操作
```typescript
// 使用 Promise.allSettled 确保错误不影响其他批次
const batchResults = await Promise.allSettled(batchPromises);
for (const result of batchResults) {
    if (result.status === 'fulfilled') {
        results.processed += result.value.processed;
        results.completed += result.value.completed;
        // ...
    } else {
        results.errors += batchSize;
        console.error("批次处理失败:", result.reason);
    }
}
```

## 监控和调试

### 1. 任务状态查询
```typescript
// 查询锦标赛结算任务状态
const status = await TournamentService.getTournamentSettlementStatus(ctx, tournamentId);
console.log("任务状态:", status);
```

### 2. 性能指标
```typescript
// 处理结果统计
{
    success: true,
    total: 50000,
    processed: 50000,
    completed: 12000,
    expired: 38000,
    errors: 0,
    batches: 500,
    startTime: "2024-01-01T00:00:00.000Z",
    endTime: "2024-01-01T00:05:30.000Z"
}
```

### 3. 错误处理
```typescript
// 批次级别的错误处理
try {
    await ctx.db.patch(playerTournament._id, {
        status: newStatus,
        updatedAt: now.iso
    });
} catch (error) {
    batchResult.errors++;
    console.error(`处理玩家 ${playerTournament.uid} 状态失败:`, error);
}
```

## 最佳实践

### 1. 参数调优
```typescript
// 根据系统资源调整参数
const params = {
    batchSize: 50,        // 内存受限时减小批次大小
    maxConcurrency: 3,    // CPU受限时减少并发数
    progressCallback: (progress) => {
        console.log(`进度: ${progress.progress}%`);
    }
};
```

### 2. 资源监控
```typescript
// 监控系统资源使用情况
const startTime = Date.now();
// ... 处理逻辑
const duration = Date.now() - startTime;
console.log(`处理耗时: ${duration}ms`);
```

### 3. 日志优化
```typescript
// 减少日志频率，避免日志过多
if (batchNumber % 20 === 0) {
    await this.logStatusChange(ctx, { ... });
}
```

## 故障排除

### 1. 任务卡住
```typescript
// 检查任务状态
const status = await TournamentService.getTournamentSettlementStatus(ctx, tournamentId);
if (status.status === "running" && status.progress === 0) {
    // 任务可能卡住，需要重启
}
```

### 2. 内存不足
```typescript
// 减小批次大小
const params = {
    batchSize: 25,        // 从50减少到25
    maxConcurrency: 2     // 从3减少到2
};
```

### 3. 超时处理
```typescript
// 设置合理的超时时间
const timeout = setTimeout(() => {
    console.error("处理超时");
}, 300000); // 5分钟超时
```

## 扩展性考虑

### 1. 水平扩展
- 支持多实例并行处理
- 任务分片和负载均衡
- 分布式锁机制

### 2. 数据分片
- 按时间范围分片
- 按用户ID范围分片
- 按锦标赛类型分片

### 3. 缓存优化
- Redis缓存热门数据
- 本地缓存减少数据库查询
- 预计算常用统计信息

## 总结

通过以上优化策略，系统能够高效处理巨量玩家的锦标赛结算：

1. **分级处理**: 根据参与者数量自动选择最优策略
2. **批量优化**: 避免全量数据加载，分批处理
3. **并发控制**: 合理控制并发数量，避免资源耗尽
4. **监控完善**: 实时进度监控和错误处理
5. **扩展性强**: 支持水平扩展和参数调优

这些优化确保了系统在处理大规模锦标赛时的稳定性和性能。 