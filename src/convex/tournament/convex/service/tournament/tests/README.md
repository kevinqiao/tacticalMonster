# 锦标赛系统测试文档

## 概述

锦标赛系统测试框架是一个完整的测试解决方案，支持单元测试、集成测试和场景测试。该框架完全移除 Jest 依赖，使用自定义测试框架，可在 Convex 环境中运行。

## 测试架构

### 目录结构
```
tests/
├── index.ts                 # 统一测试入口
├── simpleTestFramework.ts   # 自定义测试框架
├── testUtils.ts            # 测试工具和模拟上下文
├── testRunner.ts           # 统一测试运行器
├── mockData.ts             # 模拟数据
└── scenarios/
    └── simpleScenarioTests.ts  # 场景测试
```

### 核心组件

#### 1. 自定义测试框架 (`simpleTestFramework.ts`)
- 提供 `jest()` 函数创建模拟函数
- 提供 `expect()` 函数进行断言
- 支持 `describe()`, `it()`, `beforeEach()`, `afterEach()`
- 包含常用断言函数：`assertEqual`, `assertTrue`, `assertDefined` 等

#### 2. 测试工具 (`testUtils.ts`)
- `MockContext`: 模拟 Convex 上下文
- `TournamentTestUtils`: 测试工具类
- 提供数据库、认证、调度器的模拟

#### 3. 统一测试运行器 (`testRunner.ts`)
- `UnifiedTournamentTestRunner`: 统一测试运行器
- 支持多种测试类型
- 提供详细的测试报告

## 运行测试

### 1. 通过 Convex 函数运行

#### 运行所有测试
```typescript
// 在 Convex 控制台或客户端调用
await ctx.runQuery(internal.service.tournament.tests.runUnifiedTests, {
    testTypes: ["unit", "integration", "scenario"],
    verbose: true
});
```

#### 运行特定测试
```typescript
// 运行特定测试
await ctx.runQuery(internal.service.tournament.tests.runSpecificTest, {
    testName: "scenario_daily_join"
});
```

#### 获取测试状态
```typescript
// 检查测试系统状态
await ctx.runQuery(internal.service.tournament.tests.getTestStatus);
```

### 2. 通过客户端调用

#### 在 React 组件中
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function TestRunner() {
    const runTests = useMutation(api.service.tournament.tests.runUnifiedTests);
    const testStatus = useQuery(api.service.tournament.tests.getTestStatus);

    const handleRunTests = async () => {
        const result = await runTests({
            testTypes: ["unit", "integration", "scenario"],
            verbose: true
        });
        console.log("测试结果:", result);
    };

    return (
        <div>
            <button onClick={handleRunTests}>运行测试</button>
            <pre>{JSON.stringify(testStatus, null, 2)}</pre>
        </div>
    );
}
```

### 3. 通过 Convex 控制台

1. 打开 Convex Dashboard
2. 进入 Functions 页面
3. 找到 `service/tournament/tests/runUnifiedTests`
4. 点击 "Run" 按钮
5. 输入参数：
```json
{
    "testTypes": ["unit", "integration", "scenario"],
    "verbose": true
}
```

## 测试类型

### 1. 单元测试 (Unit Tests)
测试单个函数或组件的功能
```typescript
await runTests({ testTypes: ["unit"] });
```

### 2. 集成测试 (Integration Tests)
测试多个组件之间的交互
```typescript
await runTests({ testTypes: ["integration"] });
```

### 3. 场景测试 (Scenario Tests)
测试完整的业务场景
```typescript
await runTests({ testTypes: ["scenario"] });
```

### 4. 所有测试
```typescript
await runTests({ testTypes: ["unit", "integration", "scenario"] });
```

## 测试配置

### 配置选项
```typescript
interface TestConfig {
    testTypes: Array<"unit" | "integration" | "e2e" | "performance" | "scenario">;
    specificTests?: string[];
    timeout: number;
    concurrency: number;
    verbose: boolean;
    stopOnFailure: boolean;
}
```

### 默认配置
```typescript
const defaultConfig: TestConfig = {
    testTypes: ["unit", "integration", "e2e", "performance", "scenario"],
    timeout: 30000,
    concurrency: 1,
    verbose: true,
    stopOnFailure: false
};
```

## 编写测试

### 1. 基本测试结构
```typescript
import { describe, it, expect, jest } from "./simpleTestFramework";
import { TournamentTestUtils } from "./testUtils";

describe("锦标赛加入测试", () => {
    it("应该成功加入每日特殊锦标赛", async () => {
        const ctx = TournamentTestUtils.createMockContext();
        ctx.setupDefaultMocks();
        
        // 测试逻辑
        const result = await joinTournament(ctx, {
            uid: "player1",
            gameType: "solitaire",
            tournamentType: "daily_special"
        });
        
        expect(result.success).toBe(true);
    });
});
```

### 2. 使用模拟上下文
```typescript
const ctx = TournamentTestUtils.createMockContext();
ctx.setupDefaultMocks();

// 设置特定玩家的模拟
ctx.setupMockForPlayer("player1");

// 设置特定锦标赛类型的模拟
ctx.setupMockForTournamentType("daily_special");
```

### 3. 验证结果
```typescript
// 验证加入结果
TournamentTestUtils.validateJoinResult(result);

// 验证提交结果
TournamentTestUtils.validateSubmitResult(result);

// 验证数据库调用
TournamentTestUtils.validateDatabaseCall(ctx, {
    type: 'insert',
    table: 'tournaments',
    data: { gameType: 'solitaire' }
});
```

## 场景测试

### 可用场景测试

#### 1. 每日特殊锦标赛
- `daily_join`: 加入每日特殊锦标赛
- `daily_limit`: 测试每日限制
- `daily_coins`: 测试金币不足情况

#### 2. 单人锦标赛
- `single_join`: 加入单人锦标赛
- `single_submit`: 提交分数

#### 3. 多人锦标赛
- `multi_join`: 加入多人锦标赛
- `multi_matching`: 测试匹配机制

#### 4. 独立锦标赛
- `independent_creation`: 创建独立锦标赛

### 运行场景测试
```typescript
// 运行所有场景测试
await SimpleScenarioTestRunner.runAllTests();

// 运行特定场景测试
await SimpleScenarioTestRunner.runSpecificTest("daily_join");
```

## 模拟数据

### 测试数据包括
- `TEST_PLAYERS`: 玩家数据
- `TEST_INVENTORIES`: 库存数据
- `TEST_SEASONS`: 赛季数据
- `TEST_TOURNAMENTS`: 锦标赛数据
- `TEST_MATCHES`: 比赛数据
- `TEST_PLAYER_MATCHES`: 玩家比赛数据
- `TEST_LIMITS`: 限制数据
- `TEST_EVENTS`: 事件数据

### 使用模拟数据
```typescript
import { TEST_PLAYERS, TEST_INVENTORIES } from "./mockData";

// 在测试中使用
const player = TEST_PLAYERS[0];
const inventory = TEST_INVENTORIES[0];
```

## 测试工具函数

### 断言函数
```typescript
import { 
    assertEqual, 
    assertTrue, 
    assertFalse, 
    assertDefined, 
    assertThrows, 
    assertRejects 
} from "./simpleTestFramework";

assertEqual(actual, expected, "消息");
assertTrue(condition, "消息");
assertDefined(value, "消息");
```

### Mock 函数
```typescript
import { jest } from "./simpleTestFramework";

const mockFn = jest().fn();
mockFn.mockResolvedValue("result");
mockFn.mockImplementation(() => "custom result");
```

### 验证函数
```typescript
// 验证加入结果
TournamentTestUtils.validateJoinResult(result);

// 验证错误
TournamentTestUtils.validateError(error, "期望错误消息");

// 验证限制检查
TournamentTestUtils.validateLimitCheck(ctx, limitCall, expectedLimit);
```

## 测试报告

### 测试结果结构
```typescript
interface TestExecutionResult {
    suites: TestSuiteResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
        successRate: number;
    };
    config: TestConfig;
}
```

### 示例输出
```
🚀 开始运行统一锦标赛测试
配置: {
  "testTypes": ["unit", "integration", "scenario"],
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
  🧪 断言函数测试
    ✅ 断言函数测试 - 通过

📦 运行场景测试
  🧪 每日特殊锦标赛加入测试
    ✅ 每日特殊锦标赛加入测试 - 通过

============================================================
📊 测试执行报告
============================================================

📦 主测试套件:
   总测试: 3
   通过: 3 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%
   耗时: 150ms

📦 场景测试套件:
   总测试: 8
   通过: 8 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%
   耗时: 2000ms

------------------------------------------------------------
📈 总体统计:
   总测试: 11
   通过: 11 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%
   总耗时: 2150ms
============================================================
```

## 调试测试

### 1. 查看详细错误信息
测试失败时会显示详细的错误信息和堆栈跟踪。

### 2. 运行单个测试
```typescript
await runSpecificTest("scenario_daily_join");
```

### 3. 验证测试环境
```typescript
const envStatus = await validateTestEnvironment();
console.log("测试环境状态:", envStatus);
```

### 4. 检查模拟数据
确保模拟数据正确设置：
```typescript
const ctx = TournamentTestUtils.createMockContext();
ctx.setupDefaultMocks();
console.log("模拟上下文:", ctx);
```

## 最佳实践

### 1. 测试组织
- 按功能模块组织测试
- 使用描述性的测试名称
- 保持测试独立

### 2. 模拟数据
- 使用预定义的模拟数据
- 根据测试需要定制模拟数据
- 确保模拟数据的完整性

### 3. 断言
- 使用具体的断言消息
- 验证关键的业务逻辑
- 测试边界条件

### 4. 错误处理
- 测试异常情况
- 验证错误消息
- 确保错误处理逻辑正确

## 故障排除

### 常见问题

#### 1. "jest is not defined" 错误
- 确保在测试环境中运行
- 检查导入语句
- 使用运行时检查

#### 2. 模拟函数不工作
- 检查模拟设置
- 确保正确调用 `setupDefaultMocks()`
- 验证模拟实现

#### 3. 测试超时
- 增加超时时间
- 检查异步操作
- 优化测试性能

#### 4. 数据验证失败
- 检查模拟数据
- 验证数据结构
- 确保数据一致性

## 扩展测试

### 添加新测试
1. 在相应的测试文件中添加测试用例
2. 使用现有的测试工具和模拟数据
3. 遵循测试命名和组织规范

### 添加新场景测试
1. 在 `scenarios/simpleScenarioTests.ts` 中添加新场景
2. 实现场景的 `setup` 和验证逻辑
3. 更新测试索引

### 添加新模拟数据
1. 在 `mockData.ts` 中添加新数据
2. 确保数据结构正确
3. 更新相关的模拟设置

## 总结

锦标赛系统测试框架提供了完整的测试解决方案，支持多种测试类型和场景。通过使用自定义测试框架，可以在 Convex 环境中运行测试，确保代码质量和功能正确性。

关键特性：
- ✅ 完全移除 Jest 依赖
- ✅ 支持单元、集成、场景测试
- ✅ 提供丰富的模拟工具
- ✅ 详细的测试报告
- ✅ 易于扩展和维护

通过遵循本文档的指导，您可以有效地运行、编写和维护锦标赛系统的测试。 