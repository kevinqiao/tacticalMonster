# 分数门槛控制系统使用示例

## 快速开始

### 1. 初始化控制器

```typescript
import { ScoreThresholdPlayerController } from './core/ScoreThresholdPlayerController';

// 创建控制器实例
const controller = new ScoreThresholdPlayerController(ctx);
```

### 2. 基础功能使用

#### 获取玩家排名
```typescript
// 单个玩家排名（4人比赛）
const rankResult = await controller.getRankByScore("player_001", 1500, 4);

console.log("排名结果:", {
    rank: rankResult.rank,                    // 最终排名
    probability: rankResult.rankingProbability, // 排名概率
    segment: rankResult.segmentName,          // 段位名称
    protection: rankResult.protectionActive,  // 保护状态
    reason: rankResult.reason                 // 排名原因
});

// 输出示例:
// {
//   rank: 2,
//   probability: 0.5,
//   segment: "silver",
//   protection: false,
//   reason: "良好表现，获得前3名，中高概率预期"
// }
```

#### 批量获取排名
```typescript
// 批量获取多个玩家排名
const playerScores = [
    { uid: "player_001", score: 1500 },
    { uid: "player_002", score: 1400 },
    { uid: "player_003", score: 1300 },
    { uid: "player_004", score: 1200 }
];

const batchResults = await controller.getBatchRanksByScores(playerScores);

console.log("批量排名结果:", batchResults);
// 输出示例:
// [
//   { uid: "player_001", rank: 1, segmentName: "silver", ... },
//   { uid: "player_002", rank: 2, segmentName: "bronze", ... },
//   { uid: "player_003", rank: 3, segmentName: "bronze", ... },
//   { uid: "player_004", rank: 4, segmentName: "bronze", ... }
// ]
```

## 比赛处理

### 1. 完整比赛流程

```typescript
// 处理比赛结束
const matchId = "match_20241201_001";
const playerScores = [
    { uid: "player_001", score: 1500, points: 100 },
    { uid: "player_002", score: 1400, points: 80 },
    { uid: "player_003", score: 1300, points: 60 },
    { uid: "player_004", score: 1200, points: 40 }
];

const matchResult = await controller.processMatchEnd(matchId, playerScores);

console.log("比赛结果:", {
    matchId: matchResult.matchId,
    rankings: matchResult.rankings,
    segmentChanges: matchResult.segmentChanges,
    timestamp: matchResult.timestamp
});

// 输出示例:
// {
//   matchId: "match_20241201_001",
//   rankings: [
//     { uid: "player_001", rank: 1, score: 1500, points: 100, ... },
//     { uid: "player_002", rank: 2, score: 1400, points: 80, ... },
//     { uid: "player_003", rank: 3, score: 1300, points: 60, ... },
//     { uid: "player_004", rank: 4, score: 1200, points: 40, ... }
//   ],
//   segmentChanges: [],
//   timestamp: "2024-12-01T10:30:00.000Z"
// }
```

### 2. 比赛结果分析

```typescript
// 分析比赛结果
const rankings = matchResult.rankings;

// 统计信息
const stats = {
    totalPlayers: rankings.length,
    averageScore: rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length,
    topPlayer: rankings.find(r => r.rank === 1),
    bottomPlayer: rankings.find(r => r.rank === rankings.length)
};

console.log("比赛统计:", stats);
```

## 配置管理

### 1. 获取玩家配置

```typescript
// 获取玩家当前配置
const config = await controller.getPlayerConfig("player_001");

if (config) {
    console.log("玩家配置:", {
        segment: config.segmentName,
        learningRate: config.learningRate,
        adaptiveMode: config.adaptiveMode,
        rankingMode: config.rankingMode,
        maxRank: config.maxRank
    });
} else {
    console.log("玩家配置不存在，创建默认配置");
    const newConfig = await controller.createPlayerDefaultConfig("player_001", "bronze");
    console.log("新配置已创建:", newConfig);
}
```

### 2. 更新玩家配置

```typescript
// 手动更新配置
const updates = {
    learningRate: 0.15,
    adaptiveMode: 'learning' as AdaptiveMode,
    rankingMode: 'hybrid' as RankingMode
};

const success = await controller.updatePlayerConfig("player_001", updates);

if (success) {
    console.log("配置更新成功");
} else {
    console.log("配置更新失败");
}
```

### 3. 重置玩家配置

```typescript
// 重置为段位默认配置
const resetSuccess = await controller.resetPlayerConfig("player_001");

if (resetSuccess) {
    console.log("配置已重置为默认值");
} else {
    console.log("配置重置失败");
}
```

## 历史数据分析

### 1. 智能配置更新

```typescript
// 基于历史数据自动更新配置
const updateResult = await controller.updatePlayerConfigBasedOnHistory("player_001");

if (updateResult.updated) {
    console.log("配置已更新:", {
        changes: updateResult.changes,
        confidence: updateResult.confidence,
        reason: updateResult.reason
    });
    
    // 查看具体变更
    updateResult.changes.forEach(change => {
        console.log(`字段 ${change.field}: ${change.oldValue} → ${change.newValue}`);
        console.log(`原因: ${change.reason}`);
    });
} else {
    console.log("配置无需更新:", updateResult.reason);
}
```

### 2. 获取优化建议

```typescript
// 获取配置优化建议（不实际更新）
const suggestions = await controller.getPlayerConfigOptimizationSuggestions("player_001");

console.log("优化建议:", {
    total: suggestions.suggestions.length,
    confidence: suggestions.confidence,
    lastAnalysis: suggestions.lastAnalysis
});

suggestions.suggestions.forEach(suggestion => {
    console.log(`${suggestion.type}: ${suggestion.current} → ${suggestion.suggested}`);
    console.log(`原因: ${suggestion.reason}`);
    console.log(`优先级: ${suggestion.priority}`);
});
```

### 3. 批量配置更新

```typescript
// 批量更新多个玩家配置
const playerUids = ["player_001", "player_002", "player_003"];

const batchResult = await controller.batchUpdatePlayerConfigs(playerUids);

console.log("批量更新结果:", {
    total: batchResult.total,
    updated: batchResult.updated,
    failed: batchResult.failed
});

// 查看详细结果
batchResult.results.forEach(result => {
    if (result.updated) {
        console.log(`${result.uid}: 更新成功，${result.changes.length} 项变更`);
    } else {
        console.log(`${result.uid}: 更新失败 - ${result.reason}`);
    }
});
```

## 段位管理

### 1. 段位变化检查

```typescript
// 检查是否可以升级
const promotionCheck = await controller.checkSegmentChange("player_001", "promotion");

if (promotionCheck.shouldChange) {
    console.log("玩家可以升级段位");
    console.log("变化类型:", promotionCheck.changeType);
    console.log("原因:", promotionCheck.reason);
} else {
    console.log("玩家不满足升级条件:", promotionCheck.reason);
}

// 检查是否可能降级
const demotionCheck = await controller.checkSegmentChange("player_001", "demotion");

if (demotionCheck.shouldChange) {
    console.log("玩家可能降级段位");
} else {
    console.log("玩家受保护机制保护:", demotionCheck.reason);
}
```

### 2. 获取段位信息

```typescript
// 获取玩家当前段位信息
const segmentInfo = await controller.getPlayerSegmentInfo("player_001");

if (segmentInfo) {
    console.log("当前段位:", segmentInfo.currentSegment);
} else {
    console.log("段位信息不存在");
}
```

## 性能监控

### 1. 获取系统统计

```typescript
// 获取系统整体统计信息
const systemStats = await controller.getSystemStatistics();

if (systemStats) {
    console.log("系统统计:", {
        totalPlayers: systemStats.totalPlayers,
        totalMatches: systemStats.totalMatches,
        timestamp: systemStats.timestamp
    });
}
```

### 2. 获取玩家性能指标

```typescript
// 获取玩家性能指标
const metrics = await controller.getPlayerPerformanceMetrics("player_001");

if (metrics) {
    const winRate = metrics.totalMatches > 0 ? metrics.totalWins / metrics.totalMatches : 0;
    
    console.log("性能指标:", {
        totalMatches: metrics.totalMatches,
        totalWins: metrics.totalWins,
        winRate: `${(winRate * 100).toFixed(1)}%`,
        averageScore: metrics.averageScore,
        lastMatchScore: metrics.lastMatchScore,
        lastMatchRank: metrics.lastMatchRank
    });
}
```

## 高级功能

### 1. 动态参与者数量支持

```typescript
// 支持不同规模的比赛
const testCases = [
    { uid: "player_4", score: 1200, participantCount: 4 },
    { uid: "player_6", score: 1800, participantCount: 6 },
    { uid: "player_8", score: 2500, participantCount: 8 }
];

for (const testCase of testCases) {
    const result = await controller.getRankByScore(
        testCase.uid, 
        testCase.score, 
        testCase.participantCount
    );
    
    console.log(`${testCase.participantCount}人比赛 - ${testCase.uid}: 第${result.rank}名`);
}
```

### 2. 保护状态管理

```typescript
// 获取玩家保护状态
const protectionStatus = await controller.getPlayerProtectionStatus("player_001");

if (protectionStatus) {
    console.log("保护状态:", {
        protectionLevel: protectionStatus.protectionLevel,
        gracePeriod: protectionStatus.gracePeriod,
        protectionDuration: protectionStatus.protectionDuration,
        isActive: protectionStatus.isActive
    });
}
```

## 错误处理示例

### 1. 基础错误处理

```typescript
try {
    const result = await controller.getRankByScore("player_001", 1500);
    console.log("排名结果:", result);
} catch (error) {
    console.error("获取排名失败:", error instanceof Error ? error.message : String(error));
    
    // 提供默认值
    const defaultResult = {
        rank: 4,
        rankingProbability: 0.1,
        segmentName: 'bronze' as SegmentName,
        protectionActive: false,
        reason: '排名计算失败，使用默认排名'
    };
    
    console.log("使用默认结果:", defaultResult);
}
```

### 2. 批量操作错误处理

```typescript
const playerScores = [
    { uid: "player_001", score: 1500 },
    { uid: "player_002", score: 1400 },
    { uid: "invalid_player", score: -100 } // 无效数据
];

try {
    const results = await controller.getBatchRanksByScores(playerScores);
    console.log("批量排名成功:", results);
} catch (error) {
    console.error("批量排名失败:", error instanceof Error ? error.message : String(error));
    
    // 逐个处理，忽略失败的项目
    const validResults = [];
    for (const player of playerScores) {
        try {
            const result = await controller.getRankByScore(player.uid, player.score);
            validResults.push({ uid: player.uid, ...result });
        } catch (playerError) {
            console.warn(`玩家 ${player.uid} 排名计算失败:`, playerError);
            // 添加默认排名
            validResults.push({
                uid: player.uid,
                rank: playerScores.length,
                rankingProbability: 0.1,
                segmentName: 'bronze' as SegmentName,
                protectionActive: false,
                reason: '排名计算失败，使用默认排名'
            });
        }
    }
    
    console.log("部分成功的结果:", validResults);
}
```

## 集成示例

### 1. 与段位系统集成

```typescript
// 检查段位变化并更新
async function handleSegmentChange(uid: string, points: number) {
    try {
        // 检查段位变化
        const changeResult = await controller.checkSegmentChange(uid, "promotion");
        
        if (changeResult.shouldChange) {
            // 更新段位
            await controller.updatePlayerConfig(uid, {
                segmentName: changeResult.newSegment as SegmentName
            });
            
            console.log(`玩家 ${uid} 段位已更新: ${changeResult.oldSegment} → ${changeResult.newSegment}`);
            
            // 重置相关配置
            await controller.resetPlayerConfig(uid);
            
            return {
                success: true,
                message: `恭喜！您已从 ${changeResult.oldSegment} 升级到 ${changeResult.newSegment}！`
            };
        }
        
        return { success: false, message: "不满足升级条件" };
    } catch (error) {
        console.error("处理段位变化失败:", error);
        return { success: false, message: "处理失败" };
    }
}
```

### 2. 与任务系统集成

```typescript
// 基于排名结果分配任务
async function assignTasksBasedOnRanking(rankings: RankingResult[]) {
    const taskAssignments = [];
    
    for (const ranking of rankings) {
        let taskType = 'practice';
        let taskDifficulty = 'normal';
        
        // 根据排名分配任务
        if (ranking.rank === 1) {
            taskType = 'challenge';
            taskDifficulty = 'hard';
        } else if (ranking.rank <= 3) {
            taskType = 'improve';
            taskDifficulty = 'medium';
        } else {
            taskType = 'practice';
            taskDifficulty = 'easy';
        }
        
        // 根据保护状态调整
        if (ranking.protectionActive) {
            taskDifficulty = 'easy';
        }
        
        taskAssignments.push({
            uid: ranking.uid,
            taskType,
            taskDifficulty,
            reason: `基于排名 ${ranking.rank} 分配`
        });
    }
    
    return taskAssignments;
}
```

## 性能优化建议

### 1. 批量操作

```typescript
// 推荐：使用批量操作
const batchResults = await controller.getBatchRanksByScores(playerScores);

// 不推荐：逐个查询
for (const player of playerScores) {
    const result = await controller.getRankByScore(player.uid, player.score);
    // 这样会产生多次数据库查询
}
```

### 2. 异步处理

```typescript
// 推荐：异步更新配置，不阻塞主流程
const matchResult = await controller.processMatchEnd(matchId, playerScores);

// 配置更新在后台异步进行
console.log("比赛结果已返回，配置更新在后台进行");

// 不推荐：同步等待配置更新
await controller.autoUpdatePlayerConfigsAfterMatch(matchResult.rankings);
console.log("配置更新完成，比赛结果返回");
```

### 3. 错误隔离

```typescript
// 推荐：错误隔离，单个失败不影响整体
const results = [];
for (const player of playerScores) {
    try {
        const result = await controller.getRankByScore(player.uid, player.score);
        results.push(result);
    } catch (error) {
        console.warn(`玩家 ${player.uid} 处理失败:`, error);
        // 添加默认结果，不中断流程
        results.push(getDefaultRanking(player.uid));
    }
}

// 不推荐：一个失败就中断整个流程
const results = await Promise.all(
    playerScores.map(player => 
        controller.getRankByScore(player.uid, player.score)
    )
);
```

## 总结

通过这些使用示例，您可以：

1. **快速上手**: 了解系统的基本使用方法
2. **深入使用**: 掌握高级功能和最佳实践
3. **错误处理**: 学会如何处理各种异常情况
4. **性能优化**: 了解如何提高系统性能
5. **系统集成**: 学会如何与其他系统集成

记住，系统设计为高度自动化，大部分情况下您只需要调用 `processMatchEnd` 方法，系统就会自动完成所有必要的操作。对于特殊需求，可以使用相应的手动方法进行精确控制。
