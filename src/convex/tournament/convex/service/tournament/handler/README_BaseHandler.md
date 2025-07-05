# Base Handler 使用指南

## 概述

`base.ts` 是锦标赛处理器的核心基础文件，提供了完整的锦标赛处理逻辑。经过优化后，它采用了模块化设计，便于具体的 handler 最大化继承和自定义。

## 架构设计

### 1. 模块化结构

```
base.ts
├── 接口定义 (Interfaces)
├── 工具函数 (Utility Functions)
├── 锦标赛创建函数 (Tournament Creation)
├── 验证函数 (Validation Functions)
├── 结算函数 (Settlement Functions)
└── 基础处理器 (Base Handler)
```

### 2. 继承策略

- **完全继承**: 使用扩展运算符 `...baseHandler`
- **部分重写**: 只重写需要自定义的方法
- **功能增强**: 在重写的方法中调用基础方法
- **新增功能**: 添加新的自定义方法

## 核心接口

### TournamentHandler 接口

```typescript
export interface TournamentHandler {
  validateJoin(ctx: any, args: JoinArgs): Promise<void>;
  join(ctx: any, args: JoinArgs): Promise<JoinResult>;
  validateScore(ctx: any, args: SubmitScoreArgs): Promise<void>;
  submitScore(ctx: any, args: SubmitScoreArgs): Promise<SubmitScoreResult>;
  settle(ctx: any, tournamentId: string): Promise<void>;
  distributeRewards?(ctx: any, data: DistributeRewardsArgs): Promise<void>;
}
```

## 可导出的工具函数

### 1. 锦标赛创建函数

```typescript
// 创建普通锦标赛
export async function createTournament(ctx, params)

// 创建独立锦标赛
export async function createIndependentTournament(ctx, params)
```

### 2. 验证函数

```typescript
// 验证加入条件
export async function validateJoinConditions(ctx, args)

// 验证分数提交
export async function validateScoreSubmission(ctx, args)
```

### 3. 结算函数

```typescript
// 计算玩家排名
export async function calculatePlayerRankings(ctx, tournamentId)

// 检查是否需要立即结算
export async function shouldSettleImmediately(ctx, tournament, tournamentId)
```

### 4. 工具函数

```typescript
// 获取玩家尝试次数
export async function getPlayerAttempts(ctx, params)

// 更新锦标赛状态
export async function updateTournamentStatus(ctx, tournament, score)

// 记录道具使用日志
export async function logPropUsage(ctx, data)
```

## 使用示例

### 1. 完全继承基础处理器

```typescript
import { baseHandler } from "./base";

// 直接使用基础处理器
export const simpleHandler = baseHandler;
```

### 2. 部分重写处理器

```typescript
import { baseHandler, TournamentHandler } from "./base";

export const customHandler: TournamentHandler = {
  ...baseHandler,  // 继承所有基础方法
  
  // 只重写需要自定义的方法
  async join(ctx, args) {
    console.log("自定义加入逻辑");
    return await baseHandler.join(ctx, args);
  },
  
  async settle(ctx, tournamentId) {
    console.log("自定义结算逻辑");
    await baseHandler.settle(ctx, tournamentId);
  }
};
```

### 3. 功能增强处理器

```typescript
import { 
  baseHandler, 
  TournamentHandler,
  validateJoinConditions,
  createTournament,
  calculatePlayerRankings
} from "./base";

export const enhancedHandler: TournamentHandler = {
  ...baseHandler,
  
  async join(ctx, args) {
    // 自定义验证
    await this.validateCustomConditions(ctx, args);
    
    // 调用基础验证
    await validateJoinConditions(ctx, args);
    
    // 自定义锦标赛创建
    const tournamentId = await this.createCustomTournament(ctx, args);
    
    return { tournamentId, attemptNumber: 1 };
  },
  
  async settle(ctx, tournamentId) {
    // 自定义排名计算
    const rankings = await this.calculateCustomRankings(ctx, tournamentId);
    
    // 调用基础结算
    await baseHandler.settle(ctx, tournamentId);
    
    // 自定义后处理
    await this.postSettlementProcessing(ctx, tournamentId, rankings);
  },
  
  // 新增自定义方法
  async validateCustomConditions(ctx, args) {
    // 自定义验证逻辑
  },
  
  async createCustomTournament(ctx, args) {
    // 自定义锦标赛创建逻辑
  },
  
  async calculateCustomRankings(ctx, tournamentId) {
    // 自定义排名计算逻辑
  },
  
  async postSettlementProcessing(ctx, tournamentId, rankings) {
    // 结算后处理逻辑
  }
};
```

### 4. 阈值锦标赛处理器

```typescript
import { 
  baseHandler, 
  TournamentHandler,
  calculatePlayerRankings,
  shouldSettleImmediately
} from "./base";

export const thresholdHandler: TournamentHandler = {
  ...baseHandler,
  
  async settle(ctx, tournamentId) {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) throw new Error("锦标赛不存在");
    
    // 检查是否为阈值锦标赛
    if (tournament.config?.rules?.rankingMethod === "threshold") {
      await this.settleThresholdTournament(ctx, tournamentId);
    } else {
      // 使用基础结算逻辑
      await baseHandler.settle(ctx, tournamentId);
    }
  },
  
  async settleThresholdTournament(ctx, tournamentId) {
    const tournament = await ctx.db.get(tournamentId);
    const threshold = tournament.config?.rules?.scoreThreshold || 1000;
    
    // 获取比赛记录
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // 阈值排名逻辑
    const playerScores = new Map<string, number>();
    for (const match of matches) {
      const currentScore = playerScores.get(match.uid) || 0;
      playerScores.set(match.uid, Math.max(currentScore, match.score));
    }

    const sortedPlayers = Array.from(playerScores.entries())
      .map(([uid, score]) => ({
        uid,
        score,
        rank: score >= threshold ? 1 : 2
      }))
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.score - a.score;
      });

    // 分配奖励
    for (const playerData of sortedPlayers) {
      await this.distributeRewards(ctx, {
        uid: playerData.uid,
        rank: playerData.rank,
        score: playerData.score,
        tournament,
        matches: matches.filter(m => m.uid === playerData.uid)
      });
    }

    // 更新状态
    await ctx.db.patch(tournamentId, {
      status: "completed",
      updatedAt: getTorontoDate().iso
    });
  }
};
```

## 最佳实践

### 1. 继承策略选择

- **简单需求**: 直接使用 `baseHandler`
- **轻微定制**: 使用扩展运算符继承，只重写特定方法
- **复杂定制**: 使用工具函数组合，完全自定义逻辑

### 2. 方法重写原则

- **保持接口一致**: 重写的方法应该保持相同的参数和返回值
- **调用基础方法**: 在自定义逻辑中调用基础方法
- **错误处理**: 保持与基础方法一致的错误处理

### 3. 新增功能

- **独立方法**: 新增的方法应该是独立的，不依赖基础方法
- **命名规范**: 使用描述性的方法名，避免与基础方法冲突
- **文档注释**: 为新增方法添加详细的文档注释

### 4. 测试策略

- **单元测试**: 为每个自定义方法编写单元测试
- **集成测试**: 测试整个处理器的完整流程
- **边界测试**: 测试异常情况和边界条件

## 常见模式

### 1. 装饰器模式

```typescript
export const loggingHandler: TournamentHandler = {
  ...baseHandler,
  
  async join(ctx, args) {
    console.log("开始加入锦标赛:", args.tournamentType);
    const result = await baseHandler.join(ctx, args);
    console.log("锦标赛加入完成:", result);
    return result;
  }
};
```

### 2. 策略模式

```typescript
export const strategyHandler: TournamentHandler = {
  ...baseHandler,
  
  async settle(ctx, tournamentId) {
    const tournament = await ctx.db.get(tournamentId);
    const strategy = tournament.config?.rules?.rankingMethod;
    
    switch (strategy) {
      case "threshold":
        return await this.settleThreshold(ctx, tournamentId);
      case "highest_score":
        return await this.settleHighestScore(ctx, tournamentId);
      default:
        return await baseHandler.settle(ctx, tournamentId);
    }
  }
};
```

### 3. 工厂模式

```typescript
export function createHandler(config: HandlerConfig): TournamentHandler {
  const handler = { ...baseHandler };
  
  if (config.enableThresholdRanking) {
    handler.settle = thresholdSettle;
  }
  
  if (config.enableCustomValidation) {
    handler.validateJoin = customValidateJoin;
  }
  
  return handler;
}
```

## 总结

优化后的 `base.ts` 提供了：

1. **模块化设计**: 功能分离，便于重用
2. **灵活继承**: 支持多种继承策略
3. **工具函数**: 提供常用的辅助函数
4. **类型安全**: 完整的 TypeScript 类型定义
5. **易于扩展**: 便于添加新功能

通过合理使用这些特性，可以快速开发出功能强大、易于维护的锦标赛处理器。 