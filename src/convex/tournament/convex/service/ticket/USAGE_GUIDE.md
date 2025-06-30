# 门票系统与任务系统集成使用指南

## 1. 快速开始

### 1.1 系统概述
门票系统与任务系统的集成提供了一个完整的游戏任务框架，允许玩家通过完成任务获得门票奖励，同时使用门票参与锦标赛。

### 1.2 核心组件
- **TaskTicketIntegration**: 主要的集成类
- **TaskExamples**: 任务示例和模板
- **IntegrationExample**: 完整集成流程示例
- **Convex函数**: 数据库操作接口

## 2. 基本使用

### 2.1 创建任务

#### 创建单个任务
```typescript
import { createTicketTask } from "./taskIntegration";

const result = await ctx.runMutation(createTicketTask, {
    taskId: "my_custom_task",
    taskName: "我的自定义任务",
    taskDescription: "这是一个自定义任务",
    taskType: "ticket_usage",
    requirements: {
        type: "ticket_usage",
        count: 3
    },
    rewards: {
        tickets: [
            { type: "advanced", expiryDate: "7天后过期" }
        ],
        points: 100
    }
});
```

#### 批量创建任务
```typescript
import { batchCreateTasks } from "./integrationExample";

const taskConfigs = [
    {
        taskId: "task1",
        taskName: "任务1",
        taskDescription: "第一个任务",
        taskType: "ticket_collection",
        requirements: { type: "ticket_collection", count: 1 },
        rewards: { tickets: [{ type: "normal" }], points: 50 }
    },
    {
        taskId: "task2",
        taskName: "任务2",
        taskDescription: "第二个任务",
        taskType: "tournament_victory",
        requirements: { type: "tournament_victory", count: 1 },
        rewards: { tickets: [{ type: "advanced" }], points: 100 }
    }
];

const result = await ctx.runMutation(batchCreateTasks, {
    taskConfigs
});
```

### 2.2 检查任务进度

```typescript
import { checkTaskProgress } from "./taskIntegration";

const progress = await ctx.runMutation(checkTaskProgress, {
    uid: "user123",
    gameType: "ludo",
    taskId: "my_custom_task"
});

console.log(`任务进度: ${progress.currentProgress}/${progress.maxProgress}`);
console.log(`是否完成: ${progress.isCompleted}`);
```

### 2.3 获取玩家任务列表

```typescript
import { getPlayerTasks } from "./taskIntegration";

const tasks = await ctx.runQuery(getPlayerTasks, {
    uid: "user123",
    gameType: "ludo"
});

tasks.tasks.forEach(task => {
    console.log(`任务: ${task.taskName}`);
    console.log(`进度: ${task.currentProgress}/${task.maxProgress}`);
    console.log(`完成状态: ${task.isCompleted}`);
});
```

## 3. 任务类型详解

### 3.1 门票收集任务
```typescript
{
    taskId: "collect_normal_tickets",
    taskName: "收集普通门票",
    taskDescription: "收集5张普通门票",
    taskType: "ticket_collection",
    requirements: {
        type: "ticket_collection",
        ticketType: "normal",
        count: 5
    },
    rewards: {
        tickets: [{ type: "advanced", count: 1 }],
        points: 100
    }
}
```

### 3.2 门票使用任务
```typescript
{
    taskId: "use_advanced_tickets",
    taskName: "使用高级门票",
    taskDescription: "使用3张高级门票参加锦标赛",
    taskType: "ticket_usage",
    requirements: {
        type: "ticket_usage",
        ticketType: "advanced",
        count: 3
    },
    rewards: {
        tickets: [{ type: "event", count: 1 }],
        points: 150
    }
}
```

### 3.3 锦标赛胜利任务
```typescript
{
    taskId: "win_tournaments",
    taskName: "锦标赛胜利",
    taskDescription: "在锦标赛中获胜10次",
    taskType: "tournament_victory",
    requirements: {
        type: "tournament_victory",
        count: 10
    },
    rewards: {
        tickets: [{ type: "exclusive", count: 1 }],
        points: 500
    }
}
```

### 3.4 门票精通任务
```typescript
{
    taskId: "ticket_mastery",
    taskName: "门票精通",
    taskDescription: "使用所有类型的门票",
    taskType: "ticket_mastery",
    requirements: {
        type: "ticket_mastery"
    },
    rewards: {
        tickets: [{ type: "master_exclusive", count: 1 }],
        points: 1000,
        achievements: ["ticket_master"]
    }
}
```

## 4. 高级功能

### 4.1 创建每日任务
```typescript
import { createDailyTasks } from "./taskIntegration";

const dailyTasks = await ctx.runMutation(createDailyTasks, {});
console.log(`创建了 ${dailyTasks.count} 个每日任务`);
```

### 4.2 创建成就任务
```typescript
import { createAchievementTasks } from "./taskIntegration";

const achievementTasks = await ctx.runMutation(createAchievementTasks, {});
console.log(`创建了 ${achievementTasks.count} 个成就任务`);
```

### 4.3 获取任务统计
```typescript
import { getTaskStatistics } from "./taskIntegration";

const stats = await ctx.runQuery(getTaskStatistics, {
    uid: "user123",
    gameType: "ludo"
});

console.log(`完成任务数: ${stats.stats.totalTasksCompleted}`);
console.log(`获得门票数: ${stats.stats.totalTicketsEarned}`);
console.log(`获得积分: ${stats.stats.totalPointsEarned}`);
```

### 4.4 重置每日任务
```typescript
import { resetDailyTasks } from "./taskIntegration";

const resetResult = await ctx.runMutation(resetDailyTasks, {});
console.log(`删除了 ${resetResult.deletedTasks} 个过期任务`);
console.log(`创建了 ${resetResult.newTasks.length} 个新任务`);
```

## 5. 完整集成示例

### 5.1 运行完整流程
```typescript
import { runCompleteIntegrationFlow } from "./integrationExample";

const result = await ctx.runMutation(runCompleteIntegrationFlow, {
    uid: "user123",
    gameType: "ludo"
});

if (result.success) {
    console.log("集成流程执行成功");
    console.log(`创建了 ${result.summary.newbieTasksCreated} 个新手任务`);
    console.log(`创建了 ${result.summary.dailyTasksCreated} 个每日任务`);
    console.log(`创建了 ${result.summary.achievementTasksCreated} 个成就任务`);
}
```

### 5.2 系统健康检查
```typescript
import { taskSystemHealthCheck } from "./integrationExample";

const health = await ctx.runQuery(taskSystemHealthCheck, {});
console.log(`系统状态: ${health.status}`);
health.checks.forEach(check => {
    console.log(`${check.component}: ${check.status} (${check.count} 条记录)`);
});
```

## 6. 任务配置最佳实践

### 6.1 任务难度设计
```typescript
// 新手任务 - 简单易完成
const newbieTask = {
    requirements: { type: "ticket_collection", count: 1 },
    rewards: { tickets: [{ type: "normal" }], points: 25 }
};

// 日常任务 - 中等难度
const dailyTask = {
    requirements: { type: "ticket_usage", count: 2 },
    rewards: { tickets: [{ type: "advanced" }], points: 50 }
};

// 成就任务 - 高难度
const achievementTask = {
    requirements: { type: "tournament_victory", count: 50 },
    rewards: { tickets: [{ type: "exclusive" }], points: 1000 }
};
```

### 6.2 奖励平衡
```typescript
// 奖励与难度匹配
const balancedRewards = {
    easy: { points: 25, tickets: [{ type: "normal" }] },
    normal: { points: 50, tickets: [{ type: "advanced" }] },
    hard: { points: 100, tickets: [{ type: "event" }] },
    expert: { points: 250, tickets: [{ type: "exclusive" }] },
    master: { points: 500, tickets: [{ type: "master_exclusive" }] }
};
```

### 6.3 时间设置
```typescript
// 任务过期时间设置
const expirySettings = {
    daily: 24 * 60 * 60 * 1000,      // 24小时
    weekly: 7 * 24 * 60 * 60 * 1000, // 7天
    monthly: 30 * 24 * 60 * 60 * 1000, // 30天
    permanent: null                   // 永不过期
};
```

## 7. 错误处理

### 7.1 常见错误及解决方案
```typescript
// 任务不存在
if (!progress.success && progress.error === "任务不存在") {
    console.log("需要先创建任务");
    await createTicketTask(ctx, taskConfig);
}

// 玩家数据不存在
if (!progress.success && progress.error.includes("玩家")) {
    console.log("需要初始化玩家数据");
    await initializePlayerData(ctx, uid, gameType);
}

// 数据库连接错误
if (!progress.success && progress.error.includes("数据库")) {
    console.log("数据库连接问题，请稍后重试");
    // 实现重试逻辑
}
```

### 7.2 异常处理最佳实践
```typescript
try {
    const result = await ctx.runMutation(createTicketTask, taskConfig);
    if (!result.success) {
        console.error("任务创建失败:", result.error);
        // 记录错误日志
        await logError(ctx, "task_creation_failed", result.error);
    }
} catch (error) {
    console.error("系统异常:", error);
    // 发送告警
    await sendAlert(ctx, "system_error", error.message);
}
```

## 8. 性能优化

### 8.1 批量操作
```typescript
// 批量检查任务进度
const batchCheckProgress = async (ctx, uid, gameType, taskIds) => {
    const results = [];
    for (const taskId of taskIds) {
        const progress = await checkTaskProgress(ctx, uid, gameType, taskId);
        results.push(progress);
    }
    return results;
};
```

### 8.2 缓存策略
```typescript
// 缓存任务数据
const getCachedTasks = async (ctx, uid, gameType) => {
    const cacheKey = `tasks_${uid}_${gameType}`;
    let tasks = await getFromCache(cacheKey);
    
    if (!tasks) {
        tasks = await getPlayerTasks(ctx, uid, gameType);
        await setCache(cacheKey, tasks, 300); // 缓存5分钟
    }
    
    return tasks;
};
```

## 9. 监控和调试

### 9.1 日志记录
```typescript
// 记录任务操作日志
const logTaskOperation = async (ctx, operation, data) => {
    await ctx.db.insert("task_logs", {
        logLevel: "info",
        message: `Task operation: ${operation}`,
        uid: data.uid,
        gameType: data.gameType,
        taskId: data.taskId,
        createdAt: getTorontoDate().iso
    });
};
```

### 9.2 性能监控
```typescript
// 监控任务完成率
const monitorTaskCompletion = async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    const completedTasks = tasks.filter(t => t.isCompleted);
    const completionRate = completedTasks.length / tasks.length;
    
    console.log(`任务完成率: ${(completionRate * 100).toFixed(2)}%`);
    
    if (completionRate < 0.1) {
        await sendAlert(ctx, "low_completion_rate", completionRate);
    }
};
```

## 10. 扩展和自定义

### 10.1 自定义任务类型
```typescript
// 创建自定义任务类型
const customTaskType = {
    id: "custom_achievement",
    name: "自定义成就",
    description: "自定义任务类型",
    category: "custom"
};

// 扩展进度检查逻辑
const checkCustomProgress = async (ctx, uid, gameType, requirements) => {
    // 实现自定义进度检查逻辑
    return { progress: 0, details: {} };
};
```

### 10.2 自定义奖励系统
```typescript
// 自定义奖励发放
const distributeCustomRewards = async (ctx, rewards, uid, gameType) => {
    // 实现自定义奖励发放逻辑
    if (rewards.customItems) {
        // 发放自定义道具
    }
    
    if (rewards.customCurrency) {
        // 发放自定义货币
    }
};
```

## 11. 常见问题解答

### Q1: 如何确保任务进度实时更新？
A1: 在相关的游戏事件中调用 `checkTaskProgress` 函数，系统会自动更新进度。

### Q2: 任务奖励发放失败怎么办？
A2: 系统有完整的错误处理和回滚机制，失败时会记录详细日志，可以手动重试。

### Q3: 如何优化大量任务的性能？
A3: 使用批量操作、缓存策略和异步处理来优化性能。

### Q4: 如何添加新的任务类型？
A4: 在 `TaskTicketIntegration` 类中添加新的任务类型定义和进度检查逻辑。

### Q5: 如何监控任务系统的健康状况？
A5: 使用 `taskSystemHealthCheck` 函数定期检查系统状态。

## 12. 总结

门票系统与任务系统的集成为游戏提供了强大的任务框架。通过合理使用这些功能，可以：

- 提升玩家参与度和留存率
- 建立完整的游戏经济循环
- 提供丰富的游戏体验
- 实现精细化的用户管理

关键是要根据游戏的具体需求，合理设计任务难度和奖励，确保系统的平衡性和可持续性。 