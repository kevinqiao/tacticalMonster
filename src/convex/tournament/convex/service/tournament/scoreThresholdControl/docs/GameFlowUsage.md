# 游戏流程使用说明

## 概述

本文档描述了完整的游戏流程：**获取推荐种子 → 玩游戏 → 提交分数 → 计算排名 → 更新推荐**。

## 完整流程

### 1. 获取推荐种子（游戏开始）

```typescript
// 调用接口获取推荐种子
const recommendedSeeds = await getRecommendedSeeds({
    uid: "player123",
    options: {
        limit: 3,
        preferredDifficulty: 'balanced'
    }
});

// 返回结果
{
    success: true,
    recommendedSeeds: ["seed_001", "seed_002", "seed_003"],
    reasoning: "基于你的技能等级和偏好，推荐这些平衡难度的种子",
    difficulty: "balanced",
    playerSkillLevel: "intermediate"
}
```

**功能说明：**
- 基于玩家技能等级智能推荐种子
- 考虑玩家偏好和难度设置
- 提供推荐理由和难度说明

### 2. 提交游戏分数（游戏结束）

```typescript
// 提交游戏分数和反馈
const result = await submitGameScore({
    uid: "player123",
    seedId: "seed_001",
    matchId: "match_123456",
    score: 850,
    gameData: {
        completionTime: 120,    // 完成时间（秒）
        retryCount: 2,          // 重试次数
        difficulty: "just_right", // 难度感受
        enjoyment: 0.8          // 游戏体验评分
    }
});

// 返回结果
{
    success: true,
    matchResultId: "result_123",
    finalRankings: [
        { uid: "ai_1", score: 920, rank: 1, isAI: true },
        { uid: "player123", score: 850, rank: 2, isAI: false },
        { uid: "ai_2", score: 780, rank: 3, isAI: true },
        { uid: "ai_3", score: 720, rank: 4, isAI: true }
    ],
    playerRank: 2,
    points: 60
}
```

**功能说明：**
- 记录比赛结果到数据库
- 自动计算排名（包括AI对手）
- 计算积分奖励
- 收集用户反馈用于改进推荐
- 触发增量统计更新

### 3. 排名计算逻辑

#### 3.1 参与者构成
- **人类玩家**: 1名（提交分数的玩家）
- **AI对手**: 3名（默认配置，分数在800-1200范围内）

#### 3.2 排名规则
- 按分数降序排序
- 相同分数获得相同排名
- 排名从1开始计算

#### 3.3 积分计算
```typescript
// 基础积分规则
const basePoints = {
    1: 100,  // 第1名
    2: 60,   // 第2名
    3: 30,   // 第3名
    4: 10    // 第4名
};

// 参与人数调整
const participantMultiplier = Math.max(1, totalParticipants / 4);
const finalPoints = Math.floor(basePoints[rank] * participantMultiplier);
```

### 4. 数据更新流程

#### 4.1 增量统计更新
```typescript
// 更新玩家技能统计
await statsManager.incrementalUpdatePlayerSkillStatistics(uid);

// 更新种子难度统计
await statsManager.incrementalUpdateSeedStatistics(seedId);
```

#### 4.2 用户反馈学习
```typescript
// 提交用户反馈
await recommendationManager.submitUserFeedback(
    uid,
    seedId,
    {
        difficulty: "just_right",
        enjoyment: 0.8,
        completionTime: 120,
        retryCount: 2
    }
);
```

### 5. 前端集成示例

#### 5.1 基本使用
```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

function GameComponent({ uid }: { uid: string }) {
    // 获取推荐种子
    const recommendedSeeds = useQuery(api.gameFlow.getRecommendedSeeds, {
        uid,
        options: { limit: 3, preferredDifficulty: 'balanced' }
    });

    // 提交分数
    const submitScore = useMutation(api.gameFlow.submitGameScore);

    const handleGameEnd = async (seedId: string, score: number) => {
        const result = await submitScore({
            uid,
            seedId,
            matchId: `match_${Date.now()}`,
            score,
            gameData: {
                difficulty: 'just_right',
                enjoyment: 0.8
            }
        });

        if (result.success) {
            console.log(`排名: ${result.playerRank}, 积分: ${result.points}`);
        }
    };

    // 渲染逻辑...
}
```

#### 5.2 完整游戏流程
```typescript
// 1. 游戏开始 - 获取推荐种子
const seeds = await getRecommendedSeeds(uid);

// 2. 玩家选择种子并开始游戏
const selectedSeed = seeds.recommendedSeeds[0];

// 3. 游戏进行中...
// ... 游戏逻辑 ...

// 4. 游戏结束 - 提交分数
const gameResult = await submitGameScore({
    uid,
    seedId: selectedSeed,
    matchId: generateMatchId(),
    score: playerScore,
    gameData: collectGameData()
});

// 5. 显示结果
showGameResult(gameResult.playerRank, gameResult.points);

// 6. 系统自动更新推荐（下次调用时生效）
```

## 数据库表结构

### match_results 表
```typescript
{
    matchId: string,        // 比赛ID
    seed: string,           // 种子标识
    uid: string,            // 玩家用户ID
    score: number,          // 玩家得分
    rank: number,           // 玩家排名
    points: number,         // 玩家获得的积分
    segmentName: string,    // 玩家当前段位
    createdAt: string       // 记录创建时间
}
```

### score_threshold_match_configs 表
```typescript
{
    matchId: string,        // 比赛ID
    uid: string,            // 玩家ID
    status: string,         // 比赛状态
    humanScore: number,     // 人类玩家分数
    aiScores: number[],     // AI对手分数数组
    finalRankings: array,   // 最终排名
    createdAt: string,      // 创建时间
    updatedAt: string       // 更新时间
}
```

## 错误处理

### 常见错误
1. **种子不存在**: 检查种子ID是否正确
2. **分数无效**: 确保分数为正数
3. **数据库连接失败**: 检查网络连接和数据库状态

### 错误响应格式
```typescript
{
    success: false,
    error: "错误描述信息"
}
```

## 性能优化

### 1. 增量更新
- 只处理新增的比赛数据
- 避免重复计算历史统计
- 使用缓存减少数据库查询

### 2. 批量操作
- 支持批量更新玩家统计
- 批量处理种子难度统计
- 减少数据库往返次数

### 3. 索引优化
- 为常用查询字段建立索引
- 复合索引支持多字段查询
- 定期清理过期缓存数据

## 测试建议

### 1. 单元测试
- 测试排名计算逻辑
- 测试积分计算规则
- 测试错误处理机制

### 2. 集成测试
- 测试完整游戏流程
- 测试数据库操作
- 测试并发处理

### 3. 性能测试
- 测试大量数据下的性能
- 测试缓存命中率
- 测试数据库查询效率

## 扩展功能

### 1. 自定义AI对手
- 支持配置AI对手数量和难度
- 动态调整AI对手策略
- 个性化AI对手生成

### 2. 高级排名算法
- 支持多种排名方式
- 考虑时间因素的排名
- 支持团队排名

### 3. 实时统计
- 实时更新排行榜
- 实时难度调整
- 实时推荐优化

## 总结

这个游戏流程系统提供了完整的游戏体验管理，从种子推荐到结果分析，支持智能化的游戏体验优化。通过增量统计和用户反馈学习，系统能够持续改进推荐质量，为玩家提供更好的游戏体验。
