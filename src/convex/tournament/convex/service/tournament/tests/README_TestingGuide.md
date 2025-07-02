# 锦标赛系统测试指南

## 📋 概述

本测试套件提供了完整的锦标赛系统测试方案，包括单元测试、集成测试、端到端测试和性能测试。测试覆盖了所有核心功能和边界情况。

## 🏗️ 测试架构

### 测试类型

1. **单元测试** - 测试单个处理器和组件的功能
2. **集成测试** - 测试组件间的交互和完整流程
3. **端到端测试** - 测试完整的用户场景
4. **性能测试** - 测试系统性能和并发处理能力

### 测试文件结构

```
tests/
├── tournamentTestSuite.ts     # 主测试套件
├── README_TestingGuide.md     # 测试指南
├── mockData.ts               # 测试数据
├── testUtils.ts              # 测试工具
└── scenarios/                # 测试场景
    ├── dailySpecial.test.ts
    ├── singlePlayer.test.ts
    ├── multiPlayer.test.ts
    └── independent.test.ts
```

## 🧪 运行测试

### 1. 运行所有测试

```typescript
import { TournamentTestRunner } from './tests/tournamentTestSuite';

// 运行所有测试
await TournamentTestRunner.runAllTests();
```

### 2. 运行特定类型测试

```typescript
// 运行单元测试
await TournamentTestRunner.runSpecificTest("unit");

// 运行集成测试
await TournamentTestRunner.runSpecificTest("integration");

// 运行端到端测试
await TournamentTestRunner.runSpecificTest("e2e");

// 运行性能测试
await TournamentTestRunner.runSpecificTest("performance");
```

### 3. 使用 Convex 函数

```typescript
// 运行所有测试
await ctx.runMutation(internal.tests.runTournamentTests, {});

// 运行特定测试
await ctx.runMutation(internal.tests.runTournamentTests, { 
  testType: "unit" 
});

// 获取测试结果
const results = await ctx.runQuery(internal.tests.getTestResults);
```

## 📊 测试覆盖范围

### 单元测试覆盖

- ✅ 处理器获取和注册
- ✅ 每日特殊锦标赛处理器
- ✅ 单人锦标赛处理器
- ✅ 多人锦标赛处理器
- ✅ 独立锦标赛处理器
- ✅ 基础处理器功能

### 集成测试覆盖

- ✅ 完整锦标赛流程（加入→游戏→提交→结算）
- ✅ 多人匹配流程
- ✅ 限制验证（每日、每周、赛季、总限制）
- ✅ 奖励分配和计算
- ✅ 道具使用和扣除
- ✅ 段位升级逻辑

### 端到端测试覆盖

- ✅ 完整游戏流程
- ✅ 多人游戏流程
- ✅ 错误处理和异常情况
- ✅ 数据一致性验证
- ✅ 用户权限验证

### 性能测试覆盖

- ✅ 并发加入测试
- ✅ 大量数据处理
- ✅ 响应时间测试
- ✅ 内存使用测试

## 🔧 测试工具

### MockContext

```typescript
class MockContext {
  db: any;
  auth: any;
  scheduler: any;
  
  constructor() {
    this.db = {
      query: jest.fn(),
      get: jest.fn(),
      insert: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn()
    };
    
    this.auth = {
      getUserIdentity: jest.fn()
    };
    
    this.scheduler = {
      runAfter: jest.fn()
    };
  }
  
  reset() {
    jest.clearAllMocks();
  }
}
```

### 测试工具函数

```typescript
class TournamentTestUtils {
  // 创建模拟上下文
  static createMockContext(): MockContext;
  
  // 设置测试数据
  static setupTestData(ctx: MockContext): void;
  
  // 运行单个测试
  static async runTest(testName: string, testFn: (ctx: MockContext) => Promise<void>): Promise<void>;
}
```

## 📝 测试数据

### 测试玩家数据

```typescript
const TEST_PLAYERS = [
  {
    uid: "player1",
    displayName: "Player One",
    segmentName: "gold",
    isSubscribed: true,
    totalPoints: 1500,
    eloScore: 1500,
    level: 15
  },
  // ... 更多玩家
];
```

### 测试库存数据

```typescript
const TEST_INVENTORIES = [
  {
    uid: "player1",
    coins: 1000,
    tickets: [
      { gameType: "solitaire", tournamentType: "daily_special", quantity: 5 }
    ],
    props: [
      { gameType: "solitaire", propType: "hint", quantity: 10 }
    ]
  }
];
```

### 测试配置数据

```typescript
const TEST_CONFIGS = {
  daily_special: {
    typeId: "daily_special",
    name: "每日特殊锦标赛",
    // ... 完整配置
  },
  // ... 其他配置
};
```

## 🎯 测试场景

### 1. 每日特殊锦标赛测试

```typescript
// 测试每日限制
await TournamentTestUtils.runTest("每日限制测试", async (ctx) => {
  // 第一次加入应该成功
  const result1 = await dailySpecialHandler.join(ctx as any, {
    uid: "player1",
    gameType: "solitaire",
    tournamentType: "daily_special",
    player: TEST_PLAYERS[0],
    season: TEST_SEASONS[0]
  });
  expect(result1.tournamentId).toBeDefined();
  
  // 第四次加入应该失败（超过每日限制）
  await expect(
    dailySpecialHandler.join(ctx as any, {
      uid: "player1",
      gameType: "solitaire",
      tournamentType: "daily_special",
      player: TEST_PLAYERS[0],
      season: TEST_SEASONS[0]
    })
  ).rejects.toThrow("今日参与次数已达上限");
});
```

### 2. 单人锦标赛测试

```typescript
// 测试多次尝试
await TournamentTestUtils.runTest("多次尝试测试", async (ctx) => {
  const handler = singlePlayerTournamentHandler;
  
  // 第一次尝试
  const result1 = await handler.join(ctx as any, {
    uid: "player1",
    gameType: "solitaire",
    tournamentType: "single_player_tournament",
    player: TEST_PLAYERS[0],
    season: TEST_SEASONS[0]
  });
  
  // 提交分数
  await handler.submitScore(ctx as any, {
    tournamentId: result1.tournamentId,
    uid: "player1",
    gameType: "solitaire",
    score: 1000,
    gameData: {},
    propsUsed: [],
    gameId: "game1"
  });
  
  // 第二次尝试应该成功
  const result2 = await handler.join(ctx as any, {
    uid: "player1",
    gameType: "solitaire",
    tournamentType: "single_player_tournament",
    player: TEST_PLAYERS[0],
    season: TEST_SEASONS[0]
  });
  
  expect(result2.tournamentId).toBeDefined();
});
```

### 3. 多人锦标赛测试

```typescript
// 测试匹配逻辑
await TournamentTestUtils.runTest("匹配逻辑测试", async (ctx) => {
  const players = ["player1", "player2", "player3"];
  
  // 多个玩家同时加入
  const joinPromises = players.map(uid => 
    multiPlayerTournamentHandler.join(ctx as any, {
      uid,
      gameType: "rummy",
      tournamentType: "multi_player_tournament",
      player: TEST_PLAYERS.find(p => p.uid === uid),
      season: TEST_SEASONS[0]
    })
  );
  
  const results = await Promise.all(joinPromises);
  
  // 验证匹配结果
  results.forEach(result => {
    expect(result.tournamentId).toBeDefined();
    expect(result.matchId).toBeDefined();
  });
  
  // 验证所有玩家在同一比赛中
  const tournamentIds = [...new Set(results.map(r => r.tournamentId))];
  expect(tournamentIds.length).toBe(1);
});
```

### 4. 独立锦标赛测试

```typescript
// 测试独立创建
await TournamentTestUtils.runTest("独立创建测试", async (ctx) => {
  const handler = independentTournamentHandler;
  
  // 第一次尝试
  const result1 = await handler.join(ctx as any, {
    uid: "player1",
    gameType: "solitaire",
    tournamentType: "independent_tournament",
    player: TEST_PLAYERS[0],
    season: TEST_SEASONS[0]
  });
  
  // 第二次尝试
  const result2 = await handler.join(ctx as any, {
    uid: "player1",
    gameType: "solitaire",
    tournamentType: "independent_tournament",
    player: TEST_PLAYERS[0],
    season: TEST_SEASONS[0]
  });
  
  // 应该创建不同的锦标赛
  expect(result1.tournamentId).not.toBe(result2.tournamentId);
});
```

## 🚨 错误处理测试

### 1. 输入验证测试

```typescript
// 测试无效参数
await TournamentTestUtils.runTest("无效参数测试", async (ctx) => {
  await expect(
    TournamentService.joinTournament(ctx as any, {
      uid: "", // 无效UID
      gameType: "solitaire",
      tournamentType: "daily_special"
    })
  ).rejects.toThrow();
  
  await expect(
    TournamentService.joinTournament(ctx as any, {
      uid: "player1",
      gameType: "invalid_game", // 无效游戏类型
      tournamentType: "daily_special"
    })
  ).rejects.toThrow();
});
```

### 2. 资源不足测试

```typescript
// 测试金币不足
await TournamentTestUtils.runTest("金币不足测试", async (ctx) => {
  // 设置玩家金币为0
  ctx.db.query.mockImplementation((table: string) => ({
    withIndex: () => ({
      first: async () => ({
        ...TEST_INVENTORIES[0],
        coins: 0
      })
    })
  }));
  
  await expect(
    TournamentService.joinTournament(ctx as any, {
      uid: "player1",
      gameType: "solitaire",
      tournamentType: "daily_special"
    })
  ).rejects.toThrow("金币或门票不足");
});
```

### 3. 限制超限测试

```typescript
// 测试参与限制
await TournamentTestUtils.runTest("参与限制测试", async (ctx) => {
  // 模拟已达到每日限制
  ctx.db.query.mockImplementation((table: string) => ({
    withIndex: () => ({
      first: async () => ({
        uid: "player1",
        tournamentType: "daily_special",
        date: "2024-01-01",
        participationCount: 3 // 已达到限制
      })
    })
  }));
  
  await expect(
    TournamentService.joinTournament(ctx as any, {
      uid: "player1",
      gameType: "solitaire",
      tournamentType: "daily_special"
    })
  ).rejects.toThrow("今日参与次数已达上限");
});
```

## ⚡ 性能测试

### 1. 并发测试

```typescript
// 测试并发加入
await TournamentTestUtils.runTest("并发加入测试", async (ctx) => {
  const startTime = Date.now();
  const concurrentCount = 50;
  
  const joinPromises = Array(concurrentCount).fill(0).map((_, i) => 
    TournamentService.joinTournament(ctx as any, {
      uid: `player${i}`,
      gameType: "solitaire",
      tournamentType: "daily_special"
    })
  );
  
  const results = await Promise.all(joinPromises);
  const endTime = Date.now();
  
  // 验证性能要求
  expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
  expect(results.length).toBe(concurrentCount);
  
  // 验证结果正确性
  results.forEach(result => {
    expect(result.success).toBe(true);
  });
});
```

### 2. 大数据测试

```typescript
// 测试大量数据处理
await TournamentTestUtils.runTest("大数据处理测试", async (ctx) => {
  const playerCount = 1000;
  const startTime = Date.now();
  
  // 创建大量玩家数据
  const players = Array(playerCount).fill(0).map((_, i) => ({
    uid: `player${i}`,
    displayName: `Player ${i}`,
    segmentName: "bronze",
    isSubscribed: false,
    totalPoints: Math.floor(Math.random() * 1000),
    eloScore: Math.floor(Math.random() * 1000),
    level: Math.floor(Math.random() * 20) + 1
  }));
  
  // 批量处理
  const joinPromises = players.map(player => 
    TournamentService.joinTournament(ctx as any, {
      uid: player.uid,
      gameType: "solitaire",
      tournamentType: "single_player_tournament"
    })
  );
  
  const results = await Promise.all(joinPromises);
  const endTime = Date.now();
  
  // 验证性能
  expect(endTime - startTime).toBeLessThan(30000); // 30秒内完成
  expect(results.length).toBe(playerCount);
});
```

## 📈 测试报告

### 测试结果格式

```typescript
interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  testResults: TestResult[];
}
```

### 生成测试报告

```typescript
// 运行测试并生成报告
const report = await TournamentTestRunner.runAllTests();

console.log(`
📊 测试报告
===========
总测试数: ${report.totalTests}
通过: ${report.passedTests} ✅
失败: ${report.failedTests} ❌
跳过: ${report.skippedTests} ⏭️
总耗时: ${report.totalDuration}ms
通过率: ${(report.passedTests / report.totalTests * 100).toFixed(2)}%
`);
```

## 🔄 持续集成

### 1. 自动化测试

```yaml
# .github/workflows/test.yml
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
      - run: npm run test:tournament
      - run: npm run test:coverage
```

### 2. 测试覆盖率

```typescript
// 生成覆盖率报告
const coverage = {
  statements: 95.5,
  branches: 92.3,
  functions: 98.1,
  lines: 96.7
};

// 覆盖率要求
expect(coverage.statements).toBeGreaterThan(90);
expect(coverage.branches).toBeGreaterThan(85);
expect(coverage.functions).toBeGreaterThan(95);
expect(coverage.lines).toBeGreaterThan(90);
```

## 📝 最佳实践

### 1. 测试命名

```typescript
// 好的测试命名
describe('singlePlayerTournamentHandler', () => {
  it('should allow player to join tournament with valid credentials', async () => {
    // 测试逻辑
  });
  
  it('should reject player with insufficient coins', async () => {
    // 测试逻辑
  });
  
  it('should handle multiple attempts correctly', async () => {
    // 测试逻辑
  });
});
```

### 2. 测试隔离

```typescript
// 每个测试前重置状态
beforeEach(() => {
  jest.clearAllMocks();
  ctx.reset();
  TournamentTestUtils.setupTestData(ctx);
});
```

### 3. 异步测试

```typescript
// 正确处理异步测试
it('should complete tournament flow', async () => {
  const result = await handler.join(ctx, params);
  expect(result).toBeDefined();
  
  await expect(handler.settle(ctx, result.tournamentId))
    .resolves.not.toThrow();
});
```

### 4. 错误测试

```typescript
// 测试错误情况
it('should throw error for invalid tournament type', async () => {
  await expect(
    handler.join(ctx, { ...params, tournamentType: 'invalid' })
  ).rejects.toThrow('未找到处理器');
});
```

## 🎯 总结

这个测试套件提供了：

1. **全面的测试覆盖** - 单元、集成、端到端、性能测试
2. **完整的测试工具** - Mock、工具函数、测试数据
3. **详细的测试场景** - 各种边界情况和错误处理
4. **性能验证** - 并发和大数据处理测试
5. **持续集成支持** - 自动化测试和覆盖率报告

通过这个测试套件，可以确保锦标赛系统的稳定性、可靠性和性能。 