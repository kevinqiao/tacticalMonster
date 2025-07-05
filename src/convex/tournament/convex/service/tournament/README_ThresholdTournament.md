# 阈值锦标赛 (Threshold Tournament)

## 概述

阈值锦标赛是一种特殊的单人锦标赛类型，玩家需要达到指定的分数阈值才能获胜。这种锦标赛类型特别适合技能挑战和成就系统。

## 功能特点

### 1. 阈值排名机制
- **达到阈值**: 玩家分数达到或超过阈值时，自动获得第一名
- **未达到阈值**: 玩家分数低于阈值时，获得第二名
- **多次尝试**: 允许玩家在同一个锦标赛中进行多次尝试（最多3次）

### 2. 配置参数
```typescript
{
  typeId: "single_player_threshold_tournament",
  name: "单人阈值锦标赛",
  description: "达到目标分数即可获胜，挑战你的极限",
  category: "casual",
  gameType: "solitaire",
  isActive: true,
  priority: 2,
  defaultConfig: {
    entryFee: {
      coins: 30
    },
    rules: {
      maxAttempts: 3,           // 最大尝试次数
      isSingleMatch: true,      // 单人比赛
      rankingMethod: "threshold", // 阈值排名方法
      scoreThreshold: 1000      // 分数阈值
    },
    duration: 86400,            // 持续时间（24小时）
    isSubscribedRequired: false
  }
}
```

### 3. 排名逻辑
```typescript
// 在 multiPlayerTournament.ts 中的结算逻辑
if (config.matchRules?.rankingMethod === "threshold" && config.matchRules?.scoreThreshold) {
    // 阈值排名：达到阈值获得第一名，否则第二名
    finalRankedPlayers = sortedPlayers.map(player => ({
        ...player,
        rank: player.bestScore >= config.matchRules.scoreThreshold ? 1 : 2
    }));
}
```

## 使用方法

### 1. 初始化锦标赛类型
```typescript
// 运行初始化脚本
await ctx.runMutation(internal.init.initTournamentTypes.initTournamentTypes, {});
```

### 2. 加入锦标赛
```typescript
const result = await ctx.runMutation(
    internal.service.tournament.tournamentService.joinTournament,
    {
        uid: "user123",
        gameType: "solitaire",
        tournamentType: "single_player_threshold_tournament"
    }
);
```

### 3. 提交分数
```typescript
const result = await ctx.runMutation(
    internal.service.tournament.tournamentService.submitScore,
    {
        tournamentId: "tournament_id",
        uid: "user123",
        gameType: "solitaire",
        score: 1200, // 达到1000阈值
        gameData: { moves: 40, time: 280 },
        propsUsed: ["hint"]
    }
);
```

### 4. 查看结果
```typescript
const details = await ctx.runQuery(
    internal.service.tournament.tournamentService.getTournamentDetails,
    {
        tournamentId: "tournament_id"
    }
);
```

## 测试

### 运行完整测试套件
```typescript
const testResult = await ctx.runMutation(
    internal.service.tournament.tests.runThresholdTests.runThresholdTests,
    {}
);
```

### 运行单个测试
```typescript
// 集成测试
const integrationResult = await ctx.runMutation(
    internal.service.tournament.tests.runThresholdTests.runIntegrationTest,
    {}
);

// 排名逻辑测试
const rankingResult = await ctx.runMutation(
    internal.service.tournament.tests.runThresholdTests.runRankingLogicTest,
    {}
);
```

## 测试用例

### 1. 阈值测试用例
- **分数 800**: 未达到阈值，期望排名 2
- **分数 1000**: 刚好达到阈值，期望排名 1
- **分数 1200**: 超过阈值，期望排名 1
- **分数 900**: 接近但未达到阈值，期望排名 2

### 2. 多次尝试测试
- 验证玩家最多只能尝试3次
- 验证每次尝试都会创建新的比赛记录
- 验证最终排名基于最高分数

### 3. 结算测试
- 验证达到阈值的玩家获得第一名
- 验证未达到阈值的玩家获得第二名
- 验证奖励分配正确

## 配置示例

### 创建自定义阈值锦标赛
```typescript
const customThresholdTournament = {
    typeId: "custom_threshold_tournament",
    name: "自定义阈值锦标赛",
    description: "自定义阈值的挑战锦标赛",
    category: "special",
    gameType: "puzzle",
    isActive: true,
    priority: 1,
    defaultConfig: {
        entryFee: {
            coins: 50
        },
        rules: {
            maxAttempts: 5,
            isSingleMatch: true,
            rankingMethod: "threshold",
            scoreThreshold: 2000 // 自定义阈值
        },
        duration: 172800, // 48小时
        isSubscribedRequired: false
    }
};
```

## 处理器映射

阈值锦标赛使用 `multiPlayerTournamentHandler` 处理器，该处理器能够根据配置自动判断是单人还是多人比赛：

```typescript
// 在 handler/index.ts 中
const HANDLER_MAP: Record<string, any> = {
    // 单人锦标赛 - 统一使用multiPlayerTournamentHandler
    "single_player_tournament": multiPlayerTournamentHandler,
    "independent_tournament": multiPlayerTournamentHandler,
    "single_player_threshold_tournament": multiPlayerTournamentHandler,
    
    // 多人锦标赛
    "multi_player_tournament": multiPlayerTournamentHandler,
    "team_tournament": multiPlayerTournamentHandler,
    "multi_player_single_match_tournament": multiPlayerTournamentHandler,
};
```

## 注意事项

1. **阈值设置**: 确保阈值设置合理，既要有挑战性又不能过于困难
2. **多次尝试**: 每次尝试都会消耗入场费，需要平衡游戏体验和收益
3. **排名逻辑**: 阈值排名逻辑是二元的（第一名或第二名），适合成就系统
4. **测试覆盖**: 建议在部署前运行完整的测试套件

## 扩展功能

### 1. 动态阈值
可以根据玩家段位或历史表现动态调整阈值：
```typescript
const dynamicThreshold = calculateDynamicThreshold(player.segmentName, player.history);
```

### 2. 多级阈值
可以设置多个阈值等级，对应不同的排名：
```typescript
const thresholds = [1000, 1500, 2000];
const rank = thresholds.findIndex(t => score >= t) + 1;
```

### 3. 时间限制
可以添加时间限制，增加挑战性：
```typescript
const timeBonus = Math.max(0, (timeLimit - actualTime) / timeLimit);
const finalScore = baseScore * (1 + timeBonus);
``` 