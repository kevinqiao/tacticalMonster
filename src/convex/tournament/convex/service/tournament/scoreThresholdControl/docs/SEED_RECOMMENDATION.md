# 种子推荐系统使用指南

## 概述

种子推荐系统基于玩家的技能等级和偏好，智能推荐相应难度的种子，确保玩家获得最佳的游戏体验。

## 核心功能

### 1. 玩家技能等级评估

系统自动分析玩家的历史表现，评估技能等级：

- **Bronze**: 新手玩家
- **Silver**: 初级玩家  
- **Gold**: 中级玩家
- **Platinum**: 高级玩家
- **Diamond**: 专家玩家

**评估标准**：
- 最近20场比赛的平均排名
- 胜率（第一名次数/总比赛数）
- 数据量要求：至少5场比赛

### 2. 种子难度分级

基于历史数据分析，将种子分为5个难度等级：

- **Very Easy**: 难度系数 < 0.7
- **Easy**: 难度系数 0.7-0.9
- **Normal**: 难度系数 0.9-1.1
- **Hard**: 难度系数 1.1-1.3
- **Very Hard**: 难度系数 > 1.3

**难度系数计算**：
```
难度系数 = 1000 / 平均分数
```

### 3. 智能推荐策略

#### 推荐偏好类型

- **Challenge**: 挑战模式 - 推荐更高难度的种子
- **Balanced**: 平衡模式 - 推荐匹配当前技能等级的种子
- **Practice**: 练习模式 - 推荐较低难度的种子

#### 推荐映射表

| 玩家等级 | Challenge | Balanced | Practice |
|---------|-----------|----------|----------|
| Bronze  | Normal    | Easy     | Very Easy|
| Silver  | Hard      | Normal   | Easy     |
| Gold    | Very Hard | Hard     | Normal   |
| Platinum| Very Hard | Hard     | Normal   |
| Diamond | Very Hard | Hard     | Normal   |

## 使用方法

### 1. 基本推荐

```typescript
// 获取玩家推荐种子
const recommendation = await ctx.runQuery(
    "scoreThresholdControl:recommendSeedsBySkill",
    {
        uid: "player123",
        preferredDifficulty: "balanced", // 可选: challenge, balanced, practice
        limit: 5 // 可选，默认5个
    }
);

console.log(recommendation);
// 输出示例：
// {
//   success: true,
//   playerSkillLevel: "gold",
//   recommendation: {
//     seeds: ["seed123", "seed456", "seed789"],
//     difficultyLevel: "hard",
//     reasoning: "基于玩家gold技能等级和balanced偏好推荐"
//   }
// }
```

### 2. 获取指定难度种子

```typescript
// 获取特定难度的种子
const seeds = await ctx.runQuery(
    "scoreThresholdControl:getSeedsByDifficulty",
    {
        difficultyLevel: "hard",
        limit: 10
    }
);

console.log(seeds);
// 输出示例：
// {
//   success: true,
//   difficultyLevel: "hard",
//   seeds: ["seed1", "seed2", "seed3"],
//   count: 3
// }
```

### 3. 获取玩家技能等级

```typescript
// 获取玩家技能等级
const skillInfo = await ctx.runQuery(
    "scoreThresholdControl:getPlayerSkillLevel",
    { uid: "player123" }
);

console.log(skillInfo);
// 输出示例：
// {
//   success: true,
//   uid: "player123",
//   skillLevel: "gold"
// }
```

### 4. 获取种子难度信息

```typescript
// 获取种子难度详情
const difficultyInfo = await ctx.runQuery(
    "scoreThresholdControl:getSeedDifficulty",
    { seed: "seed123" }
);

console.log(difficultyInfo);
// 输出示例：
// {
//   success: true,
//   seed: "seed123",
//   difficultyCoefficient: 0.85,
//   difficultyLevel: "easy"
// }
```

## 维护功能

### 1. 批量更新种子统计

```typescript
// 批量更新多个种子的统计信息
const updateResult = await ctx.runMutation(
    "scoreThresholdControl:batchUpdateSeedStatistics",
    { seeds: ["seed1", "seed2", "seed3"] }
);

console.log(updateResult);
// 输出示例：
// {
//   success: true,
//   total: 3,
//   successful: 3,
//   updated: 2,
//   results: [...]
// }
```

### 2. 清理过期缓存

```typescript
// 清理30天前的过期缓存
const cleanupResult = await ctx.runMutation(
    "scoreThresholdControl:cleanupExpiredCache",
    { daysToKeep: 30 }
);

console.log(cleanupResult);
// 输出示例：
// {
//   success: true,
//   deletedCount: 15,
//   daysKept: 30
// }
```

## 数据流程

### 1. 数据收集
- 系统自动收集每场比赛的结果
- 包括：种子、玩家分数、排名、时间等

### 2. 统计分析
- 计算每个种子的平均分数、最高分、最低分
- 生成难度系数和难度等级

### 3. 缓存管理
- 将统计结果缓存到 `seed_statistics_cache` 表
- 支持增量更新，只处理新增的比赛数据

### 4. 智能推荐
- 分析玩家历史表现，确定技能等级
- 根据偏好和技能等级，推荐合适的种子

## 性能优化

### 1. 增量更新
- 只处理新增的比赛数据
- 避免重复计算历史数据

### 2. 智能缓存
- 缓存种子统计结果
- 定期清理过期数据

### 3. 索引优化
- 使用复合索引 `by_seed_created` 优化增量查询
- 支持高效的难度等级筛选

## 错误处理

系统包含完善的错误处理机制：

- 数据不足时返回默认值
- 网络错误时提供降级方案
- 详细的错误日志记录

## 最佳实践

### 1. 推荐时机
- 玩家完成比赛后
- 玩家主动请求推荐
- 定期更新推荐列表

### 2. 数据质量
- 确保种子有足够的比赛数据（建议10场以上）
- 定期清理无效或过期的统计数据

### 3. 用户体验
- 提供多种难度偏好选择
- 支持备选推荐方案
- 清晰的推荐理由说明

## 扩展功能

### 1. 个性化推荐
- 基于玩家历史偏好调整推荐策略
- 支持动态难度调整

### 2. 社交推荐
- 推荐好友正在使用的种子
- 基于社区热度的推荐

### 3. 季节性调整
- 根据时间、活动等因素调整难度
- 支持特殊事件的种子推荐

## 总结

种子推荐系统通过智能分析玩家技能和种子难度，为玩家提供个性化的游戏体验。系统设计简洁高效，支持增量更新和智能缓存，确保推荐质量和系统性能。
