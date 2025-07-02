# 锦标赛测试系统使用示例

## 🎯 实际运行示例

### 示例1: 基础测试运行

#### 在 Convex 控制台中运行
1. 打开 Convex Dashboard
2. 导航到 Functions
3. 找到 `service/tournament/tests/runUnifiedTests`
4. 点击 "Run" 并输入：
```json
{
    "testTypes": ["unit"],
    "verbose": true
}
```

#### 在 React 组件中运行
```typescript
import React, { useState } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function TestRunner() {
    const [testResult, setTestResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    
    const runTests = useMutation(api.service.tournament.tests.runUnifiedTests);
    const testStatus = useQuery(api.service.tournament.tests.getTestStatus);

    const handleRunUnitTests = async () => {
        setIsRunning(true);
        try {
            const result = await runTests({
                testTypes: ["unit"],
                verbose: true
            });
            setTestResult(result);
            console.log("单元测试结果:", result);
        } catch (error) {
            console.error("测试运行失败:", error);
        } finally {
            setIsRunning(false);
        }
    };

    const handleRunAllTests = async () => {
        setIsRunning(true);
        try {
            const result = await runTests({
                testTypes: ["unit", "integration", "scenario"],
                verbose: true,
                timeout: 60000
            });
            setTestResult(result);
            console.log("所有测试结果:", result);
        } catch (error) {
            console.error("测试运行失败:", error);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="test-runner">
            <h2>锦标赛测试运行器</h2>
            
            <div className="test-controls">
                <button 
                    onClick={handleRunUnitTests}
                    disabled={isRunning}
                >
                    {isRunning ? "运行中..." : "运行单元测试"}
                </button>
                
                <button 
                    onClick={handleRunAllTests}
                    disabled={isRunning}
                >
                    {isRunning ? "运行中..." : "运行所有测试"}
                </button>
            </div>

            <div className="test-status">
                <h3>测试系统状态</h3>
                <pre>{JSON.stringify(testStatus, null, 2)}</pre>
            </div>

            {testResult && (
                <div className="test-results">
                    <h3>测试结果</h3>
                    <div className="summary">
                        <p>总测试: {testResult.result.summary.total}</p>
                        <p>通过: {testResult.result.summary.passed} ✅</p>
                        <p>失败: {testResult.result.summary.failed} ❌</p>
                        <p>成功率: {testResult.result.summary.successRate.toFixed(1)}%</p>
                    </div>
                    <details>
                        <summary>详细结果</summary>
                        <pre>{JSON.stringify(testResult, null, 2)}</pre>
                    </details>
                </div>
            )}
        </div>
    );
}

export default TestRunner;
```

### 示例2: 特定测试运行

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function SpecificTestRunner() {
    const runSpecificTest = useMutation(api.service.tournament.tests.runSpecificTest);

    const runDailyJoinTest = async () => {
        try {
            const result = await runSpecificTest({
                testName: "scenario_daily_join"
            });
            console.log("每日加入测试结果:", result);
        } catch (error) {
            console.error("测试失败:", error);
        }
    };

    const runSinglePlayerTest = async () => {
        try {
            const result = await runSpecificTest({
                testName: "scenario_single_join"
            });
            console.log("单人锦标赛测试结果:", result);
        } catch (error) {
            console.error("测试失败:", error);
        }
    };

    return (
        <div>
            <button onClick={runDailyJoinTest}>运行每日加入测试</button>
            <button onClick={runSinglePlayerTest}>运行单人锦标赛测试</button>
        </div>
    );
}
```

### 示例3: 测试环境验证

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function TestEnvironmentChecker() {
    const testStatus = useQuery(api.service.tournament.tests.getTestStatus);

    return (
        <div className="environment-checker">
            <h3>测试环境检查</h3>
            <div className="status-indicators">
                <div className={`status ${testStatus?.status === 'ready' ? 'ready' : 'not-ready'}`}>
                    系统状态: {testStatus?.status || '检查中...'}
                </div>
                
                <div className="available-tests">
                    <h4>可用测试:</h4>
                    <ul>
                        {testStatus?.availableTests?.map((test: string) => (
                            <li key={test}>{test}</li>
                        ))}
                    </ul>
                </div>
                
                <div className="last-updated">
                    最后更新: {testStatus?.timestamp}
                </div>
            </div>
        </div>
    );
}
```

## 🧪 编写测试示例

### 示例1: 基础单元测试

```typescript
// basicUnitTest.ts
import { describe, it, expect, jest } from "./simpleTestFramework";
import { TournamentTestUtils } from "./testUtils";

describe("基础功能测试", () => {
    it("应该成功创建模拟上下文", () => {
        const ctx = TournamentTestUtils.createMockContext();
        expect(ctx).toBeDefined();
        expect(ctx.db).toBeDefined();
        expect(ctx.auth).toBeDefined();
        expect(ctx.scheduler).toBeDefined();
    });

    it("应该正确设置默认模拟", () => {
        const ctx = TournamentTestUtils.createMockContext();
        ctx.setupDefaultMocks();
        
        // 验证数据库模拟
        expect(ctx.db.query).toBeDefined();
        expect(ctx.db.insert).toBeDefined();
        expect(ctx.db.patch).toBeDefined();
        
        // 验证认证模拟
        expect(ctx.auth.getUserIdentity).toBeDefined();
    });

    it("应该正确创建模拟函数", () => {
        const mockFn = jest().fn();
        expect(mockFn).toBeDefined();
        expect(typeof mockFn).toBe('function');
        
        // 测试模拟函数调用
        mockFn.mockReturnValue("test result");
        const result = mockFn("test input");
        expect(result).toBe("test result");
        expect(mockFn).toHaveBeenCalledWith("test input");
    });
});
```

### 示例2: 锦标赛加入测试

```typescript
// tournamentJoinTest.ts
import { describe, it, expect, beforeEach } from "./simpleTestFramework";
import { TournamentTestUtils } from "./testUtils";
import { joinTournament } from "../tournamentService";

describe("锦标赛加入功能测试", () => {
    let ctx: any;

    beforeEach(() => {
        ctx = TournamentTestUtils.createMockContext();
        ctx.setupDefaultMocks();
    });

    it("应该成功加入每日特殊锦标赛", async () => {
        // 设置玩家数据
        ctx.setupMockForPlayer("player1", {
            uid: "player1",
            displayName: "测试玩家",
            segmentName: "gold",
            isSubscribed: true,
            totalPoints: 1000
        });

        // 设置库存数据
        ctx.setupMockForInventory("player1", {
            coins: 1000,
            tickets: [
                {
                    gameType: "solitaire",
                    tournamentType: "daily_special",
                    quantity: 5
                }
            ]
        });

        // 执行加入操作
        const result = await joinTournament(ctx, {
            uid: "player1",
            gameType: "solitaire",
            tournamentType: "daily_special"
        });

        // 验证结果
        expect(result.success).toBe(true);
        expect(result.tournamentId).toBeDefined();
        expect(result.matchId).toBeDefined();
        expect(result.gameId).toBeDefined();
    });

    it("应该拒绝金币不足的玩家", async () => {
        // 设置金币不足的库存
        ctx.setupMockForInventory("player1", {
            coins: 0,
            tickets: []
        });

        // 验证抛出错误
        await expect(
            joinTournament(ctx, {
                uid: "player1",
                gameType: "solitaire",
                tournamentType: "daily_special"
            })
        ).rejects.toThrow("金币不足");
    });

    it("应该检查每日参与限制", async () => {
        // 设置已达到限制
        ctx.setupMockForLimits("player1", {
            daily: {
                participationCount: 3,
                tournamentCount: 1,
                submissionCount: 3
            }
        });

        // 验证抛出错误
        await expect(
            joinTournament(ctx, {
                uid: "player1",
                gameType: "solitaire",
                tournamentType: "daily_special"
            })
        ).rejects.toThrow("今日已达最大参与次数");
    });
});
```

### 示例3: 分数提交测试

```typescript
// scoreSubmissionTest.ts
import { describe, it, expect, beforeEach } from "./simpleTestFramework";
import { TournamentTestUtils } from "./testUtils";
import { submitScore } from "../tournamentService";

describe("分数提交功能测试", () => {
    let ctx: any;

    beforeEach(() => {
        ctx = TournamentTestUtils.createMockContext();
        ctx.setupDefaultMocks();
    });

    it("应该成功提交分数", async () => {
        // 设置锦标赛和比赛数据
        const tournamentId = "tournament1";
        const matchId = "match1";
        
        ctx.setupMockForTournament(tournamentId, {
            _id: tournamentId,
            status: "open",
            gameType: "solitaire",
            tournamentType: "daily_special"
        });

        ctx.setupMockForMatch(matchId, {
            _id: matchId,
            tournamentId,
            status: "in_progress",
            gameType: "solitaire"
        });

        // 执行分数提交
        const result = await submitScore(ctx, {
            tournamentId,
            uid: "player1",
            gameType: "solitaire",
            score: 1000,
            gameData: { moves: 50, time: 300 },
            propsUsed: ["hint"],
            gameId: "game1"
        });

        // 验证结果
        expect(result.success).toBe(true);
        expect(result.score).toBe(1000);
        expect(result.matchId).toBe(matchId);
    });

    it("应该处理道具使用", async () => {
        // 设置道具使用场景
        const propsUsed = ["hint", "time_boost"];
        
        const result = await submitScore(ctx, {
            tournamentId: "tournament1",
            uid: "player1",
            gameType: "solitaire",
            score: 1200,
            gameData: { moves: 45, time: 280 },
            propsUsed,
            gameId: "game1"
        });

        // 验证道具使用记录
        expect(result.deductionResult).toBeDefined();
        expect(result.settleResult).toBeDefined();
    });
});
```

## 🔧 调试示例

### 示例1: 详细错误调试

```typescript
// debugTest.ts
import { describe, it, expect } from "./simpleTestFramework";
import { TournamentTestUtils } from "./testUtils";

describe("调试测试", () => {
    it("应该调试模拟上下文", () => {
        const ctx = TournamentTestUtils.createMockContext();
        ctx.setupDefaultMocks();
        
        // 打印模拟上下文结构
        console.log("模拟上下文结构:", {
            hasDb: !!ctx.db,
            hasAuth: !!ctx.auth,
            hasScheduler: !!ctx.scheduler,
            dbMethods: Object.keys(ctx.db || {}),
            authMethods: Object.keys(ctx.auth || {})
        });
        
        // 验证基本结构
        expect(ctx.db).toBeDefined();
        expect(ctx.auth).toBeDefined();
        expect(ctx.scheduler).toBeDefined();
    });

    it("应该调试模拟数据", () => {
        const { TEST_PLAYERS, TEST_INVENTORIES } = require("./mockData");
        
        // 打印模拟数据结构
        console.log("玩家数据结构:", {
            count: TEST_PLAYERS.length,
            sample: TEST_PLAYERS[0],
            fields: Object.keys(TEST_PLAYERS[0] || {})
        });
        
        console.log("库存数据结构:", {
            count: TEST_INVENTORIES.length,
            sample: TEST_INVENTORIES[0],
            fields: Object.keys(TEST_INVENTORIES[0] || {})
        });
        
        expect(TEST_PLAYERS.length).toBeGreaterThan(0);
        expect(TEST_INVENTORIES.length).toBeGreaterThan(0);
    });
});
```

### 示例2: 性能测试

```typescript
// performanceTest.ts
import { describe, it, expect } from "./simpleTestFramework";

describe("性能测试", () => {
    it("应该快速创建模拟上下文", () => {
        const startTime = Date.now();
        
        for (let i = 0; i < 100; i++) {
            const ctx = TournamentTestUtils.createMockContext();
            ctx.setupDefaultMocks();
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`创建100个模拟上下文耗时: ${duration}ms`);
        expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it("应该快速运行基础测试", async () => {
        const startTime = Date.now();
        
        // 运行一系列基础测试
        const ctx = TournamentTestUtils.createMockContext();
        ctx.setupDefaultMocks();
        
        // 模拟数据库操作
        for (let i = 0; i < 50; i++) {
            await ctx.db.insert("test_table", { id: i, data: `test_${i}` });
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`50次数据库操作耗时: ${duration}ms`);
        expect(duration).toBeLessThan(500); // 应该在500ms内完成
    });
});
```

## 📊 测试报告示例

### 示例1: 自定义测试报告

```typescript
// customTestReport.ts
import { describe, it, expect } from "./simpleTestFramework";

describe("自定义测试报告", () => {
    it("应该生成详细的测试统计", async () => {
        const testResults = {
            total: 15,
            passed: 12,
            failed: 2,
            skipped: 1,
            duration: 2500,
            suites: [
                {
                    name: "单元测试",
                    total: 8,
                    passed: 7,
                    failed: 1,
                    duration: 1200
                },
                {
                    name: "集成测试",
                    total: 5,
                    passed: 4,
                    failed: 1,
                    duration: 800
                },
                {
                    name: "场景测试",
                    total: 2,
                    passed: 1,
                    skipped: 1,
                    duration: 500
                }
            ]
        };

        // 计算成功率
        const successRate = (testResults.passed / testResults.total) * 100;
        
        // 生成报告
        const report = {
            summary: {
                total: testResults.total,
                passed: testResults.passed,
                failed: testResults.failed,
                skipped: testResults.skipped,
                successRate: successRate.toFixed(1),
                duration: testResults.duration
            },
            suites: testResults.suites.map(suite => ({
                ...suite,
                successRate: ((suite.passed / suite.total) * 100).toFixed(1)
            })),
            timestamp: new Date().toISOString()
        };

        console.log("自定义测试报告:", JSON.stringify(report, null, 2));
        
        expect(successRate).toBeGreaterThan(80); // 成功率应该大于80%
        expect(testResults.duration).toBeLessThan(5000); // 总耗时应该小于5秒
    });
});
```

## 🎯 实际使用场景

### 场景1: 开发过程中的测试

```typescript
// 在开发新功能时运行相关测试
const runFeatureTests = async (feature: string) => {
    const testMap = {
        'tournament-join': ['scenario_daily_join', 'scenario_single_join'],
        'score-submission': ['scenario_single_submit'],
        'multiplayer': ['scenario_multi_join', 'scenario_multi_matching']
    };

    const tests = testMap[feature] || [];
    
    if (tests.length > 0) {
        const result = await runTests({
            testTypes: ["scenario"],
            specificTests: tests,
            verbose: true
        });
        
        console.log(`${feature} 功能测试结果:`, result);
        return result.summary.failed === 0;
    }
    
    return true;
};
```

### 场景2: CI/CD 集成

```typescript
// 在 CI/CD 流程中运行测试
const runCITests = async () => {
    console.log("🚀 开始 CI 测试流程");
    
    // 1. 运行单元测试
    console.log("📦 运行单元测试...");
    const unitResult = await runTests({
        testTypes: ["unit"],
        verbose: false,
        stopOnFailure: true
    });
    
    if (unitResult.summary.failed > 0) {
        console.error("❌ 单元测试失败，停止流程");
        process.exit(1);
    }
    
    // 2. 运行集成测试
    console.log("🔗 运行集成测试...");
    const integrationResult = await runTests({
        testTypes: ["integration"],
        verbose: false,
        stopOnFailure: true
    });
    
    if (integrationResult.summary.failed > 0) {
        console.error("❌ 集成测试失败，停止流程");
        process.exit(1);
    }
    
    // 3. 运行关键场景测试
    console.log("🎯 运行关键场景测试...");
    const scenarioResult = await runTests({
        testTypes: ["scenario"],
        specificTests: ["scenario_daily_join", "scenario_single_join"],
        verbose: false,
        stopOnFailure: true
    });
    
    if (scenarioResult.summary.failed > 0) {
        console.error("❌ 场景测试失败，停止流程");
        process.exit(1);
    }
    
    console.log("✅ 所有测试通过，继续部署流程");
    return true;
};
```

### 场景3: 监控和告警

```typescript
// 定期运行测试并发送告警
const runMonitoringTests = async () => {
    const result = await runTests({
        testTypes: ["unit", "integration"],
        verbose: false
    });
    
    const successRate = result.summary.successRate;
    
    if (successRate < 95) {
        // 发送告警
        await sendAlert({
            level: "warning",
            message: `测试成功率下降: ${successRate}%`,
            details: result
        });
    }
    
    if (successRate < 90) {
        // 发送严重告警
        await sendAlert({
            level: "critical",
            message: `测试成功率严重下降: ${successRate}%`,
            details: result
        });
    }
    
    // 记录测试指标
    await recordMetrics({
        testSuccessRate: successRate,
        testDuration: result.summary.duration,
        testCount: result.summary.total,
        timestamp: new Date().toISOString()
    });
};
```

## 📝 总结

这些示例展示了如何：

1. **运行测试**: 通过不同方式运行测试
2. **编写测试**: 创建各种类型的测试用例
3. **调试问题**: 使用调试工具和技巧
4. **生成报告**: 创建自定义测试报告
5. **集成使用**: 在实际开发流程中使用测试

通过这些示例，您可以快速上手锦标赛测试系统，并根据需要扩展和定制测试功能。 