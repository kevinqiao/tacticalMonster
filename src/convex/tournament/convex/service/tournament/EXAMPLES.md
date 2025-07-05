# 锦标赛系统使用示例

## 概述

本文档提供了锦标赛系统的详细使用示例，包括各种场景和最佳实践。

## 基础使用

### 1. 加入锦标赛

```typescript
import { TournamentService } from "./tournamentService";

// 加入每日特殊锦标赛
const joinResult = await TournamentService.joinTournament(ctx, {
  uid: "user123",
  gameType: "solitaire",
  tournamentType: "daily_special"
});

console.log("加入结果:", joinResult);
// 输出:
// {
//   success: true,
//   tournamentId: "tournament_123",
//   matchId: "match_456",
//   playerMatchId: "player_match_789",
//   gameId: "game_101",
//   serverUrl: "https://game-server.example.com/game/game_101",
//   attemptNumber: 1,
//   message: "成功加入锦标赛"
// }
```

### 2. 提交分数

```typescript
// 提交比赛分数
const submitResult = await TournamentService.submitScore(ctx, {
  tournamentId: "tournament_123",
  uid: "user123",
  gameType: "solitaire",
  score: 1500,
  gameData: {
    moves: 45,
    time: 280,
    hints: 2,
    undos: 1
  },
  propsUsed: ["hint", "undo"],
  gameId: "game_101"
});

console.log("提交结果:", submitResult);
// 输出:
// {
//   success: true,
//   matchId: "match_456",
//   score: 1500,
//   deductionResult: { deductionId: "deduction_123" },
//   settleResult: { settled: true, reason: "单人锦标赛完成" },
//   message: "分数提交成功，锦标赛已结算"
// }
```

### 3. 获取锦标赛详情

```typescript
// 获取锦标赛详细信息
const tournamentDetails = await TournamentService.getTournamentDetails(ctx, "tournament_123");

console.log("锦标赛详情:", tournamentDetails);
// 输出:
// {
//   tournament: {
//     _id: "tournament_123",
//     tournamentType: "daily_special",
//     gameType: "solitaire",
//     status: "completed",
//     playerUids: ["user123", "user456"],
//     prizePool: 400,
//     createdAt: "2024-01-15T00:00:00.000Z",
//     endTime: "2024-01-16T00:00:00.000Z"
//   },
//   matches: [
//     {
//       _id: "match_456",
//       matchType: "single_match",
//       status: "completed",
//       startTime: "2024-01-15T10:30:00.000Z",
//       endTime: "2024-01-15T10:35:00.000Z"
//     }
//   ],
//   players: [
//     {
//       uid: "user123",
//       totalScore: 1500,
//       matchCount: 1,
//       bestScore: 1500,
//       averageScore: 1500,
//       rank: 1,
//       player: {
//         displayName: "Player1",
//         segmentName: "Gold",
//         isSubscribed: true
//       }
//     }
//   ],
//   totalMatches: 1,
//   totalPlayers: 1
// }
```

## 高级使用

### 1. 多人锦标赛匹配

```typescript
import { TournamentMatchingService } from "./tournamentMatchingService";

// 加入多人锦标赛匹配
const matchResult = await TournamentMatchingService.joinTournamentMatch(ctx, {
  uid: "user123",
  tournamentId: "tournament_456",
  gameType: "rummy",
  player: {
    uid: "user123",
    segmentName: "Gold",
    eloScore: 1200,
    isSubscribed: true
  },
  config: {
    matching: {
      algorithm: "skill_based",
      skillRange: 200,
      maxWaitTime: 60
    }
  }
});

console.log("匹配结果:", matchResult);
// 输出:
// {
//   success: true,
//   matchId: "match_789",
//   playerMatchId: "player_match_101",
//   gameId: "game_202",
//   serverUrl: "https://game-server.example.com/game/game_202",
//   matchInfo: {
//     status: "matched",
//     players: ["user123", "user456", "user789"],
//     startTime: "2024-01-15T11:00:00.000Z"
//   }
// }
```

### 2. 锦标赛结算

```typescript
// 手动结算锦标赛
const settleResult = await TournamentService.settleTournament(ctx, "tournament_123");

console.log("结算结果:", settleResult);
// 输出:
// {
//   success: true,
//   tournamentId: "tournament_123",
//   message: "锦标赛结算完成"
// }
```

### 3. 获取玩家历史

```typescript
// 获取玩家锦标赛历史
const history = await TournamentService.getPlayerTournamentHistory(ctx, {
  uid: "user123",
  limit: 10
});

console.log("玩家历史:", history);
// 输出:
// [
//   {
//     playerMatch: {
//       _id: "player_match_789",
//       matchId: "match_456",
//       tournamentId: "tournament_123",
//       uid: "user123",
//       score: 1500,
//       rank: 1,
//       completed: true,
//       createdAt: "2024-01-15T10:30:00.000Z"
//     },
//     tournament: {
//       tournamentType: "daily_special",
//       gameType: "solitaire",
//       status: "completed"
//     },
//     match: {
//       matchType: "single_match",
//       status: "completed"
//     },
//     gameType: "solitaire",
//     score: 1500,
//     rank: 1,
//     completed: true,
//     createdAt: "2024-01-15T10:30:00.000Z"
//   }
// ]
```

## 配置管理

### 1. 获取锦标赛配置

```typescript
import { TournamentConfigManager } from "../data/tournamentConfigUsage";

// 获取特定配置
const dailyConfig = TournamentConfigManager.getConfig("daily_special");
console.log("每日锦标赛配置:", dailyConfig);

// 获取所有活跃配置
const activeConfigs = TournamentConfigManager.getActiveConfigs();
console.log("活跃锦标赛数量:", activeConfigs.length);

// 按游戏类型获取配置
const solitaireConfigs = TournamentConfigManager.getConfigsByGameType("solitaire");
console.log("单人纸牌锦标赛:", solitaireConfigs);
```

### 2. 检查参赛资格

```typescript
// 检查玩家是否符合参赛条件
const eligibility = TournamentConfigManager.checkEligibility(
  dailyConfig,
  {
    uid: "user123",
    segmentName: "gold",
    isSubscribed: true,
    level: 10,
    totalPoints: 500
  },
  {
    coins: 100,
    tickets: [
      {
        gameType: "solitaire",
        tournamentType: "daily_special",
        quantity: 2
      }
    ],
    props: []
  }
);

console.log("参赛资格:", eligibility);
// 输出:
// {
//   eligible: true,
//   reasons: []
// }
```

### 3. 计算奖励

```typescript
// 计算玩家奖励
const rewards = TournamentConfigManager.calculateRewards(
  dailyConfig,
  1, // 第一名
  1000, // 分数
  "gold", // 段位
  true // 订阅用户
);

console.log("奖励计算:", rewards);
// 输出:
// {
//   coins: 360,
//   gamePoints: 180,
//   props: [
//     {
//       gameType: "solitaire",
//       propType: "hint",
//       quantity: 6,
//       rarity: "common"
//     },
//     {
//       gameType: "solitaire",
//       propType: "time_boost",
//       quantity: 1,
//       rarity: "rare"
//     }
//   ],
//   tickets: []
// }
```

## 调度器使用

### 1. 手动创建锦标赛

```typescript
import { TournamentScheduler } from "./tournamentScheduler";

// 手动创建每日锦标赛
const dailyResult = await TournamentScheduler.createDailyTournaments(ctx);
console.log("每日锦标赛创建:", dailyResult);

// 手动创建每周锦标赛
const weeklyResult = await TournamentScheduler.createWeeklyTournaments(ctx);
console.log("每周锦标赛创建:", weeklyResult);

// 手动创建赛季锦标赛
const seasonalResult = await TournamentScheduler.createSeasonalTournaments(ctx);
console.log("赛季锦标赛创建:", seasonalResult);
```

### 2. 重置限制

```typescript
// 重置每日限制
const dailyReset = await TournamentScheduler.resetDailyLimits(ctx);
console.log("每日限制重置:", dailyReset);

// 重置每周限制
const weeklyReset = await TournamentScheduler.resetWeeklyLimits(ctx);
console.log("每周限制重置:", weeklyReset);

// 重置赛季限制
const seasonalReset = await TournamentScheduler.resetSeasonalLimits(ctx);
console.log("赛季限制重置:", seasonalReset);
```

## 比赛管理

### 1. 创建比赛

```typescript
import { MatchManager } from "./matchManager";

// 创建单人比赛
const singleMatchId = await MatchManager.createMatch(ctx, {
  tournamentId: "tournament_123",
  gameType: "solitaire",
  matchType: "single_match",
  maxPlayers: 1,
  minPlayers: 1,
  gameData: {
    player: {
      uid: "user123",
      segmentName: "Gold",
      eloScore: 1200
    }
  }
});

// 创建多人比赛
const multiMatchId = await MatchManager.createMatch(ctx, {
  tournamentId: "tournament_456",
  gameType: "rummy",
  matchType: "multi_match",
  maxPlayers: 4,
  minPlayers: 2,
  gameData: {
    matchType: "skill_based"
  }
});
```

### 2. 玩家加入比赛

```typescript
// 玩家加入比赛
const playerMatchId = await MatchManager.joinMatch(ctx, {
  matchId: singleMatchId,
  tournamentId: "tournament_123",
  uid: "user123",
  gameType: "solitaire"
});

console.log("玩家比赛ID:", playerMatchId);
```

### 3. 提交比赛分数

```typescript
// 提交比赛分数
const scoreResult = await MatchManager.submitScore(ctx, {
  matchId: singleMatchId,
  tournamentId: "tournament_123",
  uid: "user123",
  gameType: "solitaire",
  score: 1500,
  gameData: {
    moves: 45,
    time: 280,
    hints: 2
  },
  propsUsed: ["hint"],
  attemptNumber: 1
});

console.log("分数提交结果:", scoreResult);
```

## 规则引擎使用

### 1. 验证限制

```typescript
import { validateLimits } from "./ruleEngine";

// 验证玩家参与限制
await validateLimits(ctx, {
  uid: "user123",
  gameType: "solitaire",
  tournamentType: "daily_special",
  isSubscribed: true,
  limits: dailyConfig.limits,
  seasonId: "season_123"
});
```

### 2. 扣除入场费

```typescript
import { deductEntryFee } from "./ruleEngine";

// 扣除入场费
const deductionResult = await deductEntryFee(ctx, {
  uid: "user123",
  gameType: "solitaire",
  tournamentType: "daily_special",
  entryFee: {
    coins: 50,
    ticket: {
      gameType: "solitaire",
      tournamentType: "daily_special",
      quantity: 1
    }
  },
  inventory: playerInventory
});

console.log("扣除结果:", deductionResult);
// 输出:
// {
//   method: "ticket",
//   amount: 1
// }
```

### 3. 应用规则

```typescript
import { applyRules } from "./ruleEngine";

// 应用锦标赛规则
const ruleResult = await applyRules(ctx, {
  tournament: tournamentData,
  uid: "user123",
  matches: playerMatches,
  player: playerData,
  inventory: playerInventory,
  playerSeason: playerSeasonData
});

console.log("规则应用结果:", ruleResult);
// 输出:
// {
//   rank: 1,
//   finalReward: {
//     coins: 300,
//     gamePoints: 150,
//     props: [...],
//     tickets: [...]
//   }
// }
```

## 测试示例

### 1. 运行所有测试

```typescript
import { runAllTournamentTests } from "./tests/testRunner";

// 运行所有锦标赛测试
const testResult = await runAllTournamentTests({
  testTypes: ["unit", "integration", "e2e"],
  timeout: 30000,
  concurrency: 5,
  verbose: true,
  stopOnFailure: false
});

console.log("测试结果:", testResult);
```

### 2. 运行特定测试

```typescript
import { runSpecificTournamentTest } from "./tests/testRunner";

// 运行特定测试
const specificResult = await runSpecificTournamentTest("testCreateDailyTournaments", {
  timeout: 10000,
  verbose: true
});

console.log("特定测试结果:", specificResult);
```

### 3. 运行锦标赛调度器测试

```typescript
import { runTournamentSchedulerTests } from "./tests/tournamentSchedulerTests";

// 运行调度器测试
await runTournamentSchedulerTests();
```

## 错误处理示例

### 1. 处理参赛限制错误

```typescript
try {
  await TournamentService.joinTournament(ctx, {
    uid: "user123",
    gameType: "solitaire",
    tournamentType: "daily_special"
  });
} catch (error) {
  if (error.message.includes("已达最大参与次数")) {
    console.log("今日参与次数已达上限，请明天再试");
  } else if (error.message.includes("金币或门票不足")) {
    console.log("入场费不足，请检查金币或门票");
  } else {
    console.error("加入锦标赛失败:", error);
  }
}
```

### 2. 处理分数提交错误

```typescript
try {
  await TournamentService.submitScore(ctx, {
    tournamentId: "tournament_123",
    uid: "user123",
    gameType: "solitaire",
    score: 1500,
    gameData: {},
    propsUsed: []
  });
} catch (error) {
  if (error.message.includes("未找到对应的比赛记录")) {
    console.log("比赛记录不存在，请重新加入锦标赛");
  } else if (error.message.includes("锦标赛不存在")) {
    console.log("锦标赛已结束或不存在");
  } else {
    console.error("提交分数失败:", error);
  }
}
```

## 最佳实践

### 1. 错误处理

- 始终使用 try-catch 包装异步操作
- 提供用户友好的错误信息
- 记录详细的错误日志

### 2. 性能优化

- 批量处理数据库操作
- 使用适当的索引
- 缓存常用数据

### 3. 安全考虑

- 验证所有用户输入
- 检查用户权限
- 防止重复提交

### 4. 监控和日志

- 记录关键操作
- 监控系统性能
- 设置告警机制

## 总结

本示例文档展示了锦标赛系统的各种使用场景，包括：

1. **基础操作** - 加入、提交、查询
2. **高级功能** - 匹配、结算、配置管理
3. **调度管理** - 自动创建、限制重置
4. **测试验证** - 单元测试、集成测试
5. **错误处理** - 异常捕获、用户提示

通过这些示例，开发者可以快速理解和使用锦标赛系统的各项功能。 