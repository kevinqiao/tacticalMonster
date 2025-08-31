# ScoreThresholdPlayerController 移除重构

## 概述

在 v3.1.0 版本中，我们移除了 `ScoreThresholdPlayerController.ts`，简化了架构，直接使用 Manager 模式。

## 移除原因

### 1. 功能重复
- `getRecommendedSeeds()` → 直接调用 `SeedRecommendationManager`
- `recommendRankingForScore()` → 直接调用 `RankingRecommendationManager`  
- Controller 实际上只是两个 Manager 的简单包装器

### 2. 职责混乱
- 包含大量历史遗留的复杂逻辑（`HistoricalDataAnalyzer`、`calculateRankings` 等）
- 同时承担配置管理、数据分析、排名计算等多种职责
- 违反单一职责原则

### 3. 架构冗余
- 1885行代码，但核心功能都委托给了两个 Manager
- 大量未被使用的方法和类

## 新的使用方式

### 之前（使用Controller）
```typescript
const controller = new ScoreThresholdPlayerController(ctx);

// 种子推荐
const seeds = await controller.getRecommendedSeeds(uid, options);

// 排名推荐  
const ranking = await controller.recommendRankingForScore(uid, score, participantCount);
```

### 现在（直接使用Manager）
```typescript
// 种子推荐
const seedManager = new SeedRecommendationManager(ctx);
const seeds = await seedManager.recommendSeedsForPlayer(uid, options);

// 排名推荐
const rankingManager = new RankingRecommendationManager(ctx);
const ranking = await rankingManager.generateMatchRankings(humanPlayers, aiCount);
```

## 更新的文件

### 删除的文件
- `core/ScoreThresholdPlayerController.ts` (1885行)

### 更新的文件
- `index.ts` - 移除Controller导出
- `test/RankingRecommendationTest.ts` - 更新测试用例
- `test/TestRunner.ts` - 更新测试逻辑
- `functions/testRankingRecommendation.ts` - 更新Convex函数

## 架构优势

### 1. 简化复杂性
- 移除1885行冗余代码
- 减少一层不必要的抽象

### 2. 清晰职责
- 每个Manager专注单一功能
- 没有中间包装层

### 3. 提升性能
- 减少一层方法调用
- 更直接的数据访问

### 4. 易于维护
- 代码结构更清晰
- 功能边界明确

## 迁移指南

如果你的代码中使用了 `ScoreThresholdPlayerController`，请按以下步骤迁移：

1. **种子推荐**：
   ```typescript
   // 旧代码
   const controller = new ScoreThresholdPlayerController(ctx);
   const result = await controller.getRecommendedSeeds(uid, options);
   
   // 新代码
   const seedManager = new SeedRecommendationManager(ctx);
   const result = await seedManager.recommendSeedsForPlayer(uid, options);
   ```

2. **排名推荐**：
   ```typescript
   // 旧代码
   const controller = new ScoreThresholdPlayerController(ctx);
   const result = await controller.recommendRankingForScore(uid, score, participantCount);
   
   // 新代码
   const rankingManager = new RankingRecommendationManager(ctx);
   const result = await rankingManager.generateMatchRankings(
       [{ uid, score }], 
       participantCount - 1
   );
   const playerResult = result.humanPlayers[0];
   ```

## 版本信息

- **版本**: v3.1.0
- **日期**: 2024年当前日期
- **影响**: Breaking Change
- **迁移难度**: 低（主要是API调用方式变更）
