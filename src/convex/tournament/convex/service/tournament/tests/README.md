# Tournament 测试方案

基于 Convex 控制台的锦标赛功能测试方案。

## 测试文件说明

### 1. `index.ts` - 统一测试入口
- `runAllTournamentTests` - 运行所有测试并汇总结果
- `runJoinTournamentTest` - 单独运行加入锦标赛测试
- `runSubmitScoreTest` - 单独运行分数提交测试
- `runLimitsTest` - 单独运行限制校验测试
- `runSettleTournamentTest` - 单独运行结算测试

### 2. `testJoinTournament.ts` - 加入锦标赛测试
测试加入锦标赛的完整流程：
- 创建测试用户和库存
- 确保活跃赛季存在
- 加入锦标赛
- 验证加入结果

### 3. `testSubmitScore.ts` - 分数提交测试
测试分数提交的完整流程：
- 创建测试环境
- 加入锦标赛
- 提交分数
- 验证提交结果

### 4. `testLimits.ts` - 限制校验测试
测试各种参与限制：
- 正常加入（应该成功）
- 重复加入（应该失败）
- 金币不足（应该失败）

### 5. `testSettleTournament.ts` - 结算测试
测试锦标赛结算流程：
- 创建测试环境
- 加入并提交分数
- 手动结算锦标赛
- 验证结算结果和奖励

## 使用方法

### 在 Convex 控制台运行测试

1. **运行所有测试**
   ```javascript
   // 在 Convex 控制台执行
   await ctx.runMutation(api.service.tournament.tests.index.runAllTournamentTests, {})
   ```

2. **运行单个测试**
   ```javascript
   // 加入锦标赛测试
   await ctx.runMutation(api.service.tournament.tests.index.runJoinTournamentTest, {})
   
   // 分数提交测试
   await ctx.runMutation(api.service.tournament.tests.index.runSubmitScoreTest, {})
   
   // 限制校验测试
   await ctx.runMutation(api.service.tournament.tests.index.runLimitsTest, {})
   
   // 结算测试
   await ctx.runMutation(api.service.tournament.tests.index.runSettleTournamentTest, {})
   ```

## 测试结果说明

每个测试返回的结果格式：
```javascript
{
  success: boolean,        // 测试是否成功
  testUid: string,        // 测试用户ID
  detail: object,         // 详细结果
  message: string,        // 测试消息
  error?: string          // 错误信息（如果失败）
}
```

汇总结果格式：
```javascript
{
  summary: {
    total: number,        // 总测试数
    passed: number,       // 通过数
    failed: number,       // 失败数
    duration: string      // 执行时间
  },
  results: array,         // 各测试结果
  timestamp: string       // 执行时间戳
}
```

## 注意事项

1. **测试数据清理**：每个测试都会自动清理创建的测试数据
2. **并发安全**：使用时间戳生成唯一测试用户ID，避免并发冲突
3. **依赖检查**：测试会自动检查并创建必要的依赖（如活跃赛季）
4. **错误处理**：测试包含完整的错误处理和日志输出

## 扩展测试

如需添加新的测试，请：

1. 在 `tests/` 目录下创建新的测试文件
2. 实现 `runTestXXX` mutation
3. 在 `index.ts` 中添加调用
4. 更新此文档

## 故障排除

如果测试失败，请检查：

1. 数据库连接是否正常
2. 相关服务是否正常运行
3. 测试依赖的数据是否存在
4. 控制台日志中的详细错误信息 