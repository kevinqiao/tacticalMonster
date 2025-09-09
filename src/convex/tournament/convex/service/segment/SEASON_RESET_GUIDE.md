# 🔄 赛季重置功能指南

## 📋 功能概述

赛季重置是段位系统的重要功能，在赛季结束时对所有玩家的段位进行软重置，确保新赛季的公平性和竞争性。软重置意味着玩家不会完全回到起点，而是保留部分积分并调整到合适的起始段位。

## 🎯 重置机制

### 1. 软重置特点
- **保留积分**: 玩家保留30%的当前积分
- **段位调整**: 根据当前段位调整到合适的起始段位
- **最低保障**: 确保每个玩家至少有100积分
- **上限控制**: 最多保留500积分，防止新赛季起点过高

### 2. 重置规则

| 当前段位 | 重置后段位 | 说明 |
|----------|------------|------|
| Bronze | Bronze | 青铜保持青铜 |
| Silver | Bronze | 白银重置为青铜 |
| Gold | Bronze | 黄金重置为青铜 |
| Platinum | Silver | 铂金重置为白银 |
| Diamond | Silver | 钻石重置为白银 |
| Master | Gold | 大师重置为黄金 |
| Grandmaster | Gold | 宗师重置为黄金 |

### 3. 积分保留计算

```typescript
// 积分保留公式
retainedPoints = Math.floor(currentPoints * 0.3); // 保留30%
retainedPoints = Math.max(retainedPoints, 100);   // 最少100积分
retainedPoints = Math.min(retainedPoints, 500);   // 最多500积分
```

## 🔧 配置参数

### 1. 重置配置
```typescript
export const SEASON_RESET_CONFIG = {
    // 重置基准段位
    resetBaseSegment: "bronze",
    
    // 重置后保留的积分比例
    pointsRetentionRate: 0.3, // 保留30%的积分
    
    // 重置后最低积分
    minRetainedPoints: 100,
    
    // 重置后最高积分（防止保留过多积分）
    maxRetainedPoints: 500,
    
    // 重置规则：根据当前段位决定重置后的段位
    resetRules: {
        bronze: "bronze",      // 青铜保持青铜
        silver: "bronze",      // 白银重置为青铜
        gold: "bronze",        // 黄金重置为青铜
        platinum: "silver",    // 铂金重置为白银
        diamond: "silver",     // 钻石重置为白银
        master: "gold",        // 大师重置为黄金
        grandmaster: "gold"    // 宗师重置为黄金
    }
};
```

## 🚀 使用方法

### 1. 获取重置预览
```typescript
// 获取赛季重置预览
const preview = await ctx.runQuery(
  "segment:getSeasonResetPreview"
);

console.log(`总玩家数: ${preview.totalPlayers}`);
preview.resetPreview.forEach(item => {
  console.log(`${item.segment}: ${item.count}人, 平均积分${item.avgPoints} -> ${item.newSegment}(${item.avgRetainedPoints})`);
});
```

### 2. 执行赛季重置
```typescript
// 执行赛季软重置
const resetResult = await ctx.runMutation(
  "segment:performSeasonReset",
  {
    seasonId: "season_2024_1",
    resetReason: "赛季结束"
  }
);

if (resetResult.success) {
  console.log(`重置成功: ${resetResult.resetCount} 名玩家被重置`);
} else {
  console.error("重置失败:", resetResult.errors);
}
```

### 3. 重置结果处理
```typescript
const resetResult = await ctx.runMutation(
  "segment:performSeasonReset",
  {
    seasonId: "season_2024_1",
    resetReason: "赛季结束"
  }
);

// 检查重置结果
if (resetResult.success) {
  console.log(`✅ 赛季重置完成`);
  console.log(`📊 重置玩家数: ${resetResult.resetCount}`);
  console.log(`⏰ 重置时间: ${resetResult.timestamp}`);
  
  if (resetResult.errors.length > 0) {
    console.warn(`⚠️ 部分玩家重置失败:`, resetResult.errors);
  }
} else {
  console.error(`❌ 赛季重置失败:`, resetResult.errors);
}
```

## 📊 重置示例

### 1. 玩家重置示例

| 玩家 | 当前段位 | 当前积分 | 重置后段位 | 保留积分 | 积分变化 |
|------|----------|----------|------------|----------|----------|
| 玩家A | Bronze | 500 | Bronze | 150 | -350 |
| 玩家B | Silver | 2000 | Bronze | 500 | -1500 |
| 玩家C | Gold | 8000 | Bronze | 500 | -7500 |
| 玩家D | Platinum | 15000 | Silver | 500 | -14500 |
| 玩家E | Diamond | 25000 | Silver | 500 | -24500 |
| 玩家F | Master | 60000 | Gold | 500 | -59500 |
| 玩家G | Grandmaster | 120000 | Gold | 500 | -119500 |

### 2. 重置统计示例
```json
{
  "totalPlayers": 1000,
  "resetPreview": [
    {
      "segment": "bronze",
      "count": 300,
      "avgPoints": 800,
      "newSegment": "bronze",
      "avgRetainedPoints": 240
    },
    {
      "segment": "silver",
      "count": 250,
      "avgPoints": 3000,
      "newSegment": "bronze",
      "avgRetainedPoints": 500
    },
    {
      "segment": "gold",
      "count": 200,
      "avgPoints": 8000,
      "newSegment": "bronze",
      "avgRetainedPoints": 500
    },
    {
      "segment": "platinum",
      "count": 150,
      "avgPoints": 15000,
      "newSegment": "silver",
      "avgRetainedPoints": 500
    },
    {
      "segment": "diamond",
      "count": 80,
      "avgPoints": 25000,
      "newSegment": "silver",
      "avgRetainedPoints": 500
    },
    {
      "segment": "master",
      "count": 15,
      "avgPoints": 50000,
      "newSegment": "gold",
      "avgRetainedPoints": 500
    },
    {
      "segment": "grandmaster",
      "count": 5,
      "avgPoints": 100000,
      "newSegment": "gold",
      "avgRetainedPoints": 500
    }
  ]
}
```

## 🔄 重置流程

### 1. 重置前准备
```typescript
// 1. 获取重置预览
const preview = await getSeasonResetPreview();

// 2. 检查重置影响
console.log(`将重置 ${preview.totalPlayers} 名玩家`);

// 3. 确认重置操作
const confirmed = await confirmReset(preview);
```

### 2. 执行重置
```typescript
// 1. 执行重置
const result = await performSeasonReset(seasonId, "赛季结束");

// 2. 检查结果
if (result.success) {
  console.log(`重置完成: ${result.resetCount} 名玩家`);
} else {
  console.error(`重置失败:`, result.errors);
}
```

### 3. 重置后处理
```typescript
// 1. 记录重置日志
await recordSeasonResetLog(seasonId, result);

// 2. 通知玩家
await notifyPlayersReset(seasonId, result);

// 3. 更新赛季信息
await updateSeasonInfo(seasonId, "reset_completed");
```

## ⚠️ 注意事项

### 1. 重置时机
- **赛季结束**: 在赛季正式结束后执行
- **维护时间**: 建议在维护期间执行
- **数据备份**: 重置前建议备份玩家数据

### 2. 数据一致性
- **事务处理**: 重置操作在事务中执行
- **错误处理**: 单个玩家失败不影响整体重置
- **日志记录**: 详细记录重置过程和结果

### 3. 玩家通知
- **提前通知**: 重置前通知玩家
- **重置说明**: 解释重置规则和影响
- **补偿机制**: 考虑给予适当补偿

## 🛠️ 自定义配置

### 1. 调整保留比例
```typescript
// 修改保留比例
SEASON_RESET_CONFIG.pointsRetentionRate = 0.5; // 保留50%
```

### 2. 调整积分限制
```typescript
// 修改积分限制
SEASON_RESET_CONFIG.minRetainedPoints = 200; // 最少200积分
SEASON_RESET_CONFIG.maxRetainedPoints = 1000; // 最多1000积分
```

### 3. 自定义重置规则
```typescript
// 自定义重置规则
SEASON_RESET_CONFIG.resetRules = {
    bronze: "bronze",
    silver: "bronze", 
    gold: "silver",      // 黄金重置为白银
    platinum: "silver",
    diamond: "gold",     // 钻石重置为黄金
    master: "gold",
    grandmaster: "platinum" // 宗师重置为铂金
};
```

## 📈 监控和统计

### 1. 重置统计
- 重置玩家数量
- 重置成功率
- 平均保留积分
- 段位分布变化

### 2. 性能监控
- 重置执行时间
- 数据库操作性能
- 错误率统计

### 3. 玩家反馈
- 重置满意度
- 问题反馈
- 建议收集

## 🔮 未来扩展

### 1. 智能重置
- 基于玩家表现的个性化重置
- 动态调整保留比例
- 预测性重置规则

### 2. 重置奖励
- 重置后特殊奖励
- 连续赛季奖励
- 成就系统集成

### 3. 重置预览增强
- 3D可视化预览
- 详细影响分析
- 玩家个人预览

---

**功能版本**: 1.0.0  
**最后更新**: 2024年  
**维护者**: AI Assistant
