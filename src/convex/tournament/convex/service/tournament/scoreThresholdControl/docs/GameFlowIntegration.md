# 游戏流程融合说明

## 概述

本文档说明了如何将游戏流程功能融合到 `ScoreThresholdPlayerController` 中，避免功能重复，提供统一的游戏体验管理。

## 架构调整

### 1. 删除重复文件
- ❌ 删除了 `gameFlow.ts`（功能重复）
- ✅ 保留了 `ScoreThresholdPlayerController.ts`（核心控制器）

### 2. 功能融合
将游戏流程功能直接集成到 `ScoreThresholdPlayerController` 中：

```typescript
export class ScoreThresholdPlayerController {
    // ==================== 游戏流程方法 ====================
    
    // 获取推荐种子
    async getRecommendedSeeds(uid: string, options: {...})
    
    // 提交游戏分数
    async submitGameScore(uid: string, seedId: string, ...)
    
    // 获取游戏历史
    async getPlayerGameHistory(uid: string, limit: number)
    
    // 获取种子难度统计
    async getSeedDifficultyStats(seedId: string)
    
    // 获取玩家技能等级
    async getPlayerSkillLevel(uid: string)
    
    // ==================== 系统级方法 ====================
    
    // 处理比赛结束
    async processMatchEnd(matchId: string, playerScores: Array<...>)
    
    // 计算排名
    async calculateRankings(matchId: string, playerScores: Array<...>)
    
    // 其他系统方法...
}
```

## 使用方式

### 1. 直接使用控制器

```typescript
import { ScoreThresholdPlayerController } from '../core/ScoreThresholdPlayerController';

// 在 Convex 函数中
export const gameFunction = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const controller = new ScoreThresholdPlayerController(ctx);
        
        // 获取推荐种子
        const seeds = await controller.getRecommendedSeeds(args.uid);
        
        // 提交分数
        const result = await controller.submitGameScore(
            args.uid, 
            "seed_001", 
            "match_123", 
            850
        );
        
        return result;
    }
});
```

### 2. 通过 Convex 接口调用

```typescript
// 使用 gameFlowController.ts 提供的接口
import { api } from '../convex/_generated/api';

// 前端调用
const recommendedSeeds = useQuery(api.gameFlowController.getRecommendedSeeds, {
    uid,
    options: { limit: 3, preferredDifficulty: 'balanced' }
});

const submitScore = useMutation(api.gameFlowController.submitGameScore);
```

## 完整游戏流程

### 1. 游戏开始
```typescript
// 获取推荐种子
const seeds = await controller.getRecommendedSeeds(uid, {
    limit: 3,
    preferredDifficulty: 'balanced'
});

// 玩家选择种子
const selectedSeed = seeds.recommendedSeeds[0];
```

### 2. 游戏进行中
```typescript
// 游戏逻辑...
// 收集游戏数据
const gameData = {
    completionTime: 120,
    retryCount: 2,
    difficulty: 'just_right',
    enjoyment: 0.8
};
```

### 3. 游戏结束
```typescript
// 提交分数和反馈
const result = await controller.submitGameScore(
    uid,
    selectedSeed,
    `match_${Date.now()}`,
    playerScore,
    gameData
);

// 系统自动处理：
// - 记录比赛结果
// - 计算排名（包括AI对手）
// - 更新积分和段位
// - 收集用户反馈
// - 触发增量统计更新
```

## 优势

### 1. 避免重复
- 不再有 `gameFlow.ts` 和 `ScoreThresholdPlayerController.ts` 的功能重复
- 统一的游戏流程管理

### 2. 功能完整
- 游戏流程 + 系统管理 + 智能推荐
- 完整的比赛处理流程
- 自动的段位和积分更新

### 3. 易于维护
- 单一控制器负责所有相关功能
- 清晰的职责划分
- 统一的错误处理

### 4. 性能优化
- 增量统计更新
- 智能缓存机制
- 批量操作支持

## 接口映射

| 原 gameFlow.ts | 新 ScoreThresholdPlayerController | 说明 |
|----------------|-----------------------------------|------|
| `getRecommendedSeeds` | `getRecommendedSeeds` | 获取推荐种子 |
| `submitGameScore` | `submitGameScore` | 提交游戏分数 |
| `getPlayerGameHistory` | `getPlayerGameHistory` | 获取游戏历史 |
| `getSeedDifficultyStats` | `getSeedDifficultyStats` | 获取种子难度 |
| `getPlayerSkillLevel` | `getPlayerSkillLevel` | 获取技能等级 |
| - | `processMatchEnd` | 处理比赛结束 |
| - | `calculateRankings` | 计算排名 |
| - | `checkSegmentChanges` | 检查段位变化 |

## 迁移指南

### 1. 更新导入
```typescript
// 旧方式
import { getRecommendedSeeds } from './gameFlow';

// 新方式
import { ScoreThresholdPlayerController } from '../core/ScoreThresholdPlayerController';
const controller = new ScoreThresholdPlayerController(ctx);
```

### 2. 更新调用
```typescript
// 旧方式
const seeds = await getRecommendedSeeds(ctx, { uid, options });

// 新方式
const seeds = await controller.getRecommendedSeeds(uid, options);
```

### 3. 更新前端
```typescript
// 旧方式
const seeds = useQuery(api.gameFlow.getRecommendedSeeds, {...});

// 新方式
const seeds = useQuery(api.gameFlowController.getRecommendedSeeds, {...});
```

## 总结

通过将游戏流程功能融合到 `ScoreThresholdPlayerController` 中，我们：

1. **消除了功能重复** - 不再需要维护两个相似的文件
2. **提供了统一接口** - 所有游戏相关功能都在一个控制器中
3. **保持了功能完整** - 游戏流程、系统管理、智能推荐一应俱全
4. **简化了维护** - 单一文件负责相关功能，易于理解和修改

这种融合方式既保持了代码的清晰性，又避免了不必要的重复，是一个更好的架构设计。
