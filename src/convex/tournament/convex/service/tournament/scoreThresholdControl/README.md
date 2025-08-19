# 分数门槛控制系统 (Score Threshold Control System)

## 📖 系统概述

分数门槛控制系统是一个智能的玩家排名和段位管理系统，支持动态N名次配置、自适应排名算法和段位保护机制。系统采用分层架构设计，将系统级操作和玩家级操作分离，提供清晰的API接口和类型安全。

## ✨ 主要特性

- 🎯 **动态N名次配置**：支持3-6名次的灵活配置
- 🧠 **自适应排名算法**：静态、动态、学习三种模式
- 🛡️ **段位保护机制**：防止玩家快速降级
- 📊 **实时统计监控**：系统级和玩家级数据统计
- 🔧 **灵活配置管理**：支持个性化配置调整
- 🚀 **高性能架构**：优化的数据库查询和批量操作

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Convex Functions                        │
│              (scoreThresholdFunctions.ts)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │ ScoreThreshold      │  │ ScoreThreshold              │  │
│  │ SystemController    │  │ PlayerController            │  │
│  │ (系统级操作)         │  │ (玩家级操作)                │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Segment System                          │
│              (段位管理系统集成)                             │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                          │
│              (Convex Database)                            │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 安装依赖

确保项目已安装必要的依赖：

```bash
npm install convex
```

### 2. 导入控制器

```typescript
import { ScoreThresholdSystemController } from './ScoreThresholdSystemController';
import { ScoreThresholdPlayerController } from './ScoreThresholdPlayerController';
```

### 3. 基本使用

#### 系统级操作

```typescript
// 创建系统级控制器
const systemController = new ScoreThresholdSystemController(ctx);

// 处理比赛结束
const matchResult = await systemController.processMatchEnd(matchId, playerScores);

// 获取系统统计
const systemStats = await systemController.getSystemStatistics();
```

#### 玩家级操作

```typescript
// 创建玩家级控制器
const playerController = new ScoreThresholdPlayerController(ctx);

// 获取玩家配置
const playerConfig = await playerController.getPlayerConfig(uid);

// 检查升级条件
const canPromote = await playerController.canPlayerPromote(uid);
```

## 📚 API 参考

### ScoreThresholdSystemController

#### 核心方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `processMatchEnd` | 处理比赛结束 | `matchId`, `playerScores` | `MatchRankingResult` |
| `getSystemStatistics` | 获取系统统计 | 无 | `SystemStatistics` |
| `updatePlayerConfig` | 更新玩家配置 | `uid`, `updates` | `boolean` |
| `resetPlayerConfig` | 重置玩家配置 | `uid` | `boolean` |
| `getBatchRanksByScores` | 批量获取排名 | `playerScores` | 排名信息数组 |

#### 使用示例

```typescript
// 处理比赛结束
const result = await systemController.processMatchEnd("match_001", [
    { uid: "player_1", score: 2500, points: 15 },
    { uid: "player_2", score: 2300, points: 10 },
    { uid: "player_3", score: 2100, points: 5 }
]);

console.log("比赛结果:", result.rankings);
console.log("段位变化:", result.segmentChanges);

// 批量获取多个玩家排名
const batchRanks = await systemController.getBatchRanksByScores([
    { uid: "player_001", score: 2500 },
    { uid: "player_002", score: 2300 },
    { uid: "player_003", score: 2100 }
]);

console.log("批量排名结果:", batchRanks);
```

### ScoreThresholdPlayerController

#### 核心方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getPlayerConfig` | 获取玩家配置 | `uid` | `ScoreThresholdConfig` |
| `getPlayerPerformanceMetrics` | 获取性能指标 | `uid` | `PlayerPerformanceMetrics` |
| `canPlayerPromote` | 检查升级条件 | `uid` | `boolean` |
| `shouldPlayerDemote` | 检查降级条件 | `uid` | `boolean` |
| `calculatePlayerWinRate` | 计算胜率 | `uid` | `number` |
| **`getRankByScore`** | **根据分数获取排名** | **`uid`, `score`, `matchId?`** | **排名信息对象** |

#### 使用示例

```typescript
// 获取玩家完整信息
const config = await playerController.getPlayerConfig("player_001");
const metrics = await playerController.getPlayerPerformanceMetrics("player_001");
const canPromote = await playerController.canPlayerPromote("player_001");

console.log("玩家配置:", config);
console.log("性能指标:", metrics);
console.log("可升级:", canPromote);

// 🆕 根据分数获取单个玩家排名
const rankInfo = await playerController.getRankByScore("player_001", 2500);
console.log("玩家排名:", {
    rank: rankInfo.rank,
    probability: rankInfo.rankingProbability,
    segment: rankInfo.segmentName,
    protection: rankInfo.protectionActive,
    reason: rankInfo.reason
});
```

## ⚙️ 配置说明

### 排名模式 (RankingMode)

- **`score_based`**: 基于分数的排名
- **`segment_based`**: 基于段位的排名  
- **`hybrid`**: 混合模式（分数+段位）

### 自适应模式 (AdaptiveMode)

- **`static`**: 静态模式，固定概率
- **`dynamic`**: 动态模式，添加随机性
- **`learning`**: 学习模式，根据学习率调整

### 段位配置

系统支持7个段位：
- Bronze (青铜) → Silver (白银)
- Silver (白银) → Gold (黄金)
- Gold (黄金) → Platinum (铂金)
- Platinum (铂金) → Diamond (钻石)
- Diamond (钻石) → Master (大师)
- Master (大师) → Grandmaster (宗师)

## 🔧 高级功能

### 动态N名次配置

```typescript
// 支持5名次的配置示例
const config = {
    maxRank: 5,
    baseRankingProbability: [0.30, 0.25, 0.20, 0.15, 0.10],
    scoreThresholds: [
        {
            minScore: 0,
            maxScore: 1000,
            rankingProbabilities: [0.10, 0.20, 0.30, 0.25, 0.15],
            priority: 1
        }
    ]
};
```

### 段位保护机制

```typescript
// 保护配置示例
const protectionConfig = {
    protectionThreshold: 5,        // 保护阈值
    demotionGracePeriod: 7,       // 降级宽限期
    promotionStabilityPeriod: 5,  // 升级稳定期
    maxProtectionLevel: 3         // 最大保护等级
};
```

## 📊 数据模型

### 核心接口

```typescript
interface ScoreThresholdConfig {
    _id?: string;
    uid: string;
    segmentName: SegmentName;
    scoreThresholds: ScoreThreshold[];
    baseRankingProbability: number[];
    maxRank: number;
    adaptiveMode: AdaptiveMode;
    learningRate: number;
    autoAdjustLearningRate: boolean;
    rankingMode: RankingMode;
    createdAt: string;
    updatedAt: string;
}

interface PlayerPerformanceMetrics {
    uid: string;
    segmentName: SegmentName;
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    totalPoints: number;
    averageScore: number;
    currentWinStreak: number;
    currentLoseStreak: number;
    bestScore: number;
    worstScore: number;
    lastUpdated: string;
}
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "ScoreThreshold"
```

### 测试示例

```typescript
// 测试比赛处理
describe('ScoreThresholdSystemController', () => {
    it('should process match end correctly', async () => {
        const controller = new ScoreThresholdSystemController(mockCtx);
        const result = await controller.processMatchEnd("test_match", [
            { uid: "player_1", score: 2500, points: 15 }
        ]);
        
        expect(result.rankings).toHaveLength(1);
        expect(result.rankings[0].rank).toBe(1);
    });
});
```

## 🚨 错误处理

### 常见错误

1. **配置验证失败**
   ```typescript
   try {
       await controller.updatePlayerConfig(uid, invalidConfig);
   } catch (error) {
       console.error("配置验证失败:", error.message);
   }
   ```

2. **玩家数据不存在**
   ```typescript
   const config = await controller.getPlayerConfig(uid);
   if (!config) {
       console.warn("玩家配置不存在，创建默认配置");
       await controller.createPlayerDefaultConfig(uid, 'bronze');
   }
   ```

### 错误恢复

```typescript
// 自动恢复机制
const result = await controller.processMatchEnd(matchId, playerScores)
    .catch(async (error) => {
        console.error("比赛处理失败，尝试恢复:", error);
        // 执行恢复逻辑
        return await controller.recoverMatchProcessing(matchId);
    });
```

## 📈 性能优化

### 数据库优化

1. **索引配置**
   ```sql
   -- 确保关键字段有索引
   CREATE INDEX idx_player_uid ON player_score_threshold_configs(uid);
   CREATE INDEX idx_match_uid ON player_match_records(uid);
   ```

2. **批量操作**
   ```typescript
   // 使用批量操作提高性能
   const results = await controller.batchProcessMatches(matches);
   ```

### 缓存策略

```typescript
// 实现简单的内存缓存
class ConfigCache {
    private cache = new Map<string, ScoreThresholdConfig>();
    
    async get(uid: string): Promise<ScoreThresholdConfig | null> {
        if (this.cache.has(uid)) {
            return this.cache.get(uid)!;
        }
        
        const config = await this.fetchFromDB(uid);
        if (config) {
            this.cache.set(uid, config);
        }
        return config;
    }
}
```

## 🔮 未来规划

### 短期目标 (1-2个月)
- [ ] 完善单元测试覆盖
- [ ] 添加性能监控指标
- [ ] 优化数据库查询性能

### 中期目标 (3-6个月)
- [ ] 实现机器学习排名算法
- [ ] 添加A/B测试支持
- [ ] 开发管理后台界面

### 长期目标 (6-12个月)
- [ ] 支持多游戏模式
- [ ] 实现跨服段位系统
- [ ] 集成AI助手功能

## 📞 支持与反馈

### 问题报告

如果遇到问题，请提供以下信息：
1. 错误信息和堆栈跟踪
2. 复现步骤
3. 环境信息（Node.js版本、Convex版本等）
4. 相关代码片段

### 贡献指南

欢迎贡献代码！请遵循以下步骤：
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

### 联系方式

- 📧 Email: [your-email@example.com]
- 🐛 Issues: [GitHub Issues]
- 📖 文档: [项目Wiki]

---

**分数门槛控制系统** - 让游戏排名更智能，让玩家体验更精彩！🎮✨

### Convex函数使用示例
```typescript
// 在Convex函数中使用系统级控制器
export const processMatchEnd = mutation({
    args: { matchId: v.string(), playerScores: v.array(v.object({...})) },
    handler: async (ctx, args) => {
        const controller = new ScoreThresholdSystemController(ctx);
        return await controller.processMatchEnd(args.matchId, args.playerScores);
    }
});

// �� 在Convex函数中查询单个玩家排名（使用玩家级控制器）
export const getPlayerRank = query({
    args: { uid: v.string(), score: v.number() },
    handler: async (ctx, args) => {
        const controller = new ScoreThresholdPlayerController(ctx);
        return await controller.getRankByScore(args.uid, args.score);
    }
});

// 🆕 在Convex函数中批量查询玩家排名（使用系统级控制器）
export const getBatchPlayerRanks = query({
    args: { playerScores: v.array(v.object({ uid: v.string(), score: v.number() })) },
    handler: async (ctx, args) => {
        const controller = new ScoreThresholdSystemController(ctx);
        return await controller.getBatchRanksByScores(args.playerScores);
    }
});

// 在Convex函数中使用玩家级控制器
export const getPlayerStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const controller = new ScoreThresholdPlayerController(ctx);
        const config = await controller.getPlayerConfig(args.uid);
        const metrics = await controller.getPlayerPerformanceMetrics(args.uid);
        return { config, metrics };
    }
});
