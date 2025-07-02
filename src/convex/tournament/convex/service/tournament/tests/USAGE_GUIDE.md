# 🏆 锦标赛测试系统使用指南

## 概述

`runUnifiedTests` 是锦标赛测试系统的核心函数，提供了完整的测试管理和执行功能。它支持多种测试类型，包括单元测试、集成测试、场景测试等。

## 函数位置

`runUnifiedTests` 函数位于：
```
develop/src/convex/tournament/convex/service/tournament/tests/testRunner.ts
```

## 函数签名

```typescript
export const runUnifiedTests = query({
    args: {
        testTypes: v.optional(v.array(v.string())),
        specificTests: v.optional(v.array(v.string())),
        timeout: v.optional(v.number()),
        verbose: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        // 实现逻辑
    }
});
```

## 使用方法

### 1. 在 Convex 函数中调用

```typescript
import { api } from "../../../_generated/api";

// 运行所有测试
const result = await ctx.runQuery(api.service.tournament.tests.runUnifiedTests, {
    testTypes: ["unit", "scenario"],
    timeout: 30000,
    verbose: true
});

console.log("测试结果:", result);
```

### 2. 在 React 组件中使用

```typescript
import { useMutation } from 'convex/react';
import { api } from '../../../../_generated/api';

function TestComponent() {
    const runTests = useMutation(api.service.tournament.tests.runUnifiedTests);

    const handleRunTests = async () => {
        try {
            const result = await runTests({
                testTypes: ["unit", "scenario"],
                timeout: 30000,
                verbose: true
            });
            console.log("测试结果:", result);
        } catch (error) {
            console.error("测试失败:", error);
        }
    };

    return (
        <button onClick={handleRunTests}>
            运行测试
        </button>
    );
}
```

### 3. 在客户端直接调用

```typescript
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const result = await client.query(api.service.tournament.tests.runUnifiedTests, {
    testTypes: ["unit"],
    timeout: 10000,
    verbose: false
});
```

## 参数说明

### testTypes (可选)
测试类型数组，支持以下值：
- `"unit"` - 单元测试
- `"integration"` - 集成测试
- `"e2e"` - 端到端测试
- `"performance"` - 性能测试
- `"scenario"` - 场景测试

### specificTests (可选)
特定测试名称数组，用于运行指定的测试：
```typescript
specificTests: ["scenario_daily_join", "scenario_single_join"]
```

### timeout (可选)
测试超时时间（毫秒），默认 30000ms

### verbose (可选)
是否显示详细输出，默认 true

## 返回值

```typescript
{
    success: boolean;           // 是否所有测试都通过
    result: TestExecutionResult; // 详细的测试结果
    message: string;            // 结果消息
}
```

### TestExecutionResult 结构

```typescript
{
    suites: TestSuiteResult[];  // 测试套件结果
    summary: {
        total: number;          // 总测试数
        passed: number;         // 通过数
        failed: number;         // 失败数
        skipped: number;        // 跳过数
        duration: number;       // 总耗时
        successRate: number;    // 成功率
    };
    config: TestConfig;         // 测试配置
}
```

## 使用示例

### 示例 1：运行所有测试

```typescript
const result = await runTests({
    testTypes: ["unit", "integration", "scenario"],
    timeout: 60000,
    verbose: true
});

if (result.success) {
    console.log("🎉 所有测试通过！");
} else {
    console.log(`❌ ${result.result.summary.failed} 个测试失败`);
}
```

### 示例 2：运行特定测试

```typescript
const result = await runTests({
    specificTests: ["scenario_daily_join", "scenario_single_join"],
    timeout: 15000,
    verbose: false
});
```

### 示例 3：只运行单元测试

```typescript
const result = await runTests({
    testTypes: ["unit"],
    timeout: 10000
});
```

## 测试页面

我们还提供了一个完整的测试页面组件：`TestRunnerPage.tsx`

### 使用方法

```typescript
import TestRunnerPage from './service/tournament/tests/TestRunnerPage';

// 在你的应用中
<TestRunnerPage />
```

这个页面提供了：
- 测试配置界面
- 实时测试状态显示
- 测试结果可视化
- 调试信息查看

## 调试和故障排除

### 1. 检查函数是否可用

```typescript
const debugInfo = await ctx.runQuery(api.service.tournament.tests.debugTestSystem);
console.log("调试信息:", debugInfo);
```

### 2. 验证测试环境

```typescript
const testValidation = await ctx.runQuery(api.service.tournament.tests.testRunUnifiedTests);
console.log("测试验证:", testValidation);
```

### 3. 获取测试状态

```typescript
const testStatus = await ctx.runQuery(api.service.tournament.tests.getTestStatus);
console.log("测试状态:", testStatus);
```

## 常见问题

### Q: 为什么看不到 runUnifiedTests 函数？

A: 确保：
1. 文件路径正确：`testRunner.ts`
2. 函数已正确导出
3. 导入路径正确

### Q: 测试运行失败怎么办？

A: 
1. 检查 `debugTestSystem` 的输出
2. 查看控制台错误信息
3. 验证测试环境配置

### Q: 如何添加新的测试？

A: 
1. 在相应的测试文件中添加测试函数
2. 更新测试配置
3. 重新运行测试

## 相关文件

- `testRunner.ts` - 主要测试运行器
- `simpleTestFramework.ts` - 简单测试框架
- `testUtils.ts` - 测试工具
- `mockData.ts` - 测试数据
- `scenarios/simpleScenarioTests.ts` - 场景测试
- `TestRunnerPage.tsx` - 测试页面组件

## 支持

如果遇到问题，请检查：
1. 控制台错误信息
2. 网络连接状态
3. Convex 函数日志
4. 测试环境配置 