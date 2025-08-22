# 分数门槛控制系统使用指南

## 概述

分数门槛控制系统是一个基于数据库的玩家名次概率控制解决方案，通过配置分数门槛和自适应学习机制，精确控制玩家在比赛中的名次分布。

## 核心特性

- **分数门槛控制**: 根据玩家分数范围设置不同的名次概率
- **自适应学习**: 动态调整概率和学习率，适应玩家表现
- **段位系统**: 支持青铜到钻石的段位配置
- **混合模式**: 结合段位特性和玩家偏好的智能配置
- **数据库驱动**: 完全基于Convex数据库，支持持久化存储

## 快速开始

### 1. 初始化玩家

```typescript
// 使用混合模式初始化玩家
const playerData = await ScoreThresholdIntegration.initializePlayer(ctx, {
  uid: "player_001",
  segmentName: "gold",
  useHybridMode: true
});
```

### 2. 记录比赛结果

```typescript
// 记录一场比赛的结果
await ScoreThresholdIntegration.recordMatchResult(ctx, {
  matchId: "match_001",
  uid: "player_001",
  score: 2500,
  rank: 2,
  points: 15
});
```

### 3. 结束比赛并生成AI分数

```typescript
// 结束比赛，确保玩家获得目标名次
const matchResult = await ScoreThresholdIntegration.endMatch(ctx, {
  matchId: "match_001",
  humanPlayerUid: "player_001",
  humanScore: 2800,
  targetRank: 2, // 目标第2名
  aiPlayerCount: 3
});
```

## 配置系统

### 分数门槛配置

```typescript
const scoreThresholds: ScoreThreshold[] = [
  {
    minScore: 0,
    maxScore: 1000,
    rank1Probability: 0.15,
    rank2Probability: 0.25,
    rank3Probability: 0.35,
    rank4Probability: 0.25,
    priority: 1
  },
  {
    minScore: 1001,
    maxScore: 2000,
    rank1Probability: 0.20,
    rank2Probability: 0.30,
    rank3Probability: 0.30,
    rank4Probability: 0.20,
    priority: 2
  }
];
```

### 段位配置

系统预定义了5个段位的配置：

- **Bronze (青铜)**: 学习率 0.05，保护等级 2
- **Silver (白银)**: 学习率 0.08，保护等级 2
- **Gold (黄金)**: 学习率 0.12，保护等级 3
- **Platinum (铂金)**: 学习率 0.15，保护等级 3
- **Diamond (钻石)**: 学习率 0.18，保护等级 3

### 自适应模式

```typescript
// 启用自适应模式
await ScoreThresholdIntegration.toggleAdaptiveMode(ctx, "player_001");

// 调整学习率
await ScoreThresholdIntegration.adjustScoreThresholds(ctx, {
  uid: "player_001",
  scoreThresholds: [],
  learningRate: 0.15
});
```

## 高级功能

### 批量操作

```typescript
// 批量更新多个玩家配置
const updates = [
  { uid: "player_001", learningRate: 0.12 },
  { uid: "player_002", learningRate: 0.15 },
  { uid: "player_003", adaptiveMode: true }
];

const result = await ScoreThresholdIntegration.batchUpdatePlayerConfigs(ctx, updates);
```

### 系统监控

```typescript
// 获取系统状态概览
const systemStatus = await ScoreThresholdIntegration.getSystemStatus(ctx);
console.log("系统状态:", {
  totalPlayers: systemStatus.totalPlayers,
  activeMatches: systemStatus.activeMatches,
  segmentDistribution: systemStatus.segmentDistribution,
  averageLearningRate: systemStatus.averageLearningRate
});
```

### 配置验证

```typescript
// 验证配置的有效性
const validation = ScoreThresholdIntegration.validateScoreThresholdConfig(config);
if (validation.isValid) {
  console.log("配置有效");
} else {
  console.log("配置错误:", validation.errors);
  console.log("警告:", validation.warnings);
}
```

## 测试和示例

### 运行示例

```typescript
// 运行所有示例
await ScoreThresholdExample.runAllExamples(ctx);

// 运行特定示例
await ScoreThresholdExample.runSpecificExample(ctx, "hybrid");

// 运行快速测试套件
await ScoreThresholdExample.runQuickTestSuite(ctx);
```

### 压力测试

```typescript
// 运行压力测试
const stressTestResult = await ScoreThresholdExample.runStressTest(ctx, {
  playerCount: 100,
  batchSize: 10
});
```

### 清理测试数据

```typescript
// 清理测试数据
await ScoreThresholdExample.cleanupTestData(ctx, "test_");
```

## 配置模板

### 平衡型配置

适合新手玩家，各名次概率相对均衡：

```typescript
{
  scoreThresholds: [
    { minScore: 0, maxScore: 1000, rank1Probability: 0.25, rank2Probability: 0.25, rank3Probability: 0.25, rank4Probability: 0.25, priority: 1 },
    { minScore: 1001, maxScore: 2000, rank1Probability: 0.30, rank2Probability: 0.30, rank3Probability: 0.25, rank4Probability: 0.15, priority: 2 }
  ],
  adaptiveMode: true,
  learningRate: 0.1
}
```

### 激进型配置

适合有经验的玩家，高名次概率：

```typescript
{
  scoreThresholds: [
    { minScore: 0, maxScore: 1000, rank1Probability: 0.40, rank2Probability: 0.35, rank3Probability: 0.20, rank4Probability: 0.05, priority: 1 },
    { minScore: 1001, maxScore: 2000, rank1Probability: 0.45, rank2Probability: 0.30, rank3Probability: 0.20, rank4Probability: 0.05, priority: 2 }
  ],
  adaptiveMode: true,
  learningRate: 0.15
}
```

### 保守型配置

适合追求稳定性的玩家：

```typescript
{
  scoreThresholds: [
    { minScore: 0, maxScore: 1000, rank1Probability: 0.15, rank2Probability: 0.35, rank3Probability: 0.35, rank4Probability: 0.15, priority: 1 },
    { minScore: 1001, maxScore: 2000, rank1Probability: 0.20, rank2Probability: 0.40, rank3Probability: 0.30, rank4Probability: 0.10, priority: 2 }
  ],
  adaptiveMode: false,
  learningRate: 0.05
}
```

## 最佳实践

### 1. 学习率设置

- **新手玩家**: 0.02-0.08，避免配置变化过快
- **中级玩家**: 0.08-0.15，平衡适应性和稳定性
- **高级玩家**: 0.15-0.25，快速适应游戏变化

### 2. 分数门槛设计

- 确保概率总和为1.0
- 避免分数范围重叠
- 合理设置优先级
- 考虑玩家技能分布

### 3. 自适应模式

- 根据玩家表现动态调整
- 监控学习率变化
- 定期评估配置效果
- 避免过度调整

### 4. 段位管理

- 合理设置保护阈值
- 监控段位变化趋势
- 平衡升级和降级机制
- 提供段位奖励激励

## 故障排除

### 常见问题

1. **配置验证失败**
   - 检查概率总和是否为1.0
   - 验证分数范围不重叠
   - 确保优先级设置正确

2. **学习率异常**
   - 检查学习率是否在0.01-0.3范围内
   - 验证自适应模式设置
   - 监控性能指标变化

3. **数据库连接问题**
   - 检查Convex配置
   - 验证表结构完整性
   - 确认索引设置正确

### 调试技巧

```typescript
// 启用详细日志
console.log("玩家数据:", playerData);
console.log("配置验证:", validation);
console.log("系统状态:", systemStatus);

// 使用测试函数验证功能
await ScoreThresholdExample.runQuickTestSuite(ctx);
```

## 性能优化

### 数据库优化

- 合理使用索引
- 避免大量并发写入
- 定期清理历史数据
- 使用批量操作减少数据库调用

### 内存管理

- 及时释放不需要的数据
- 避免内存泄漏
- 使用流式处理大量数据
- 合理设置缓存策略

## 扩展功能

### 自定义段位

```typescript
// 添加自定义段位配置
const customSegmentConfig = {
  scoreThresholds: [...],
  adaptiveMode: true,
  learningRate: 0.20
};
```

### 集成其他系统

```typescript
// 与排行榜系统集成
const leaderboardData = await getLeaderboard(ctx, {
  segmentName: "gold",
  sortBy: "totalPoints",
  limit: 100
});
```

### 数据分析

```typescript
// 获取玩家段位历史
const segmentHistory = await getPlayerSegmentHistory(ctx, "player_001");

// 分析段位变化趋势
const trendAnalysis = analyzeSegmentTrends(segmentHistory);
```

## 总结

分数门槛控制系统提供了一个灵活、可扩展的解决方案，通过合理的配置和自适应机制，能够精确控制玩家的游戏体验。系统设计考虑了性能、可维护性和扩展性，适合各种规模的游戏项目使用。

通过遵循本指南的最佳实践，您可以快速上手并充分利用系统的各项功能，为玩家提供更好的游戏体验。
