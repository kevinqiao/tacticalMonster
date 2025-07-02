# 锦标赛测试系统快速开始指南

## 🚀 5分钟快速开始

### 1. 运行第一个测试

#### 通过 Convex 控制台
1. 打开 Convex Dashboard
2. 进入 Functions 页面
3. 找到 `service/tournament/tests/runUnifiedTests`
4. 点击 "Run" 按钮
5. 输入参数：
```json
{
    "testTypes": ["unit"],
    "verbose": true
}
```

#### 通过客户端代码
```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const runTests = useMutation(api.service.tournament.tests.runUnifiedTests);

// 运行测试
const result = await runTests({
    testTypes: ["unit"],
    verbose: true
});
console.log("测试结果:", result);
```

### 2. 检查测试状态
```typescript
import { useQuery } from "convex/react";

const testStatus = useQuery(api.service.tournament.tests.getTestStatus);
console.log("测试系统状态:", testStatus);
```

### 3. 运行场景测试
```typescript
// 运行所有场景测试
// 使用默认配置运行所有测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, {});

// 运行完整测试套件
await ctx.runMutation(internal.tests.testRunner.fullTest, {});

// 运行特定场景测试
const specificResult = await runTests({
    testTypes: ["scenario"],
    specificTests: ["daily_join"],
    verbose: true
});
```

## 📋 常用测试命令

### 基础测试
```typescript
// 运行所有测试
await runTests({ testTypes: ["unit", "integration", "scenario"] });

// 只运行单元测试
await runTests({ testTypes: ["unit"] });

// 只运行场景测试
await runTests({ testTypes: ["scenario"] });
```

### 特定测试
```typescript
// 运行特定测试
await runSpecificTest("scenario_daily_join");

// 运行多个特定测试
await runTests({
    specificTests: ["scenario_daily_join", "scenario_single_join"]
});
```

### 配置选项
```typescript
// 自定义配置
await runTests({
    testTypes: ["unit", "scenario"],
    timeout: 60000,        // 60秒超时
    verbose: true,         // 详细输出
    stopOnFailure: false   // 失败时继续
});
```

## 🧪 编写第一个测试

### 1. 创建测试文件
```typescript
// myTest.ts
import { describe, it, expect } from "./simpleTestFramework";
import { TournamentTestUtils } from "./testUtils";

describe("我的第一个测试", () => {
    it("应该成功创建模拟上下文", () => {
        const ctx = TournamentTestUtils.createMockContext();
        expect(ctx).toBeDefined();
        expect(ctx.db).toBeDefined();
    });
});
```

### 2. 测试锦标赛加入
```typescript
describe("锦标赛加入测试", () => {
    it("应该成功加入每日特殊锦标赛", async () => {
        const ctx = TournamentTestUtils.createMockContext();
        ctx.setupDefaultMocks();
        
        // 模拟玩家数据
        ctx.setupMockForPlayer("player1");
        
        // 测试加入逻辑
        const result = await joinTournament(ctx, {
            uid: "player1",
            gameType: "solitaire",
            tournamentType: "daily_special"
        });
        
        expect(result.success).toBe(true);
    });
});
```

## 📊 理解测试结果

### 成功输出示例
```
🚀 开始运行统一锦标赛测试
配置: {
  "testTypes": ["unit", "scenario"],
  "timeout": 30000,
  "concurrency": 1,
  "verbose": true,
  "stopOnFailure": false
}

📦 运行主测试套件
  🧪 测试工具创建
    ✅ 测试工具创建 - 通过
  🧪 Mock上下文设置
    ✅ Mock上下文设置 - 通过

📦 运行场景测试
  🧪 每日特殊锦标赛加入测试
    ✅ 每日特殊锦标赛加入测试 - 通过

============================================================
📊 测试执行报告
============================================================

📦 主测试套件:
   总测试: 2
   通过: 2 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%

📦 场景测试套件:
   总测试: 8
   通过: 8 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%

------------------------------------------------------------
📈 总体统计:
   总测试: 10
   通过: 10 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%
============================================================
```

### 失败输出示例
```
❌ 测试失败: 期望 true 等于 false
   在: 我的第一个测试 > 应该成功创建模拟上下文
   错误: 期望 true 等于 false
```

## 🔧 调试技巧

### 1. 查看详细错误
```typescript
// 启用详细输出
await runTests({
    testTypes: ["unit"],
    verbose: true
});
```

### 2. 运行单个测试
```typescript
// 运行特定测试进行调试
await runSpecificTest("scenario_daily_join");
```

### 3. 检查模拟数据
```typescript
const ctx = TournamentTestUtils.createMockContext();
ctx.setupDefaultMocks();

// 打印模拟上下文
console.log("模拟上下文:", JSON.stringify(ctx, null, 2));
```

### 4. 验证测试环境
```typescript
const envStatus = await validateTestEnvironment();
console.log("环境状态:", envStatus);
```

## 🎯 常用测试模式

### 1. 测试成功场景
```typescript
it("应该成功加入锦标赛", async () => {
    const ctx = TournamentTestUtils.createMockContext();
    ctx.setupDefaultMocks();
    
    const result = await joinTournament(ctx, params);
    
    expect(result.success).toBe(true);
    expect(result.tournamentId).toBeDefined();
});
```

### 2. 测试错误场景
```typescript
it("应该拒绝金币不足的玩家", async () => {
    const ctx = TournamentTestUtils.createMockContext();
    ctx.setupDefaultMocks();
    
    // 设置金币不足的库存
    ctx.setupMockForInventory("player1", { coins: 0 });
    
    await expect(
        joinTournament(ctx, params)
    ).rejects.toThrow("金币不足");
});
```

### 3. 测试限制检查
```typescript
it("应该检查每日限制", async () => {
    const ctx = TournamentTestUtils.createMockContext();
    ctx.setupDefaultMocks();
    
    // 设置已达到限制
    ctx.setupMockForLimits("player1", { daily: 3 });
    
    await expect(
        joinTournament(ctx, params)
    ).rejects.toThrow("今日已达最大参与次数");
});
```

## 📝 最佳实践

### 1. 测试命名
```typescript
// ✅ 好的命名
it("应该成功加入每日特殊锦标赛");
it("应该拒绝金币不足的玩家");
it("应该检查每日参与限制");

// ❌ 不好的命名
it("test1");
it("should work");
it("join tournament");
```

### 2. 测试组织
```typescript
describe("每日特殊锦标赛", () => {
    describe("加入功能", () => {
        it("应该成功加入");
        it("应该检查金币");
        it("应该检查限制");
    });
    
    describe("提交分数", () => {
        it("应该成功提交");
        it("应该计算奖励");
    });
});
```

### 3. 模拟数据使用
```typescript
// ✅ 使用预定义数据
const player = TEST_PLAYERS[0];
const inventory = TEST_INVENTORIES[0];

// ✅ 根据需要定制
ctx.setupMockForPlayer("player1", {
    ...TEST_PLAYERS[0],
    coins: 1000
});
```

## 🚨 常见问题解决

### 问题1: "jest is not defined"
**解决方案:**
```typescript
// 使用运行时检查
if (typeof jest === 'function') {
    const mockFn = jest().fn();
} else {
    console.log("jest not available");
}
```

### 问题2: 测试超时
**解决方案:**
```typescript
// 增加超时时间
await runTests({
    testTypes: ["scenario"],
    timeout: 60000  // 60秒
});
```

### 问题3: 模拟数据不匹配
**解决方案:**
```typescript
// 检查数据结构
console.log("期望数据:", expectedData);
console.log("实际数据:", actualData);

// 使用部分匹配
expect(actualData).toMatchObject(expectedData);
```

## 📚 下一步

1. **阅读完整文档**: 查看 `README.md` 了解详细信息
2. **探索场景测试**: 查看 `scenarios/simpleScenarioTests.ts`
3. **添加新测试**: 参考现有测试模式
4. **自定义配置**: 根据需要调整测试配置

## 🆘 获取帮助

- 查看 `README.md` 获取详细文档
- 检查 `testUtils.ts` 了解可用工具
- 参考 `mockData.ts` 了解数据结构
- 查看现有测试作为示例

---

**恭喜！** 您已经成功开始使用锦标赛测试系统。现在可以运行测试、编写新测试，并确保代码质量了！ 🎉 