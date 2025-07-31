# 任务系统使用指南

## 概述

任务系统是一个完整的游戏内任务管理平台，支持多种任务类型和奖励系统。本指南将展示如何使用任务系统的各种功能。

## 系统特性

### 支持的任务类型
- **daily**: 每日任务（每日重置）
- **weekly**: 每周任务（每周重置）
- **one_time**: 一次性任务（永久性）
- **achievement**: 成就任务
- **season**: 赛季任务
- **multi_stage**: 多阶段任务
- **conditional**: 条件组合任务
- **time_based**: 时间相关任务

### 支持的奖励类型
- **金币 (coins)**: 游戏内货币
- **道具 (props)**: 游戏道具，按游戏类型分类
- **门票 (tickets)**: 锦标赛门票
- **赛季点 (seasonPoints)**: 赛季积分
- **游戏积分 (gamePoints)**: 分为通用积分和特定游戏积分

## 基本使用流程

### 1. 初始化任务系统

```typescript
// 导入任务模板数据
import { initTaskSystem } from "./scripts/initTaskSystem";

// 初始化任务系统
const result = await initTaskSystem();
console.log(result.message); // "任务系统初始化完成: 12/12 个模板处理成功"
```

### 2. 为玩家分配任务

```typescript
import { allocateTasksForPlayer } from "./tasks";

// 为玩家分配任务
const result = await allocateTasksForPlayer({ uid: "player123" });
console.log(result.message); // "成功分配 5 个任务"
```

### 3. 处理游戏事件

```typescript
import { processGameCompleteEvent } from "./tasks";

// 处理游戏完成事件
const result = await processGameCompleteEvent({
    uid: "player123",
    gameType: "ludo",
    isWin: true,
    matchId: "match_456",
    tournamentId: "tournament_789"
});

console.log(result.message); // "处理了 2 个游戏事件"
```

### 4. 领取任务奖励

```typescript
import { claimTaskRewards } from "./tasks";

// 领取单个任务奖励
const result = await claimTaskRewards({
    uid: "player123",
    taskId: "task_123"
});

console.log(result.message); // "奖励领取成功"
console.log(result.rewards); // { coins: 100, seasonPoints: 25, ... }

// 批量领取奖励
import { batchClaimTaskRewards } from "./tasks";

const batchResult = await batchClaimTaskRewards({
    uid: "player123",
    taskIds: ["task_123", "task_456", "task_789"]
});

console.log(batchResult.message); // "成功领取 3/3 个任务奖励"
console.log(batchResult.totalCoins); // 300
console.log(batchResult.totalSeasonPoints); // 75
```

## 高级功能

### 1. 多阶段任务

多阶段任务要求玩家按顺序完成多个阶段，每个阶段都有独立奖励。

```typescript
// 创建多阶段任务模板
const multiStageTemplate = {
    templateId: "tournament_champion",
    name: "锦标赛冠军之路",
    type: "multi_stage",
    condition: {
        type: "multi_stage",
        stages: [
            {
                action: "tournament_join",
                targetValue: 1,
                reward: { coins: 50, seasonPoints: 10 }
            },
            {
                action: "win_match",
                targetValue: 3,
                reward: { coins: 100, seasonPoints: 20 }
            },
            {
                action: "complete_match",
                targetValue: 5,
                reward: { coins: 200, seasonPoints: 50 }
            }
        ]
    },
    rewards: {
        coins: 500,
        seasonPoints: 150,
        gamePoints: { general: 300 }
    }
};
```

### 2. 条件组合任务

支持 AND/OR 逻辑的条件组合任务。

```typescript
// OR 条件任务
const orConditionTask = {
    templateId: "social_achiever",
    name: "社交达人",
    type: "conditional",
    condition: {
        type: "conditional",
        logic: "or",
        subConditions: [
            { action: "invite_friend", targetValue: 3 },
            { action: "share_game", targetValue: 5 },
            { action: "join_clan", targetValue: 1 }
        ]
    }
};

// AND 条件任务
const andConditionTask = {
    templateId: "complete_challenge",
    name: "完整挑战",
    type: "conditional",
    condition: {
        type: "conditional",
        logic: "and",
        subConditions: [
            { action: "login", targetValue: 1 },
            { action: "complete_match", targetValue: 3 }
        ]
    }
};
```

### 3. 时间相关任务

支持连续天数、时间窗口等时间相关的任务条件。

```typescript
// 连续登录任务
const consecutiveLoginTask = {
    templateId: "consecutive_login_7",
    name: "连续登录7天",
    type: "time_based",
    condition: {
        type: "time_based",
        action: "login",
        targetValue: 7,
        consecutive: true
    }
};

// 时间窗口任务
const timeWindowTask = {
    templateId: "weekly_challenge",
    name: "一周挑战",
    type: "time_based",
    condition: {
        type: "time_based",
        action: "complete_match",
        targetValue: 20,
        withinDays: 7
    }
};
```

## 事件处理

### 常用事件类型

```typescript
// 登录事件
await processLoginEvent({ uid: "player123" });

// 游戏完成事件
await processGameCompleteEvent({
    uid: "player123",
    gameType: "ludo",
    isWin: true,
    matchId: "match_456"
});

// 道具使用事件
await processPropUseEvent({
    uid: "player123",
    gameType: "ludo",
    propType: "dice_boost",
    matchId: "match_456"
});

// 锦标赛参与事件
await processTournamentJoinEvent({
    uid: "player123",
    gameType: "ludo",
    tournamentId: "tournament_789",
    tournamentType: "daily"
});

// 社交事件
await processSocialEvent({
    uid: "player123",
    action: "invite_friend",
    actionData: { friendId: "friend_456" }
});

// 成就事件
await processAchievementEvent({
    uid: "player123",
    achievementId: "first_win",
    achievementType: "gameplay"
});
```

### 自定义事件处理

```typescript
import { processTaskEvent } from "./tasks";

// 处理自定义事件
await processTaskEvent({
    uid: "player123",
    action: "custom_action",
    actionData: { 
        increment: 1,
        customData: "value"
    },
    gameType: "ludo"
});
```

## 任务管理

### 查询玩家任务

```typescript
import { 
    getPlayerTasks, 
    getPlayerIncompleteTasks, 
    getPlayerCompletedUnclaimedTasks 
} from "./tasks";

// 获取玩家所有任务
const allTasks = await getPlayerTasks({ uid: "player123" });

// 获取玩家未完成任务
const incompleteTasks = await getPlayerIncompleteTasks({ uid: "player123" });

// 获取已完成但未领取奖励的任务
const unclaimedTasks = await getPlayerCompletedUnclaimedTasks({ uid: "player123" });
```

### 任务统计

```typescript
import { getPlayerTaskStats } from "./tasks";

const stats = await getPlayerTaskStats({ uid: "player123" });
console.log(stats);
// {
//   totalTasks: 15,
//   completedTasks: 8,
//   claimedTasks: 6,
//   totalCompletions: 12,
//   byType: { daily: { total: 5, completed: 3 }, ... },
//   byCategory: { gameplay: { total: 8, completed: 5 }, ... }
// }
```

### 任务重置

```typescript
import { resetPlayerTasks } from "./tasks";

// 重置每日任务
await resetPlayerTasks({ 
    uid: "player123", 
    resetType: "daily" 
});

// 重置每周任务
await resetPlayerTasks({ 
    uid: "player123", 
    resetType: "weekly" 
});
```

## 奖励系统

### 奖励类型示例

```typescript
// 金币奖励
const coinReward = {
    coins: 100,
    props: [],
    tickets: [],
    seasonPoints: 0,
    gamePoints: { general: 0 }
};

// 道具奖励
const propReward = {
    coins: 50,
    props: [
        {
            gameType: "ludo",
            propType: "dice_boost",
            quantity: 2
        }
    ],
    tickets: [],
    seasonPoints: 10,
    gamePoints: { general: 20 }
};

// 门票奖励
const ticketReward = {
    coins: 75,
    props: [],
    tickets: [
        {
            gameType: "ludo",
            tournamentType: "daily",
            quantity: 1
        }
    ],
    seasonPoints: 15,
    gamePoints: { general: 30 }
};

// 综合奖励
const comprehensiveReward = {
    coins: 200,
    props: [
        {
            gameType: "ludo",
            propType: "golden_dice",
            quantity: 1
        }
    ],
    tickets: [
        {
            gameType: "ludo",
            tournamentType: "elite",
            quantity: 1
        }
    ],
    seasonPoints: 50,
    gamePoints: {
        general: 100,
        specific: {
            gameType: "ludo",
            points: 50
        }
    }
};
```

## 分配规则

### 玩家段位限制

```typescript
const segmentRestrictedTask = {
    templateId: "gold_promotion",
    name: "黄金段位晋升",
    allocationRules: {
        segmentName: ["bronze", "silver"] // 只分配给青铜和白银段位玩家
    }
};
```

### 订阅要求

```typescript
const premiumTask = {
    templateId: "premium_bonus",
    name: "订阅者专属奖励",
    allocationRules: {
        subscriptionRequired: true // 只分配给订阅用户
    }
};
```

### 游戏偏好匹配

```typescript
const gameSpecificTask = {
    templateId: "solitaire_master",
    name: "Solitaire大师",
    gameType: "solitaire",
    allocationRules: {
        gamePreferences: ["solitaire"] // 优先分配给偏好Solitaire的玩家
    }
};
```

## 最佳实践

### 1. 任务设计原则

- **平衡性**: 确保任务难度与奖励价值匹配
- **多样性**: 提供不同类型的任务以满足不同玩家需求
- **可完成性**: 确保任务在合理时间内可以完成
- **激励性**: 提供有意义的奖励来激励玩家参与

### 2. 事件处理

- **及时性**: 在相关游戏事件发生时立即处理任务事件
- **准确性**: 确保事件数据准确反映玩家行为
- **性能**: 批量处理事件以提高性能

### 3. 奖励设计

- **多样性**: 提供多种类型的奖励
- **价值感**: 确保奖励对玩家有价值
- **稀缺性**: 某些奖励应该具有稀缺性以增加价值

### 4. 监控和维护

- **定期检查**: 定期验证任务系统数据完整性
- **性能监控**: 监控任务处理性能
- **用户反馈**: 根据玩家反馈调整任务设计

## 故障排除

### 常见问题

1. **任务不更新进度**
   - 检查事件是否正确触发
   - 验证任务条件配置
   - 确认事件数据格式正确

2. **奖励发放失败**
   - 检查玩家数据完整性
   - 验证奖励配置格式
   - 确认相关系统（道具、门票等）正常工作

3. **任务分配失败**
   - 检查分配规则配置
   - 验证玩家数据完整性
   - 确认任务模板状态

### 调试工具

```typescript
import { validateTaskSystem } from "./scripts/initTaskSystem";

// 验证任务系统数据完整性
const validation = await validateTaskSystem();
console.log(validation.validation);
```

这个任务系统提供了完整的游戏内任务管理功能，支持多种任务类型和奖励系统，可以有效地激励玩家参与游戏并提升用户留存率。 