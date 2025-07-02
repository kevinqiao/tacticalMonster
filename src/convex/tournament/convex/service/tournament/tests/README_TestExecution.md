# 锦标赛系统测试执行指南

## 🚀 快速开始

### 1. 运行所有测试

```typescript
// 使用默认配置运行所有测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, {});

// 运行完整测试套件
await ctx.runMutation(internal.tests.testRunner.fullTest, {});
```

### 2. 运行快速测试

```typescript
// 快速测试 - 只运行核心功能
await ctx.runMutation(internal.tests.testRunner.quickTest, {});

// 冒烟测试 - 基本功能验证
await ctx.runMutation(internal.tests.testRunner.smokeTest, {});
```

### 3. 运行特定测试

```typescript
// 运行单元测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  testName: "unit" 
});

// 运行集成测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  testName: "integration" 
});

// 运行端到端测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  testName: "e2e" 
});

// 运行性能测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  testName: "performance" 
});
```

### 4. 运行处理器测试

```typescript
// 运行单人锦标赛测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  testName: "singlePlayer" 
});

// 运行多人锦标赛测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  testName: "multiPlayer" 
});

// 运行所有处理器测试
await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  testName: "handlers" 
});
```

## ⚙️ 测试配置

### 默认配置

```typescript
const DEFAULT_CONFIG = {
  testTypes: ["unit", "integration", "e2e"],
  handlers: ["singlePlayer", "multiPlayer", "dailySpecial", "independent"],
  options: {
    verbose: true,
    stopOnError: false,
    timeout: 30000,
    parallel: false
  }
};
```

### 自定义配置

```typescript
const customConfig = {
  testTypes: ["unit", "integration"], // 只运行单元和集成测试
  handlers: ["singlePlayer"], // 只测试单人锦标赛
  options: {
    verbose: false, // 减少输出
    stopOnError: true, // 遇到错误立即停止
    timeout: 15000, // 15秒超时
    parallel: true // 并行执行
  }
};

await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  config: customConfig 
});
```

### 获取默认配置

```typescript
const config = await ctx.runQuery(internal.tests.testRunner.getTestConfig);
console.log("默认配置:", config);
```

### 验证配置

```typescript
const validation = await ctx.runQuery(internal.tests.testRunner.validateTestConfig, {
  config: customConfig
});

if (!validation.valid) {
  console.error("配置错误:", validation.errors);
}
```

## 📊 测试结果

### 获取测试结果

```typescript
const results = await ctx.runQuery(internal.tests.testRunner.getTestResults);
console.log("可用测试:", results.availableTests);
console.log("测试套件:", results.testSuites);
```

### 测试结果格式

```typescript
interface TestResult {
  testName: string;
  testType: string;
  handler?: string;
  status: "passed" | "failed" | "skipped" | "timeout";
  duration: number;
  error?: string;
  details?: any;
  timestamp: string;
}

interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  timeoutTests: number;
  totalDuration: number;
  testResults: TestResult[];
  summary: {
    successRate: number;
    averageDuration: number;
    slowestTest: string;
    fastestTest: string;
  };
}
```

### 示例输出

```
============================================================
📊 锦标赛系统测试报告
============================================================

📈 总体统计:
   总测试数: 24
   通过: 22 ✅
   失败: 1 ❌
   跳过: 1 ⏭️
   超时: 0 ⏰
   总耗时: 15420ms
   通过率: 91.67%

⚡ 性能统计:
   平均耗时: 642.50ms
   最快测试: 单元测试 (45ms)
   最慢测试: 端到端测试 (3200ms)

❌ 失败的测试:
   - 多人匹配测试: 匹配服务不可用

============================================================
⚠️  部分测试失败，请检查上述错误信息
============================================================
```

## 🎯 测试场景

### 1. 开发阶段测试

```typescript
// 开发时运行快速测试
const devConfig = {
  testTypes: ["unit"],
  handlers: ["singlePlayer"],
  options: {
    verbose: true,
    stopOnError: true,
    timeout: 10000,
    parallel: false
  }
};

await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  config: devConfig 
});
```

### 2. 集成测试

```typescript
// 集成测试配置
const integrationConfig = {
  testTypes: ["integration"],
  handlers: ["singlePlayer", "multiPlayer"],
  options: {
    verbose: true,
    stopOnError: false,
    timeout: 30000,
    parallel: true
  }
};

await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  config: integrationConfig 
});
```

### 3. 性能测试

```typescript
// 性能测试配置
const performanceConfig = {
  testTypes: ["performance"],
  handlers: ["singlePlayer", "multiPlayer"],
  options: {
    verbose: false,
    stopOnError: false,
    timeout: 60000,
    parallel: true
  }
};

await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  config: performanceConfig 
});
```

### 4. 完整回归测试

```typescript
// 完整回归测试
const regressionConfig = {
  testTypes: ["unit", "integration", "e2e"],
  handlers: ["singlePlayer", "multiPlayer", "dailySpecial", "independent"],
  options: {
    verbose: true,
    stopOnError: false,
    timeout: 120000,
    parallel: true
  }
};

await ctx.runMutation(internal.tests.testRunner.runTournamentTests, { 
  config: regressionConfig 
});
```

## 🔧 调试测试

### 1. 启用详细输出

```typescript
const debugConfig = {
  testTypes: ["unit"],
  handlers: ["singlePlayer"],
  options: {
    verbose: true, // 启用详细输出
    stopOnError: true, // 遇到错误立即停止
    timeout: 30000,
    parallel: false
  }
};
```

### 2. 运行单个测试

```typescript
// 运行特定的单人锦标赛测试
await ctx.runMutation(internal.tests.singlePlayerTournament.runSinglePlayerTournamentTests, {
  testName: "join" // 只测试加入功能
});

// 运行特定的多人锦标赛测试
await ctx.runMutation(internal.tests.multiPlayerTournament.runMultiPlayerTournamentTests, {
  testName: "matching" // 只测试匹配功能
});
```

### 3. 查看测试详情

```typescript
// 获取单人锦标赛测试详情
const singlePlayerTests = await ctx.runQuery(
  internal.tests.singlePlayerTournament.getSinglePlayerTournamentTestResults
);

// 获取多人锦标赛测试详情
const multiPlayerTests = await ctx.runQuery(
  internal.tests.multiPlayerTournament.getMultiPlayerTournamentTestResults
);
```

## 📈 性能监控

### 1. 测试性能基准

```typescript
// 运行性能基准测试
const benchmarkConfig = {
  testTypes: ["performance"],
  handlers: ["singlePlayer", "multiPlayer"],
  options: {
    verbose: false,
    stopOnError: false,
    timeout: 120000,
    parallel: true
  }
};

const benchmarkResult = await ctx.runMutation(
  internal.tests.testRunner.runTournamentTests, 
  { config: benchmarkConfig }
);

// 分析性能结果
console.log("平均响应时间:", benchmarkResult.result.summary.averageDuration);
console.log("最慢测试:", benchmarkResult.result.summary.slowestTest);
console.log("最快测试:", benchmarkResult.result.summary.fastestTest);
```

### 2. 性能回归检测

```typescript
// 比较性能结果
const currentResult = await ctx.runMutation(
  internal.tests.testRunner.runTournamentTests, 
  { testName: "performance" }
);

const baselineResult = {
  averageDuration: 500, // 基准平均时间
  maxDuration: 2000     // 基准最大时间
};

// 检查性能回归
if (currentResult.result.summary.averageDuration > baselineResult.averageDuration * 1.2) {
  console.warn("⚠️ 检测到性能回归");
}

if (currentResult.result.summary.slowestTest.duration > baselineResult.maxDuration) {
  console.warn("⚠️ 检测到超时测试");
}
```

## 🚨 错误处理

### 1. 常见错误

```typescript
// 配置错误
try {
  await ctx.runMutation(internal.tests.testRunner.runTournamentTests, {
    config: { invalid: "config" }
  });
} catch (error) {
  console.error("配置错误:", error.message);
}

// 超时错误
try {
  await ctx.runMutation(internal.tests.testRunner.runTournamentTests, {
    config: {
      testTypes: ["e2e"],
      handlers: ["singlePlayer"],
      options: { timeout: 1000 } // 1秒超时
    }
  });
} catch (error) {
  console.error("测试超时:", error.message);
}
```

### 2. 错误恢复

```typescript
// 重试机制
async function runTestsWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await ctx.runMutation(
        internal.tests.testRunner.runTournamentTests, 
        { testName: "unit" }
      );
      return result;
    } catch (error) {
      console.error(`第 ${i + 1} 次尝试失败:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }
  }
}
```

## 📝 最佳实践

### 1. 测试执行策略

```typescript
// 开发阶段 - 快速反馈
const devStrategy = {
  onCodeChange: () => runQuickTest(),
  onFeatureComplete: () => runIntegrationTest(),
  onRelease: () => runFullTest()
};

// 持续集成 - 自动化测试
const ciStrategy = {
  onPush: () => runSmokeTest(),
  onPullRequest: () => runUnitAndIntegrationTest(),
  onMerge: () => runFullTest()
};
```

### 2. 测试数据管理

```typescript
// 使用隔离的测试数据
const testDataConfig = {
  players: [
    { uid: "test_player_1", segmentName: "gold" },
    { uid: "test_player_2", segmentName: "silver" }
  ],
  tournaments: [
    { typeId: "test_tournament", gameType: "solitaire" }
  ]
};

// 清理测试数据
async function cleanupTestData() {
  // 清理测试过程中创建的数据
  await ctx.runMutation(cleanupTestData, {});
}
```

### 3. 测试报告

```typescript
// 生成测试报告
async function generateTestReport() {
  const result = await ctx.runMutation(
    internal.tests.testRunner.runTournamentTests, 
    { testName: "full" }
  );
  
  const report = {
    timestamp: new Date().toISOString(),
    success: result.success,
    summary: result.result.summary,
    details: result.result.testResults
  };
  
  // 保存报告
  await ctx.runMutation(saveTestReport, { report });
  
  return report;
}
```

## 🔄 持续集成

### 1. GitHub Actions

```yaml
name: Tournament Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - name: Run Tournament Tests
        run: |
          npm run test:tournament:smoke
      - name: Run Full Tests
        if: github.event_name == 'push'
        run: |
          npm run test:tournament:full
```

### 2. 测试脚本

```json
{
  "scripts": {
    "test:tournament:smoke": "convex run internal.tests.testRunner.smokeTest",
    "test:tournament:quick": "convex run internal.tests.testRunner.quickTest",
    "test:tournament:unit": "convex run internal.tests.testRunner.runTournamentTests --testName unit",
    "test:tournament:integration": "convex run internal.tests.testRunner.runTournamentTests --testName integration",
    "test:tournament:e2e": "convex run internal.tests.testRunner.runTournamentTests --testName e2e",
    "test:tournament:performance": "convex run internal.tests.testRunner.runTournamentTests --testName performance",
    "test:tournament:full": "convex run internal.tests.testRunner.fullTest"
  }
}
```

通过这个完整的测试执行指南，你可以有效地运行和管理锦标赛系统的各种测试，确保系统的质量和稳定性。 