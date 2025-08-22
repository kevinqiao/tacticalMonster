# Seed难度分析系统

## 系统概述

Seed难度分析系统是一个基于`match_results`数据的智能分析工具，用于统计和分析每个游戏seed（牌序种子）对应的难度系数。通过分析大量玩家的历史比赛数据，系统能够准确评估每个seed的难度水平，为游戏平衡和AI配置提供数据支持。

## 核心功能

### 1. 难度系数计算
- **综合难度评估**：基于多个维度计算0-100的难度系数
- **难度等级分类**：`very_easy`、`easy`、`normal`、`hard`、`very_hard`
- **置信度评估**：基于数据量和质量评估分析结果的可靠性

### 2. 多维度分析
- **基础统计指标**：平均分数、平均排名、胜率、分数分布、排名分布
- **玩家技能影响**：分析seed对不同技能水平（新手、中级、高级）玩家的影响
- **波动性分析**：评估seed的稳定性和随机性
- **一致性评估**：衡量玩家表现的稳定性

### 3. 大数据量处理
- **分页查询**：支持大数据量的分页处理
- **流式处理**：模拟流式处理大量数据
- **批量分析**：同时分析多个seed，提高效率
- **性能优化**：内存使用优化和查询性能提升

## 技术架构

### 数据层
```typescript
// 核心数据表
match_results: {
  seed: string,           // 牌序种子
  score: number,          // 玩家分数
  rank: number,           // 玩家排名
  uid: string,            // 玩家ID
  timestamp: number,      // 时间戳
  // ... 其他字段
}
```

### 分析层
```typescript
class PlayerHistoricalDataManager {
  // 基础分析
  calculateSeedDifficultyCoefficient(seed: string)
  calculateBasicSeedStatistics(matches: any[])
  
  // 高级分析
  calculateSeedVolatility(matches: any[])
  calculateSeedConsistency(matches: any[])
  analyzeSeedPlayerSkillImpact(seed: string)
  
  // 大数据处理
  getSeedMatchHistoryPaginated(seed: string, page: number, pageSize: number)
  processSeedDataStream(seed: string, batchSize: number)
}
```

### 接口层
```typescript
// Convex函数接口
export const analyzeSeedDifficulty = query({ ... })
export const analyzeMultipleSeedDifficulties = query({ ... })
export const getSeedDifficultyReport = query({ ... })
export const processSeedDataStream = query({ ... })
```

## 使用方法

### 1. 基础分析
```typescript
// 分析单个seed的难度
const analysis = await manager.calculateSeedDifficultyCoefficient("seed_001");

// 结果示例
{
  seed: "seed_001",
  difficultyCoefficient: 75,
  difficultyLevel: "hard",
  confidence: 0.85,
  metrics: { ... },
  analysis: { ... }
}
```

### 2. 批量分析
```typescript
// 批量分析多个seed
const seeds = ["seed_001", "seed_002", "seed_003"];
const results = await manager.analyzeMultipleSeedDifficulties(seeds);
```

### 3. 大数据量处理
```typescript
// 分页查询大数据量
const result = await manager.getSeedMatchHistoryPaginated(
  "seed_001", 
  1,        // 页码
  1000,     // 每页大小
  {         // 过滤器
    minScore: 1000,
    maxScore: 9000
  }
);
```

### 4. 获取统计报告
```typescript
// 获取完整的难度统计报告
const report = await manager.getSeedDifficultyReport(true);

// 报告包含
{
  totalSeeds: 1000,
  difficultyDistribution: { "easy": 200, "normal": 500, "hard": 300 },
  averageDifficulty: 58,
  mostDifficultSeeds: ["seed_001", "seed_002"],
  easiestSeeds: ["seed_999", "seed_998"],
  recommendations: [...]
}
```

## 难度计算算法

### 权重配置
```typescript
const weights = {
  averageScore: 0.25,      // 平均分数权重
  winRate: 0.20,           // 胜率权重
  rankDistribution: 0.20,  // 排名分布权重
  playerSkillImpact: 0.20, // 玩家技能影响权重
  volatilityIndex: 0.10,   // 波动性权重
  consistencyScore: 0.05   // 一致性权重
};
```

### 计算流程
1. **分数难度**：`(10000 - 平均分数) / 10000`
2. **胜率难度**：`1 - 胜率`
3. **排名难度**：`1 - 前3名比例`
4. **技能难度**：基于不同技能水平玩家的加权表现
5. **波动性难度**：分数变化的标准差
6. **一致性难度**：`1 - 一致性分数`

### 最终计算
```typescript
const totalDifficulty = 
  scoreDifficulty * weights.averageScore +
  winRateDifficulty * weights.winRate +
  rankDifficulty * weights.rankDistribution +
  skillDifficulty * weights.playerSkillImpact +
  volatilityDifficulty * weights.volatilityIndex +
  consistencyDifficulty * weights.consistencyScore;

return Math.round(totalDifficulty * 100); // 转换为0-100
```

## 性能优化策略

### 1. 分页查询
- 避免一次性加载大量数据
- 支持动态页面大小
- 提供总数和分页信息

### 2. 缓存机制
- 分析结果缓存
- 统计数据缓存
- 基于TTL的缓存失效

### 3. 批量处理
- 分批处理大量seed
- 并发控制避免过载
- 错误隔离和重试机制

### 4. 索引优化
```sql
-- 建议的数据库索引
CREATE INDEX idx_match_results_seed ON match_results(seed);
CREATE INDEX idx_match_results_seed_score ON match_results(seed, score);
CREATE INDEX idx_match_results_seed_rank ON match_results(seed, rank);
CREATE INDEX idx_match_results_seed_created ON match_results(seed, createdAt);
```

## 大数据量处理方案

### 1. 数据量分级
- **小数据量** (< 10,000条): 直接分析
- **中等数据量** (10,000 - 100,000条): 分页查询
- **大数据量** (> 100,000条): 流式处理 + 采样

### 2. 采样策略
```typescript
// 随机采样
private getRandomSample<T>(array: T[], sampleSize: number): T[] {
  if (sampleSize >= array.length) return array;
  
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, sampleSize);
}
```

### 3. 流式处理
```typescript
// 模拟流式处理
async *processSeedDataStream(seed: string, batchSize: number = 1000) {
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const result = await this.getSeedMatchHistoryPaginated(seed, page, batchSize);
    yield result.matches;
    
    hasMore = result.hasMore;
    page++;
  }
}
```

## 监控和维护

### 1. 性能监控
- 查询响应时间
- 内存使用情况
- 并发处理能力

### 2. 数据质量
- 数据完整性检查
- 异常数据识别
- 置信度评估

### 3. 定期维护
- 缓存清理
- 索引优化
- 数据归档

## 使用建议

### 1. 数据准备
- 确保`match_results`表包含`seed`字段
- 为`seed`字段创建适当的索引
- 定期清理过期数据

### 2. 性能调优
- 根据数据量调整分页大小
- 使用缓存减少重复计算
- 监控内存使用，避免OOM

### 3. 分析策略
- 定期分析seed难度分布
- 关注极端难度的seed
- 基于分析结果调整游戏平衡

## 扩展功能

### 1. 实时分析
- 新比赛数据的实时难度评估
- 动态难度调整建议
- 实时性能监控

### 2. 机器学习
- 基于历史数据的难度预测
- 自动难度平衡算法
- 个性化难度推荐

### 3. 可视化
- 难度分布图表
- 趋势分析报告
- 实时监控面板

## 总结

Seed难度分析系统提供了一个完整的解决方案来分析和优化游戏中的牌序难度。通过多维度分析、大数据量处理和性能优化，系统能够准确评估每个seed的难度水平，为游戏平衡和玩家体验提供数据支持。

系统设计考虑了可扩展性和性能，支持从少量数据到海量数据的各种场景，是游戏开发和运营的重要工具。
