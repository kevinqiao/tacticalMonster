# 分数门槛控制系统

## 📋 系统概述

分数门槛控制系统是一个基于Convex数据库的玩家名次概率控制解决方案，通过配置分数门槛和自适应学习机制，精确控制玩家在比赛中的名次分布。

## 🚀 核心特性

- **分数门槛控制**: 根据玩家分数范围设置不同的名次概率
- **自适应学习**: 动态调整概率和学习率，适应玩家表现
- **段位系统**: 支持青铜到钻石的段位配置
- **混合模式**: 结合段位特性和玩家偏好的智能配置
- **数据库驱动**: 完全基于Convex数据库，支持持久化存储

## 📁 文件结构

```
scoreThresholdControl/
├── README.md                           # 本文件
├── USAGE.md                            # 详细使用指南
├── index.ts                            # 主入口文件，导出所有功能
├── schema.ts                           # 数据库模式定义
├── scoreThresholdRankingController.ts  # 核心控制器
├── scoreThresholdIntegration.ts        # 系统集成适配器
├── scoreThresholdExample.ts            # 示例和测试代码

├── configFunctions.ts                  # Convex函数（配置管理）
└── testFunctions.ts                    # Convex函数（测试功能）
```

## 🎯 快速开始

### 1. 初始化玩家
```typescript
import { ScoreThresholdIntegration } from './scoreThresholdControl';

const playerData = await ScoreThresholdIntegration.initializePlayer(ctx, {
  uid: "player_001",
  segmentName: "gold",
  useHybridMode: true
});
```

### 2. 记录比赛结果
```typescript
await ScoreThresholdIntegration.recordMatchResult(ctx, {
  matchId: "match_001",
  uid: "player_001",
  score: 2500,
  rank: 2,
  points: 15
});
```

### 3. 结束比赛
```typescript
const matchResult = await ScoreThresholdIntegration.endMatch(ctx, {
  matchId: "match_001",
  humanPlayerUid: "player_001",
  humanScore: 2800,
  targetRank: 2,
  aiPlayerCount: 3
});
```

## 🔧 配置系统

### 段位配置
- **Bronze (青铜)**: 学习率 0.05，保护等级 2
- **Silver (白银)**: 学习率 0.08，保护等级 2
- **Gold (黄金)**: 学习率 0.12，保护等级 3
- **Platinum (铂金)**: 学习率 0.15，保护等级 3
- **Diamond (钻石)**: 学习率 0.18，保护等级 3

### 分数门槛示例
```typescript
const scoreThresholds = [
  {
    minScore: 0,
    maxScore: 1000,
    rank1Probability: 0.15,
    rank2Probability: 0.25,
    rank3Probability: 0.35,
    rank4Probability: 0.25,
    priority: 1
  }
];
```

## 🧪 测试功能

### 运行示例
```typescript
import { ScoreThresholdExample } from './scoreThresholdControl';

// 运行所有示例
await ScoreThresholdExample.runAllExamples(ctx);

// 运行特定示例
await ScoreThresholdExample.runSpecificExample(ctx, "hybrid");

// 运行快速测试套件
await ScoreThresholdExample.runQuickTestSuite(ctx);
```

### 压力测试
```typescript
const stressTestResult = await ScoreThresholdExample.runStressTest(ctx, {
  playerCount: 100,
  batchSize: 10
});
```

## 📊 数据库表

系统使用以下Convex数据库表：

- `score_threshold_configs` - 分数门槛配置
- `player_performance_metrics` - 玩家性能指标
- `player_protection_status` - 玩家保护状态
- `segment_change_history` - 段位变化历史
- `player_match_records` - 玩家比赛记录
- `score_threshold_match_configs` - 比赛配置

## 🔍 主要API

### 玩家管理
- `initializePlayer()` - 初始化玩家
- `getPlayerStats()` - 获取玩家统计
- `adjustScoreThresholds()` - 调整分数门槛
- `toggleAdaptiveMode()` - 切换自适应模式

### 比赛管理
- `recordMatchResult()` - 记录比赛结果
- `endMatch()` - 结束比赛
- `getActiveMatches()` - 获取活跃比赛

### 系统管理
- `getSystemStatus()` - 获取系统状态
- `getAllPlayers()` - 获取所有玩家
- `resetSystem()` - 重置系统

### 配置管理
- `createHybridModeConfig()` - 创建混合模式配置
- `validateScoreThresholdConfig()` - 验证配置
- `getConfigRecommendations()` - 获取配置建议

## 📈 性能特性

- 支持最多10,000个玩家
- 每个玩家最多10个分数门槛
- 学习率范围：0.01-0.3
- 支持批量操作和并发处理
- 完整的索引优化

## 🛠️ 开发工具

- TypeScript支持
- 完整的类型定义
- 详细的错误处理
- 丰富的日志输出
- 全面的测试覆盖

## 📚 更多信息

详细的使用说明请参考 [USAGE.md](./USAGE.md) 文件。

## 🔄 版本信息

- **版本**: 1.0.0
- **最后更新**: 2024-01-01
- **状态**: 生产就绪

## 📞 支持

如有问题或建议，请查看代码注释或参考使用指南。
