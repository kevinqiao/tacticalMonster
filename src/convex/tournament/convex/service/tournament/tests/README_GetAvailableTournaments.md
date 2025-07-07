# getAvailableTournaments 测试说明

## 概述

这个测试文件用于验证 `TournamentService.getAvailableTournaments` 方法的功能正确性。

## 测试内容

### 1. 基础功能测试 (testBasicFunctionality)
- 验证方法能正确返回可用锦标赛列表
- 检查返回的锦标赛是否包含必要字段（typeId, name, description, category, gameType）
- 验证返回结果的数据结构

### 2. 游戏类型过滤测试 (testGameTypeFilter)
- 测试按游戏类型过滤功能
- 验证只返回指定游戏类型的锦标赛
- 比较过滤前后的结果数量

### 3. 分类过滤测试 (testCategoryFilter)
- 测试按分类过滤功能
- 验证只返回指定分类的锦标赛
- 确保过滤结果的准确性

### 4. 参赛资格测试 (testEligibilityCheck)
- 验证每个锦标赛都有资格检查结果
- 检查资格检查逻辑的正确性
- 验证不合格锦标赛的处理

### 5. 参与统计测试 (testParticipationStats)
- 验证每个锦标赛都有参与统计信息
- 检查统计数据（dailyAttempts, weeklyAttempts, totalAttempts）的合理性
- 确保统计数据为非负数

### 6. 段位限制测试 (testSegmentRestrictions)
- 创建高段位要求的锦标赛
- 使用低段位玩家测试
- 验证段位限制的正确工作

### 7. 订阅要求测试 (testSubscriptionRequirements)
- 创建需要订阅的锦标赛
- 使用非订阅玩家测试
- 验证订阅要求的正确工作

### 8. 入场费测试 (testEntryFeeRequirements)
- 创建高入场费的锦标赛
- 使用金币不足的玩家测试
- 验证入场费要求的正确工作

## 运行测试

### 运行所有测试
```typescript
await ctx.runMutation(internal.service.tournament.tests.runGetAvailableTournamentsTests.runGetAvailableTournamentsTests, {});
```

### 运行单个测试
```typescript
await ctx.runMutation(internal.service.tournament.tests.runGetAvailableTournamentsTests.runSingleTest, { 
    testName: "basic" // 可选值: basic, gameTypeFilter, categoryFilter, eligibility, participation, segment, subscription, entryFee
});
```

### 通过测试索引运行
```typescript
// 运行所有锦标赛测试（包括getAvailableTournaments）
await ctx.runMutation(internal.service.tournament.tests.index.runAllTournamentTests, {});

// 单独运行getAvailableTournaments测试
await ctx.runMutation(internal.service.tournament.tests.index.runGetAvailableTournamentsTest, {});
```

## 测试数据

测试会自动创建以下测试数据：
- 测试用户（不同段位、订阅状态、金币数量）
- 测试锦标赛类型（不同配置要求）
- 用户库存数据
- 赛季数据

测试完成后会自动清理所有测试数据。

## 预期结果

- 所有测试应该通过
- 返回的锦标赛列表格式正确
- 过滤功能正常工作
- 资格检查逻辑正确
- 参与统计数据合理
- 各种限制条件正确生效

## 注意事项

1. 测试会创建临时数据，但会自动清理
2. 测试依赖于现有的数据库结构
3. 某些测试可能需要特定的锦标赛类型配置
4. 测试结果会输出到控制台，便于调试

## 性能优化

测试中已经优化了 `getParticipationStats` 方法，只查询相关的时间范围，避免冗余的数据库查询。 