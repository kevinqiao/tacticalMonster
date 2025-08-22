# 分数门槛控制系统 (Score Threshold Control System)

## 系统概述

分数门槛控制系统是一个智能化的玩家排名和体验管理系统，专为 1 人类玩家 vs N-1 AI 玩家的比赛场景设计。系统通过分析玩家历史数据，动态调整配置参数，提供个性化的游戏体验。

## 核心特性

### 🎯 智能排名分配
- **动态参与者数量支持**: 支持 4人、6人、8人等不同规模的比赛
- **多模式排名算法**: `score_based`、`segment_based`、`hybrid` 三种模式
- **自适应调整**: 基于玩家表现实时优化排名策略

### 🧠 智能配置优化
- **历史数据分析**: 自动分析胜率趋势、分数稳定性、学习曲线
- **配置自动更新**: 智能调整学习率、排名模式、自适应模式
- **个性化体验**: 为每个玩家提供定制化的游戏体验

### 🛡️ 保护机制
- **段位保护**: 防止玩家快速降级
- **宽限期机制**: 给予玩家调整和恢复的机会
- **动态保护等级**: 基于表现动态调整保护强度

## 系统架构

### 核心组件

```
ScoreThresholdPlayerController (主控制器)
├── HistoricalDataAnalyzer (历史数据分析器)
├── SegmentManager (段位管理器)
└── IntelligentExperienceManager (智能体验管理器)
```

### 数据流

```
比赛结束 → 排名计算 → 数据更新 → 历史分析 → 配置优化 → 体验提升
```

## 核心功能详解

### 1. 排名计算系统

#### 支持的模式
- **`score_based`**: 基于分数的排名，适合分数差异明显的比赛
- **`segment_based`**: 基于段位的排名，考虑玩家当前水平
- **`hybrid`**: 混合模式，结合分数和段位的优势

#### 动态参与者支持
```typescript
// 支持不同数量的参与者
const rankResult = await controller.getRankByScore(uid, score, participantCount);
// participantCount: 4, 6, 8, 10... 等
```

### 2. 历史数据分析器

#### 分析维度
- **胜率趋势**: 比较最近10场与整体胜率，识别进步/退步趋势
- **分数稳定性**: 计算分数方差和变异系数，评估表现稳定性
- **排名分布**: 分析排名分布模式（前重、平衡、后重）
- **学习曲线**: 检测学习速度和平台期，优化学习策略

#### 分析示例
```typescript
const analysis = await historicalDataAnalyzer.analyzePlayerHistory(uid);
// 返回:
// {
//   learningRateAdjustment: 0.05,        // 学习率调整建议
//   rankingModeSuggestion: 'hybrid',     // 排名模式建议
//   adaptiveModeSuggestion: 'learning',  // 自适应模式建议
//   scoreThresholdAdjustments: [...],    // 分数门槛调整建议
//   confidence: 0.85                     // 分析置信度
// }
```

### 3. 智能配置更新

#### 自动触发条件
- 比赛结束后自动触发
- 需要至少5场比赛的历史数据
- 分析置信度 ≥ 0.3

#### 更新策略
```typescript
// 学习率调整
if (winRateAnalysis.trend === 'improving' && learningCurveAnalysis.learningSpeed === 'fast') {
    learningRateAdjustment = 0.05; // 增加学习率
} else if (winRateAnalysis.trend === 'declining' || learningCurveAnalysis.plateauDetected) {
    learningRateAdjustment = -0.03; // 降低学习率
}

// 排名模式建议
if (scoreStabilityAnalysis.stability === 'high' && rankingDistributionAnalysis.distribution === 'top_heavy') {
    rankingModeSuggestion = 'segment_based'; // 稳定且表现好的玩家
} else if (scoreStabilityAnalysis.stability === 'low') {
    rankingModeSuggestion = 'score_based'; // 不稳定的玩家
}
```

## 使用方法

### 1. 基础使用

#### 初始化控制器
```typescript
import { ScoreThresholdPlayerController } from './core/ScoreThresholdPlayerController';

const controller = new ScoreThresholdPlayerController(ctx);
```

#### 获取玩家排名
```typescript
// 单个玩家排名
const rankResult = await controller.getRankByScore(uid, score, participantCount);

// 批量获取排名
const batchResults = await controller.getBatchRanksByScores(playerScores);
```

### 2. 比赛处理

#### 完整比赛流程
```typescript
const matchResult = await controller.processMatchEnd(matchId, playerScores);
// 自动完成:
// 1. 排名计算
// 2. 段位变化检查
// 3. 数据更新
// 4. 智能配置优化
```

#### 比赛结果结构
```typescript
{
    matchId: string,
    rankings: RankingResult[],
    segmentChanges: any[],
    timestamp: string
}
```

### 3. 配置管理

#### 获取玩家配置
```typescript
const config = await controller.getPlayerConfig(uid);
// 包含: learningRate, adaptiveMode, rankingMode, scoreThresholds 等
```

#### 手动更新配置
```typescript
const result = await controller.updatePlayerConfigBasedOnHistory(uid);
if (result.updated) {
    console.log(`配置已更新: ${result.changes.length} 项变更`);
    console.log('变更详情:', result.changes);
}
```

#### 批量配置更新
```typescript
const batchResult = await controller.batchUpdatePlayerConfigs([uid1, uid2, uid3]);
console.log(`批量更新完成: ${batchResult.updated}/${batchResult.total} 成功`);
```

### 4. 智能功能使用

#### 获取优化建议
```typescript
const suggestions = await controller.getPlayerConfigOptimizationSuggestions(uid);
console.log('优化建议:', suggestions.suggestions);
```

#### 段位变化检查
```typescript
const changeResult = await controller.checkSegmentChange(uid, 'promotion');
if (changeResult.shouldChange) {
    console.log('可以升级段位');
}
```

## 配置参数说明

### 学习率 (learningRate)
- **范围**: 0.01 - 0.3
- **作用**: 控制玩家学习新策略的速度
- **调整策略**: 进步快时增加，遇到瓶颈时降低

### 自适应模式 (adaptiveMode)
- **`static`**: 静态模式，配置固定不变
- **`dynamic`**: 动态模式，根据表现实时调整
- **`learning`**: 学习模式，基于历史数据优化

### 排名模式 (rankingMode)
- **`score_based`**: 纯分数排名，适合竞技性强的比赛
- **`segment_based`**: 段位排名，考虑玩家水平差异
- **`hybrid`**: 混合排名，平衡公平性和挑战性

### 分数门槛 (scoreThresholds)
- **动态调整**: 基于分数稳定性自动调整
- **扩展策略**: 不稳定时扩大范围，稳定时收紧范围
- **个性化**: 每个玩家根据历史表现定制

## 数据表结构

### 核心数据表
- **`score_threshold_configs`**: 玩家配置表
- **`player_performance_metrics`**: 性能指标表
- **`player_protection_status`**: 保护状态表
- **`player_match_records`**: 比赛记录表
- **`match_results`**: 比赛结果表

### 索引优化
- **`by_uid`**: 按玩家ID查询
- **`by_segment`**: 按段位查询
- **`by_createdAt`**: 按时间排序
- **`by_score`**: 按分数查询

## 性能优化

### 异步处理
- 配置更新异步执行，不阻塞比赛结果返回
- 批量操作支持，提高处理效率
- 错误隔离，单个玩家失败不影响整体

### 缓存策略
- 玩家配置缓存，减少数据库查询
- 历史数据分析结果缓存，避免重复计算
- 段位规则缓存，提高响应速度

## 错误处理

### 容错机制
- 每个操作都有独立的错误处理
- 失败时提供默认值和降级策略
- 详细的错误日志记录

### 恢复策略
- 配置更新失败时回滚到上次有效配置
- 数据不一致时自动修复
- 网络异常时重试机制

## 监控和调试

### 性能监控
- 排名计算耗时统计
- 配置更新成功率监控
- 数据库查询性能分析

### 调试工具
- 详细的变更日志记录
- 配置更新原因追踪
- 历史数据分析结果展示

## 最佳实践

### 1. 配置更新时机
- 比赛结束后自动触发（推荐）
- 定期批量更新（系统维护）
- 手动触发（特殊需求）

### 2. 参数调优
- 学习率调整幅度控制在 0.01-0.05
- 置信度阈值设置为 0.3-0.5
- 历史数据要求至少 5-10 场比赛

### 3. 性能考虑
- 大量玩家时使用批量操作
- 配置更新使用异步处理
- 定期清理过期数据

## 扩展功能

### 1. 自定义分析器
```typescript
class CustomDataAnalyzer extends HistoricalDataAnalyzer {
    async analyzeCustomMetrics(uid: string) {
        // 实现自定义分析逻辑
    }
}
```

### 2. 自定义配置策略
```typescript
class CustomConfigStrategy {
    generateCustomSuggestions(analysis: any) {
        // 实现自定义配置建议
    }
}
```

### 3. 集成外部系统
- 与段位系统深度集成
- 与任务系统联动
- 与奖励系统结合

## 总结

分数门槛控制系统通过智能化的历史数据分析和配置优化，为每个玩家提供个性化的游戏体验。系统具备高度的自动化程度，能够根据玩家表现实时调整策略，确保游戏的公平性和挑战性。

通过合理使用系统的各项功能，可以有效提升玩家留存率，创造更好的游戏体验。
