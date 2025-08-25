# 玩家技能等级分析指南

## 概述

本指南介绍如何使用新增的玩家技能等级分析功能，这些功能基于 `match_results` 表的历史数据，为玩家提供详细的技能评估和趋势分析。

## 核心功能

### **1. 获取单个玩家技能等级（详细统计）**

```typescript
// 获取玩家技能等级和详细统计
const playerSkill = await ctx.runQuery(
    "scoreThresholdControl:getPlayerSkillLevel",
    { uid: "player_123" }
);

console.log(playerSkill);
// 输出示例：
// {
//   success: true,
//   uid: "player_123",
//   skillLevel: "gold",
//   segmentName: "gold",
//   statistics: {
//     totalMatches: 25,
//     wins: 8,
//     winRate: 0.32,
//     averageRank: 2.8,
//     averageScore: 7500
//   },
//   recentMatches: [
//     {
//       matchId: "match_001",
//       score: 8200,
//       rank: 2,
//       points: 15,
//       createdAt: "2024-01-15T10:30:00Z"
//     }
//     // ... 更多比赛记录
//   ]
// }
```

### **2. 批量获取多个玩家技能等级**

```typescript
// 批量获取多个玩家的技能等级
const batchSkills = await ctx.runQuery(
    "scoreThresholdControl:getBatchPlayerSkillLevels",
    { 
        uids: ["player_1", "player_2", "player_3"] 
    }
);

console.log(batchSkills);
// 输出示例：
// {
//   success: true,
//   results: [
//     {
//       uid: "player_1",
//       skillLevel: "gold",
//       segmentName: "gold",
//       totalMatches: 20,
//       winRate: 0.35,
//       averageRank: 2.6
//     }
//     // ... 更多玩家
//   ],
//   totalPlayers: 3,
//   successfulPlayers: 3
// }
```

### **3. 获取段位技能等级分布统计**

```typescript
// 获取所有玩家的技能等级分布
const distribution = await ctx.runQuery(
    "scoreThresholdControl:getSegmentSkillDistribution"
);

console.log(distribution);
// 输出示例：
// {
//   success: true,
//   distribution: {
//     bronze: 45,
//     silver: 78,
//     gold: 156,
//     platinum: 89,
//     diamond: 23
//   },
//   totalPlayers: 391,
//   timestamp: "2024-01-15T10:30:00Z"
// }
```

### **4. 获取玩家技能等级趋势分析**

```typescript
// 获取玩家技能趋势（周、月、季度）
const skillTrend = await ctx.runQuery(
    "scoreThresholdControl:getPlayerSkillTrend",
    { 
        uid: "player_123",
        period: "month" // "week", "month", "quarter"
    }
);

console.log(skillTrend);
// 输出示例：
// {
//   success: true,
//   uid: "player_123",
//   period: "month",
//   trend: "improving", // "improving", "declining", "stable"
//   data: [
//     {
//       date: "Mon Jan 01 2024",
//       averageRank: 2.8,
//       averageScore: 7200,
//       matchesCount: 3
//     }
//     // ... 更多日期数据
//   ],
//   analysis: {
//     firstHalfAverageRank: 3.2,
//     secondHalfAverageRank: 2.5,
//     improvement: 0.7
//   }
// }
```

## 技能等级计算逻辑

### **技能等级判断标准**

基于最近20场比赛的数据：

- **Diamond**: 平均排名 ≤ 1.5 且 胜率 ≥ 60%
- **Platinum**: 平均排名 ≤ 2.0 且 胜率 ≥ 50%
- **Gold**: 平均排名 ≤ 2.5 且 胜率 ≥ 40%
- **Silver**: 平均排名 ≤ 3.0 且 胜率 ≥ 30%
- **Bronze**: 其他情况

### **数据要求**

- 至少需要5场比赛记录才能进行技能评估
- 数据不足时默认返回 'bronze' 等级
- 基于 `match_results` 表的实际比赛数据

## 使用场景

### **1. 玩家个人分析**

```typescript
// 获取玩家完整技能画像
const playerAnalysis = await ctx.runQuery(
    "scoreThresholdControl:getPlayerSkillLevel",
    { uid: "player_123" }
);

if (playerAnalysis.success) {
    const { skillLevel, statistics, recentMatches } = playerAnalysis;
    
    console.log(`玩家技能等级: ${skillLevel}`);
    console.log(`总比赛数: ${statistics.totalMatches}`);
    console.log(`胜率: ${(statistics.winRate * 100).toFixed(1)}%`);
    console.log(`平均排名: ${statistics.averageRank}`);
    console.log(`平均分数: ${statistics.averageScore}`);
}
```

### **2. 段位管理**

```typescript
// 分析段位分布，优化匹配系统
const segmentAnalysis = await ctx.runQuery(
    "scoreThresholdControl:getSegmentSkillDistribution"
);

if (segmentAnalysis.success) {
    const { distribution, totalPlayers } = segmentAnalysis;
    
    // 计算各段位占比
    Object.entries(distribution).forEach(([segment, count]) => {
        const percentage = ((count / totalPlayers) * 100).toFixed(1);
        console.log(`${segment}: ${count} 人 (${percentage}%)`);
    });
}
```

### **3. 技能趋势监控**

```typescript
// 监控玩家技能发展趋势
const trendAnalysis = await ctx.runQuery(
    "scoreThresholdControl:getPlayerSkillTrend",
    { uid: "player_123", period: "month" }
);

if (trendAnalysis.success) {
    const { trend, analysis } = trendAnalysis;
    
    switch (trend) {
        case 'improving':
            console.log(`玩家技能正在提升，排名改善 ${analysis.improvement}`);
            break;
        case 'declining':
            console.log(`玩家技能有所下降，排名降低 ${Math.abs(analysis.improvement)}`);
            break;
        case 'stable':
            console.log('玩家技能保持稳定');
            break;
    }
}
```

### **4. 批量玩家管理**

```typescript
// 批量分析玩家技能，用于活动策划
const playerList = ["player_1", "player_2", "player_3", "player_4", "player_5"];
const batchAnalysis = await ctx.runQuery(
    "scoreThresholdControl:getBatchPlayerSkillLevels",
    { uids: playerList }
);

if (batchAnalysis.success) {
    // 按技能等级分组
    const playersBySkill = {};
    batchAnalysis.results.forEach(player => {
        if (!playersBySkill[player.skillLevel]) {
            playersBySkill[player.skillLevel] = [];
        }
        playersBySkill[player.skillLevel].push(player.uid);
    });
    
    console.log('按技能等级分组的玩家:', playersBySkill);
}
```

## 性能优化建议

### **1. 索引使用**

确保 `match_results` 表有以下索引：
- `by_uid` - 按玩家ID查询
- `by_uid_created` - 按玩家ID和时间查询
- `by_createdAt` - 按时间查询

### **2. 查询优化**

- 使用 `take()` 限制返回记录数量
- 合理使用时间段过滤
- 避免一次性查询过多玩家

### **3. 缓存策略**

- 技能等级计算结果可以缓存
- 定期更新统计数据
- 使用增量更新减少计算量

## 错误处理

### **常见错误**

1. **玩家不存在**: 返回默认 'bronze' 等级
2. **数据不足**: 需要至少5场比赛记录
3. **查询超时**: 大数据量时使用分页查询

### **错误响应格式**

```typescript
{
    success: false,
    error: "错误描述信息"
}
```

## 最佳实践

### **1. 定期分析**

- 建议每天或每周运行一次技能等级分析
- 监控玩家技能变化趋势
- 及时调整匹配算法

### **2. 数据质量**

- 确保 `match_results` 表数据完整性
- 定期清理无效数据
- 验证分数和排名的合理性

### **3. 用户体验**

- 技能等级变化时及时通知玩家
- 提供技能提升建议
- 展示技能发展趋势图表

## 总结

新增的玩家技能等级分析功能提供了：

1. **详细统计** - 胜率、平均排名、平均分数等
2. **趋势分析** - 技能提升、下降或稳定状态
3. **批量处理** - 支持多玩家同时分析
4. **分布统计** - 全服技能等级分布情况

这些功能可以帮助：
- 优化匹配系统
- 监控玩家成长
- 制定游戏策略
- 提升用户体验

通过合理使用这些功能，可以为玩家提供更公平、更有挑战性的游戏体验！


