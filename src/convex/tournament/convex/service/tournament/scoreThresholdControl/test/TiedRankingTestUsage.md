# 并列名次处理测试使用说明

## 📋 概述

本文档说明如何使用并列名次处理测试功能，验证相同分数按并列名次处理的逻辑是否正确实现。

## 🎯 测试目标

验证 `RankingRecommendationManager` 中的并列名次处理逻辑：
- 相同分数的参与者获得相同排名
- 排名分配符合竞技比赛的公平性原则
- 处理各种边界情况和复杂场景

## 🚀 可用的Convex函数

### 1. 完整测试套件

```typescript
// 运行所有并列名次测试
const result = await ctx.runAction("tournament:scoreThresholdControl:functions:tiedRankingTestFunctions:runTiedRankingTests");
```

**测试内容：**
- 玩家与AI分数相同的情况
- 多个AI分数相同的情况
- 多玩家并列名次的情况

**返回结果：**
```typescript
{
  success: boolean,
  summary: string,
  testResults: Array<{
    testName: string,
    success: boolean,
    details: any,
    error?: string
  }>,
  timestamp: string
}
```

### 2. 快速验证

```typescript
// 运行核心测试，返回简化结果
const result = await ctx.runAction("tournament:scoreThresholdControl:functions:tiedRankingTestFunctions:runQuickTiedRankingTest");
```

**返回结果：**
```typescript
{
  success: boolean,
  summary: string,
  keyTests: Array<测试结果>,
  timestamp: string
}
```

### 3. 特定场景测试

```typescript
// 测试特定场景
const result = await ctx.runAction("tournament:scoreThresholdControl:functions:tiedRankingTestFunctions:testSpecificTiedRankingScenario", {
  scenario: "player_ai_tied" // 可选值: 'player_ai_tied', 'multiple_ai_tied', 'multi_player_tied', 'high_density_tied'
});
```

### 4. 高密度并列名次测试

```typescript
// 专门测试高密度并列名次场景
const result = await ctx.runAction("tournament:scoreThresholdControl:functions:tiedRankingTestFunctions:testHighDensityTiedRankings");
```

**可用场景：**
- `player_ai_tied`: 玩家与AI分数相同
- `multiple_ai_tied`: 多个AI分数相同
- `multi_player_tied`: 多玩家并列名次
- `high_density_tied`: 高密度并列名次测试

## 🧪 测试场景详解

### 场景1: 玩家与AI分数相同

**测试逻辑：**
- 设置玩家分数为800，3个AI对手
- 运行10次测试，寻找并列名次情况
- 验证相同分数的参与者是否获得相同排名

**预期结果：**
- 如果发现并列名次，显示详细信息
- 验证排名分配的正确性

### 场景2: 多个AI分数相同

**测试逻辑：**
- 设置玩家分数为1000，5个AI对手
- 运行15次测试，寻找AI分数相同的情况
- 验证AI并列名次的处理

**预期结果：**
- 检测AI分数重复情况
- 验证并列名次分配

### 场景3: 多玩家并列名次

**测试逻辑：**
- 设置3个玩家：player1(1000分), player2(1000分), player3(800分)
- 3个AI对手
- 验证相同分数玩家获得相同排名

**预期结果：**
- player1和player2应该获得相同排名
- player3的排名应该低于player1和player2

### 场景4: 高密度并列名次测试

**测试逻辑：**
- 场景1：7个玩家（3个1000分，2个800分，2个600分）+ 4个AI
- 场景2：6个玩家（2个1200分，2个1000分，2个800分）+ 5个AI
- 通过特殊配置最大化并列名次出现的概率
- 验证排名逻辑的正确性

**预期结果：**
- 发现多组并列名次
- 排名逻辑验证通过
- 分数与排名关系正确

## 📊 测试结果解读

### 成功指标

1. **并列名次正确性**
   - 相同分数的参与者获得相同排名
   - 不同分数的参与者排名正确

2. **排名连续性**
   - 排名从1开始连续分配
   - 没有跳过的排名

3. **公平性原则**
   - 高分参与者排名不低于低分参与者
   - 符合竞技比赛规则

### 常见问题

1. **未发现并列名次**
   - 原因：随机算法可能不会每次都产生相同分数
   - 解决：增加测试运行次数

2. **排名不一致**
   - 原因：算法逻辑错误
   - 解决：检查 `reassignAllRanksBasedOnScores` 方法

3. **排名不连续**
   - 原因：排名分配逻辑错误
   - 解决：检查排名计算逻辑

## 🔧 在Convex Dashboard中使用

1. **打开Convex Dashboard**
2. **进入Functions页面**
3. **找到对应的测试函数**
4. **点击运行按钮**
5. **查看控制台输出和返回结果**

### 示例调用

```bash
# 在Convex Dashboard控制台中运行
await ctx.runAction("tournament:scoreThresholdControl:functions:tiedRankingTestFunctions:runTiedRankingTests")
```

## 📈 性能考虑

- **完整测试套件**: 约30-60秒
- **快速验证**: 约10-20秒
- **特定场景测试**: 约5-15秒

## 🐛 故障排除

### 常见错误

1. **导入错误**
   ```
   Error: Cannot find module '../managers/RankingRecommendationManager'
   ```
   - 检查文件路径是否正确
   - 确认 `RankingRecommendationManager` 文件存在

2. **数据库查询错误**
   ```
   Error: Database query failed
   ```
   - 检查数据库连接
   - 确认相关表已创建

3. **类型错误**
   ```
   Error: Type mismatch
   ```
   - 检查TypeScript类型定义
   - 确认接口匹配

### 调试技巧

1. **查看控制台输出**
   - 所有测试都有详细的日志输出
   - 关注 `✅` 和 `❌` 标记

2. **检查返回结果**
   - 查看 `success` 字段
   - 分析 `testResults` 数组

3. **使用特定场景测试**
   - 针对问题场景进行单独测试
   - 减少测试范围，提高调试效率

## 📝 扩展测试

如需添加新的测试场景，可以：

1. **在 `TiedRankingTestSuite` 中添加新方法**
2. **在 `tiedRankingTestFunctions.ts` 中添加新的Convex函数**
3. **更新测试文档**

## 🎉 总结

并列名次处理测试提供了全面的验证机制，确保排名系统的公平性和正确性。通过定期运行这些测试，可以及时发现和修复排名逻辑中的问题。
