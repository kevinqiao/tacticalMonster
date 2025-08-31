# 推荐排名系统测试指南

## 📋 测试概述

本指南介绍如何全面测试推荐排名系统的功能、性能和可靠性。系统提供了多层次的测试工具，从单元测试到集成测试，从功能验证到性能基准测试。

## 🧪 测试文件结构

```
test/
├── RankingRecommendationTest.ts     # 完整测试套件（模拟环境）
├── TestRunner.ts                    # 实际环境测试运行器
└── ../functions/testRankingRecommendation.ts  # Convex函数测试接口
```

## 🚀 快速开始

### 1. 在Convex Dashboard中运行测试

最简单的方式是在Convex Dashboard中直接调用测试函数：

```javascript
// 快速验证测试
await ctx.runMutation("scoreThresholdControl:runQuickRankingTest", {});

// 完整测试套件
await ctx.runMutation("scoreThresholdControl:runFullRankingTest", {});
```

### 2. 测试单个玩家排名

```javascript
// 测试专家级玩家
await ctx.runMutation("scoreThresholdControl:testSinglePlayerRanking", {
    uid: "expert_player_001",
    score: 12000,
    aiCount: 5
});

// 测试新手玩家
await ctx.runMutation("scoreThresholdControl:testSinglePlayerRanking", {
    uid: "newbie_player_001", 
    score: 3000,
    aiCount: 5
});
```

### 3. 测试多玩家场景

```javascript
await ctx.runMutation("scoreThresholdControl:testMultiPlayerRanking", {
    players: [
        { uid: "player_001", score: 12000 },
        { uid: "player_002", score: 8500 },
        { uid: "player_003", score: 5000 }
    ],
    aiCount: 3
});
```

## 📊 测试类型详解

### 1. 功能验证测试

#### **单玩家排名推荐**
- **测试目标**: 验证单个玩家的排名推荐准确性
- **测试内容**: 
  - 推荐排名合理性
  - 信心度计算
  - AI对手生成
  - 相对表现评估

```typescript
// 示例结果
{
    success: true,
    player: {
        uid: "expert_001",
        recommendedRank: 2,
        confidence: 0.85,
        relativePerformance: "excellent",
        reasoning: "当前表现优异（得分12000），比历史平均提升15.2%..."
    },
    aiOpponents: [
        { uid: "ai_1", rank: 1, score: 12500, difficulty: "extreme" },
        { uid: "ai_2", rank: 3, score: 11500, difficulty: "hard" }
        // ...
    ]
}
```

#### **多玩家排名推荐**
- **测试目标**: 验证多玩家间的排名逻辑
- **测试内容**:
  - 分数排序一致性
  - 相对排名合理性
  - AI填充逻辑
  - 技能水平适配

#### **Controller接口测试**
- **测试目标**: 验证对外API的稳定性
- **测试内容**:
  - 接口响应格式
  - 错误处理机制
  - 兼容性保证

### 2. 技能水平测试

#### **不同水平玩家对比**
```javascript
await ctx.runMutation("scoreThresholdControl:compareSkillLevelRankings", {
    testScores: [3000, 6000, 9000, 12000], // 新手到专家
    aiCount: 5
});
```

**预期结果**:
- 新手玩家(3000分): 更多支持性AI，较低排名期望
- 中级玩家(6000-9000分): 平衡的AI配置
- 专家玩家(12000分): 更多挑战性AI，较高排名期望

#### **表现一致性测试**
- **测试目标**: 验证相同输入的推荐一致性
- **方法**: 多次运行相同参数的推荐
- **标准**: 标准差 < 1.5

### 3. 边界条件测试

#### **极端分数测试**
```javascript
// 测试极端情况
const extremeScores = [0, 1, 100, 50000, 999999];
```

#### **极端参与者数量**
```javascript
// 测试不同规模比赛
const participantCounts = [2, 4, 8, 12, 20];
```

#### **相同分数处理**
```javascript
// 测试分数相同的多个玩家
const samePlayers = [
    { uid: "player_1", score: 8000 },
    { uid: "player_2", score: 8000 },
    { uid: "player_3", score: 8000 }
];
```

### 4. 性能基准测试

#### **响应时间测试**
- **目标**: 平均响应时间 < 100ms
- **方法**: 连续执行多次推荐，计算平均时间
- **指标**: QPS (每秒查询数)

#### **并发性能测试**
- **目标**: 验证并发请求处理能力
- **方法**: 同时执行多个推荐任务
- **指标**: 成功率、平均响应时间

## 🔧 测试配置

### 测试数据配置

测试系统使用模拟的历史数据：

```typescript
// 专家级玩家数据
const expertData = [
    { score: 12000, rank: 1, segmentName: 'diamond' },
    { score: 11500, rank: 2, segmentName: 'diamond' },
    // ... 更多历史数据
];

// 新手玩家数据  
const beginnerData = [
    { score: 3200, rank: 5, segmentName: 'bronze' },
    { score: 3000, rank: 6, segmentName: 'bronze' },
    // ... 更多历史数据
];
```

### 断言和验证

测试系统包含全面的断言机制：

```typescript
// 基本验证
this.assert(result.success, '推荐应该成功');
this.assert(rank >= 1 && rank <= totalParticipants, '排名应在有效范围内');

// 逻辑验证
this.assert(expertRank < newbieRank, '专家排名应该优于新手');
this.assert(confidence > 0.5, '专家玩家信心度应该较高');

// 数据完整性验证
this.validateMatchRankingResult(result);
```

## 📈 测试结果分析

### 成功标准

#### **功能测试**
- ✅ 所有基本功能正常工作
- ✅ 排名逻辑符合预期
- ✅ AI生成合理
- ✅ 错误处理正确

#### **性能测试**
- ✅ 平均响应时间 < 100ms
- ✅ QPS > 10
- ✅ 99%的请求成功
- ✅ 内存使用稳定

#### **一致性测试**
- ✅ 相同输入推荐一致 (标准差 < 1.5)
- ✅ 分数排序逻辑正确
- ✅ 边界条件处理正确

### 失败诊断

#### **常见问题**

1. **排名不合理**
   ```
   症状: 高分玩家获得低排名
   原因: 历史数据不足或技能评估偏差
   解决: 检查玩家历史数据，调整技能计算权重
   ```

2. **信心度过低**
   ```
   症状: 所有推荐信心度 < 0.5
   原因: 数据不足或一致性差
   解决: 增加历史数据要求，优化一致性计算
   ```

3. **性能问题**
   ```
   症状: 响应时间 > 200ms
   原因: 数据库查询效率低或计算复杂
   解决: 优化查询，添加索引，简化计算逻辑
   ```

4. **AI生成异常**
   ```
   症状: AI分数不合理或难度分布异常
   原因: AI生成算法参数不当
   解决: 调整AI生成策略和参数
   ```

## 🛠️ 自定义测试

### 创建自定义测试场景

```typescript
// 自定义测试场景
async function customScenarioTest() {
    const scenarios = [
        {
            name: "高手云集",
            players: [
                { uid: "pro1", score: 15000 },
                { uid: "pro2", score: 14500 },
                { uid: "pro3", score: 14000 }
            ],
            aiCount: 5,
            expectedPattern: "竞争激烈，排名接近"
        },
        {
            name: "新手友好",
            players: [
                { uid: "newbie1", score: 2000 },
                { uid: "newbie2", score: 2500 }
            ],
            aiCount: 4,
            expectedPattern: "支持性AI居多"
        }
    ];
    
    for (const scenario of scenarios) {
        console.log(`测试场景: ${scenario.name}`);
        const result = await rankingManager.generateMatchRankings(
            scenario.players, 
            scenario.aiCount
        );
        
        // 自定义验证逻辑
        validateScenario(result, scenario);
    }
}
```

### 添加新的测试指标

```typescript
// 扩展测试指标
interface ExtendedTestResult {
    // 基本指标
    success: boolean;
    responseTime: number;
    
    // 业务指标  
    rankingFairness: number;      // 排名公平性评分
    aiDiversityScore: number;     // AI多样性评分
    userSatisfactionEst: number;  // 用户满意度估计
    
    // 技术指标
    memoryUsage: number;
    cacheHitRate: number;
}
```

## 📝 测试报告

### 自动化报告生成

测试系统会自动生成详细的测试报告：

```json
{
    "testSuite": "推荐排名系统完整测试",
    "timestamp": "2024-01-20T10:30:00Z",
    "summary": {
        "totalTests": 13,
        "passed": 12,
        "failed": 1,
        "successRate": 92.3
    },
    "performance": {
        "averageResponseTime": 45.2,
        "qps": 22.1,
        "memoryUsage": "12.5MB"
    },
    "coverage": {
        "functionalTests": "100%",
        "edgeCases": "90%",
        "performanceTests": "100%"
    }
}
```

## 🔄 持续测试

### 集成到CI/CD

```yaml
# 示例CI配置
test-ranking-system:
  steps:
    - name: Quick Validation
      run: convex run scoreThresholdControl:runQuickRankingTest
    
    - name: Performance Benchmark  
      run: convex run scoreThresholdControl:runFullRankingTest
      
    - name: Generate Report
      run: convex run scoreThresholdControl:getTestStatus
```

### 监控和告警

```typescript
// 监控指标
const healthCheck = {
    responseTime: '< 100ms',
    successRate: '> 95%',
    memoryUsage: '< 50MB',
    errorRate: '< 1%'
};
```

## 🎯 最佳实践

### 测试策略

1. **分层测试**: 单元测试 → 集成测试 → 端到端测试
2. **数据驱动**: 使用真实的历史数据进行测试
3. **自动化优先**: 所有测试都应该能自动执行
4. **持续监控**: 定期运行测试，监控系统健康状态

### 测试数据管理

1. **数据隔离**: 测试数据与生产数据分离
2. **数据清理**: 测试后清理临时数据
3. **数据版本**: 维护不同版本的测试数据集
4. **数据安全**: 不在测试中使用真实用户数据

### 问题排查

1. **日志记录**: 详细记录测试过程和结果
2. **错误分类**: 区分功能错误、性能问题、数据问题
3. **回归测试**: 修复后进行回归测试
4. **文档更新**: 及时更新测试文档和已知问题

## 📞 支持和反馈

如果在测试过程中遇到问题：

1. 检查测试日志和错误信息
2. 参考本文档的故障排除部分
3. 运行单项测试定位问题
4. 查看系统监控指标
5. 联系开发团队获取支持

---

**测试系统版本**: v1.0  
**最后更新**: 2024年1月  
**维护状态**: ✅ 活跃维护
