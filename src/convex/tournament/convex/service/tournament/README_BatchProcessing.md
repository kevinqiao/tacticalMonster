# 巨量用户批量处理指南

## 概述

对于每日锦标赛（daily tournament）等拥有巨量用户的场景，传统的逐个处理方式会导致性能问题和超时。本指南提供了高效的批量处理解决方案。

## 问题分析

### 传统方式的局限性
```typescript
// 传统方式 - 逐个处理
for (const playerTournament of allPlayerTournaments) {
    await updatePlayerTournamentStatus(ctx, {
        uid: playerTournament.uid,
        tournamentId: playerTournament.tournamentId,
        newStatus: PlayerTournamentStatus.COMPLETED
    });
}
```

**问题**：
- 处理时间过长，可能超时
- 内存占用高
- 数据库连接压力大
- 无法监控进度

### 批量处理方案

## 1. 同步批量处理

### 适用场景
- 用户数量：1,000 - 10,000
- 处理时间：1-5分钟
- 需要实时进度反馈

### 使用方法
```typescript
// 基本使用
const result = await batchCompleteDailyTournament({
    tournamentId: "tournament123",
    batchSize: 100,        // 每批处理100个用户
    maxConcurrency: 5      // 同时处理5个批次
});

console.log("处理结果:", result);
// {
//   success: true,
//   total: 5000,
//   processed: 5000,
//   completed: 3200,
//   expired: 1800,
//   errors: 0,
//   batches: 50,
//   startTime: "2024-01-01T10:00:00Z",
//   endTime: "2024-01-01T10:03:30Z"
// }
```

### 参数说明
- `tournamentId`: 锦标赛ID
- `batchSize`: 每批处理用户数量（默认100）
- `maxConcurrency`: 并发批次数量（默认5）

### 性能优化建议
```typescript
// 根据用户数量调整参数
const userCount = 5000;
let batchSize, maxConcurrency;

if (userCount < 1000) {
    batchSize = 50;
    maxConcurrency = 3;
} else if (userCount < 5000) {
    batchSize = 100;
    maxConcurrency = 5;
} else {
    batchSize = 200;
    maxConcurrency = 3; // 降低并发避免过载
}

const result = await batchCompleteDailyTournament({
    tournamentId: "tournament123",
    batchSize,
    maxConcurrency
});
```

## 2. 异步批量处理

### 适用场景
- 用户数量：10,000+
- 处理时间：5分钟以上
- 需要后台处理，不阻塞主流程

### 使用方法
```typescript
// 启动异步处理
const task = await asyncBatchCompleteDailyTournament({
    tournamentId: "tournament123",
    batchSize: 50,         // 较小的批次大小
    maxConcurrency: 3      // 较低的并发数
});

console.log("任务已启动:", task);
// {
//   success: true,
//   taskId: "task_abc123",
//   message: "批量处理任务已启动，请通过任务ID查询进度"
// }

// 查询处理进度
const status = await getBatchProcessingStatus({
    taskId: "task_abc123"
});

console.log("处理状态:", status);
// {
//   taskId: "task_abc123",
//   status: "running",
//   progress: 45,
//   processed: 2250,
//   completed: 1500,
//   expired: 750,
//   errors: 0,
//   createdAt: "2024-01-01T10:00:00Z",
//   updatedAt: "2024-01-01T10:02:30Z"
// }
```

### 任务状态说明
- `running`: 正在处理中
- `completed`: 处理完成
- `failed`: 处理失败

## 3. 处理策略对比

### 同步处理 vs 异步处理

| 特性 | 同步处理 | 异步处理 |
|------|----------|----------|
| 适用规模 | 1K-10K用户 | 10K+用户 |
| 响应时间 | 实时返回结果 | 立即返回任务ID |
| 进度监控 | 实时进度回调 | 主动查询状态 |
| 错误处理 | 立即发现错误 | 任务完成后检查 |
| 资源占用 | 较高 | 较低 |

### 批次大小选择

```typescript
// 批次大小选择指南
function getOptimalBatchSize(userCount: number): number {
    if (userCount < 500) return 25;
    if (userCount < 1000) return 50;
    if (userCount < 5000) return 100;
    if (userCount < 10000) return 200;
    return 500; // 超大数据量
}

// 并发数选择指南
function getOptimalConcurrency(userCount: number): number {
    if (userCount < 1000) return 3;
    if (userCount < 5000) return 5;
    if (userCount < 10000) return 3;
    return 2; // 超大数据量，降低并发
}
```

## 4. 监控和错误处理

### 进度监控
```typescript
// 同步处理的进度回调
const result = await batchCompleteDailyTournament({
    tournamentId: "tournament123",
    batchSize: 100,
    maxConcurrency: 5,
    progressCallback: (progress) => {
        console.log(`处理进度: ${progress.progress}%`);
        console.log(`已处理: ${progress.processed}/${progress.total}`);
        console.log(`当前批次: ${progress.currentBatch}/${progress.totalBatches}`);
    }
});
```

### 错误处理
```typescript
// 检查处理结果
const result = await batchCompleteDailyTournament({
    tournamentId: "tournament123"
});

if (result.errors > 0) {
    console.warn(`处理完成，但有 ${result.errors} 个错误`);
    
    // 可以重新处理失败的记录
    if (result.errors < result.total * 0.1) {
        console.log("错误率较低，可以接受");
    } else {
        console.error("错误率过高，需要检查");
    }
}
```

### 异步任务监控
```typescript
// 定期检查异步任务状态
async function monitorAsyncTask(taskId: string) {
    const maxAttempts = 60; // 最多检查60次
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const status = await getBatchProcessingStatus({ taskId });
        
        console.log(`任务进度: ${status.progress}%`);
        
        if (status.status === 'completed') {
            console.log("任务完成:", status);
            break;
        } else if (status.status === 'failed') {
            console.error("任务失败:", status.error);
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
        attempts++;
    }
}
```

## 5. 性能优化技巧

### 数据库优化
```typescript
// 1. 使用索引优化查询
// 确保以下索引存在：
// - by_tournament on player_tournaments
// - by_match on player_matches
// - by_tournament on matches

// 2. 批量更新减少数据库调用
const batchUpdates = playerTournaments.map(pt => 
    ctx.db.patch(pt._id, { status: newStatus, updatedAt: now.iso })
);
await Promise.all(batchUpdates);
```

### 内存优化
```typescript
// 1. 分批处理避免内存溢出
const batches = createBatches(allPlayerTournaments, batchSize);
for (const batch of batches) {
    await processBatch(batch);
    // 清理内存
    batch.length = 0;
}

// 2. 使用Set优化查找
const completedPlayers = new Set(completedPlayerIds);
// 比数组查找更快
```

### 并发控制
```typescript
// 1. 限制并发数量避免过载
const maxConcurrency = Math.min(5, Math.ceil(totalPlayers / batchSize));

// 2. 添加延迟避免数据库压力
await new Promise(resolve => setTimeout(resolve, 100));
```

## 6. 实际使用示例

### 每日锦标赛结算
```typescript
// 每日锦标赛自动结算
async function settleDailyTournament(tournamentId: string) {
    const tournament = await getTournamentDetails({ tournamentId });
    
    if (tournament.participantCount > 10000) {
        // 大数据量，使用异步处理
        const task = await asyncBatchCompleteDailyTournament({
            tournamentId,
            batchSize: 50,
            maxConcurrency: 3
        });
        
        // 记录任务ID用于后续监控
        await logSettlementTask(tournamentId, task.taskId);
        
        return {
            success: true,
            message: "异步处理已启动",
            taskId: task.taskId
        };
    } else {
        // 小数据量，使用同步处理
        const result = await batchCompleteDailyTournament({
            tournamentId,
            batchSize: 100,
            maxConcurrency: 5
        });
        
        return {
            success: true,
            message: "处理完成",
            result
        };
    }
}
```

### 批量状态更新
```typescript
// 批量更新过期锦标赛
async function updateExpiredTournaments() {
    const expiredTournaments = await getExpiredTournaments();
    
    for (const tournament of expiredTournaments) {
        if (tournament.participantCount > 5000) {
            // 大数据量使用异步处理
            await asyncBatchCompleteDailyTournament({
                tournamentId: tournament._id,
                batchSize: 100,
                maxConcurrency: 2
            });
        } else {
            // 小数据量使用同步处理
            await batchCompleteDailyTournament({
                tournamentId: tournament._id,
                batchSize: 200,
                maxConcurrency: 3
            });
        }
    }
}
```

## 7. 最佳实践

### 1. 选择合适的处理方式
- **同步处理**：用户数量 < 10,000，需要实时结果
- **异步处理**：用户数量 ≥ 10,000，可以接受延迟

### 2. 参数调优
- **批次大小**：根据用户数量调整，避免内存溢出
- **并发数**：根据数据库性能调整，避免过载

### 3. 监控和告警
- 设置处理时间阈值
- 监控错误率
- 记录处理日志

### 4. 错误恢复
- 支持重新处理失败的记录
- 提供手动干预机制
- 记录详细的错误信息

## 总结

通过合理的批量处理策略，可以有效处理巨量用户的每日锦标赛状态更新：

1. **同步处理**：适合中小规模，提供实时反馈
2. **异步处理**：适合大规模，避免超时和阻塞
3. **参数调优**：根据实际情况调整批次大小和并发数
4. **监控告警**：实时监控处理进度和错误情况
5. **错误恢复**：提供完善的错误处理和恢复机制

这种方案确保了系统在处理巨量用户时的稳定性和效率。 