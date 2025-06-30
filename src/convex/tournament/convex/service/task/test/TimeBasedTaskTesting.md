# 时间相关任务测试指南

## 概述

本文档介绍如何使用 `testComplexTasks.ts` 中的测试函数来验证时间相关任务的功能。这些测试函数可以帮助开发者验证各种时间相关任务的创建、事件处理和进度跟踪。

## 可用的测试函数

### 1. `testTimeBasedTask`

创建并测试单个时间相关任务。

**参数：**
- `playerId`: 玩家ID
- `taskType`: 任务类型（可选，默认为 "consecutive_login"）
- `event`: 事件数据（可选）

**支持的任务类型：**
- `consecutive_login`: 连续登录任务
- `consecutive_match`: 连续对战任务
- `mixed_time_task`: 混合时间任务
- `time_window_task`: 时间窗口任务
- `complex_time_task`: 复杂时间任务

**使用示例：**
```typescript
// 创建连续登录任务
const result = await testTimeBasedTask({
  playerId: "player123",
  taskType: "consecutive_login"
});

// 创建任务并立即触发事件
const result = await testTimeBasedTask({
  playerId: "player123",
  taskType: "consecutive_login",
  event: { action: "login", actionData: {} }
});
```

### 2. `testConsecutiveLoginScenario`

测试连续登录场景，模拟3天连续登录。

**参数：**
- `playerId`: 玩家ID

**使用示例：**
```typescript
const result = await testConsecutiveLoginScenario({
  playerId: "player123"
});
```

**预期结果：**
- 创建连续登录任务（要求3天连续登录）
- 记录3个登录事件
- 调度任务处理

### 3. `testMixedTimeTaskScenario`

测试混合时间任务场景，包含登录和对战事件。

**参数：**
- `playerId`: 玩家ID

**使用示例：**
```typescript
const result = await testMixedTimeTaskScenario({
  playerId: "player123"
});
```

**事件序列：**
1. 登录事件
2. 完成对战事件
3. 登录事件
4. 完成对战事件
5. 完成对战事件

### 4. `testTimeWindowScenario`

测试时间窗口任务，快速完成4场对战。

**参数：**
- `playerId`: 玩家ID

**使用示例：**
```typescript
const result = await testTimeWindowScenario({
  playerId: "player123"
});
```

### 5. `getTimeBasedTaskTemplates`

获取所有可用的时间相关任务模板。

**使用示例：**
```typescript
const templates = await getTimeBasedTaskTemplates();
console.log(templates.templates);
```

### 6. `createMultipleTimeBasedTasks`

批量创建所有类型的时间相关任务。

**参数：**
- `playerId`: 玩家ID

**使用示例：**
```typescript
const result = await createMultipleTimeBasedTasks({
  playerId: "player123"
});
```

## 任务模板详解

### 连续登录任务 (consecutive_login)
```json
{
  "title": "连续登录挑战",
  "description": "连续7天登录游戏",
  "type": "time_based",
  "condition": {
    "action": "login",
    "count": 7
  },
  "rewards": {
    "coins": 300,
    "gamePoints": 50
  }
}
```

### 连续对战任务 (consecutive_match)
```json
{
  "title": "连续对战大师",
  "description": "连续5天完成对战",
  "type": "time_based",
  "condition": {
    "action": "complete_match",
    "count": 5
  },
  "rewards": {
    "coins": 200,
    "gamePoints": 30
  }
}
```

### 混合时间任务 (mixed_time_task)
```json
{
  "title": "混合挑战",
  "description": "连续登录3天并在7天内完成5场对战",
  "type": "time_based",
  "condition": {
    "action": "login",
    "count": 3
  },
  "rewards": {
    "coins": 250,
    "gamePoints": 40
  }
}
```

## 测试流程

### 1. 准备测试环境
```typescript
// 确保玩家存在
const player = await db.query("players")
  .withIndex("by_uid", (q) => q.eq("uid", "player123"))
  .first();

if (!player) {
  // 创建测试玩家
  await db.insert("players", {
    uid: "player123",
    name: "TestPlayer",
    // ... 其他字段
  });
}
```

### 2. 执行测试
```typescript
// 测试连续登录场景
const result = await testConsecutiveLoginScenario({
  playerId: "player123"
});

console.log("测试结果:", result);
```

### 3. 验证结果
```typescript
// 检查任务是否创建
const tasks = await db.query("player_tasks")
  .withIndex("by_uid_taskId", (q) => q.eq("uid", "player123"))
  .collect();

console.log("玩家任务:", tasks);

// 检查事件是否记录
const events = await db.query("task_events")
  .withIndex("by_uid_processed", (q) => q.eq("uid", "player123").eq("processed", false))
  .collect();

console.log("待处理事件:", events);
```

## 注意事项

### 1. 异步处理
所有任务事件处理都是异步的，使用 `ctx.scheduler.runAfter` 调度。测试函数不会等待处理完成，只会记录事件并调度处理。

### 2. 事件处理
任务事件通过 `task_events` 表记录，然后由 `processTaskEvents` 内部函数处理。

### 3. 进度跟踪
时间相关任务的进度包含：
- `actions`: 各动作的进度计数
- `lastActionDate`: 最后动作日期
- `consecutiveDays`: 连续天数
- `startDate`: 开始日期

### 4. 任务完成
任务完成时会：
- 更新 `isCompleted` 为 `true`
- 发放奖励
- 发送通知

## 扩展测试

### 自定义事件序列
```typescript
// 创建自定义测试
const customEvents = [
  { action: "login", actionData: {} },
  { action: "complete_match", actionData: { gameType: "ludo" } },
  { action: "win_match", actionData: { gameType: "ludo" } }
];

for (const event of customEvents) {
  await db.insert("task_events", {
    uid: "player123",
    action: event.action,
    actionData: event.actionData,
    processed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
```

### 验证任务进度
```typescript
// 检查特定任务的进度
const task = await db.query("player_tasks")
  .withIndex("by_uid_taskId", (q) => q.eq("uid", "player123").eq("taskId", "consecutive_login_test"))
  .first();

if (task) {
  console.log("任务进度:", task.progress);
  console.log("是否完成:", task.isCompleted);
}
```

## 故障排除

### 常见问题

1. **任务未创建**
   - 检查玩家ID是否正确
   - 确认数据库连接正常

2. **事件未处理**
   - 检查 `task_events` 表是否有记录
   - 确认 `processed` 字段状态

3. **进度未更新**
   - 检查任务条件是否匹配事件
   - 确认任务处理器是否正确注册

### 调试技巧

1. **启用详细日志**
   ```typescript
   console.log("任务创建:", taskId);
   console.log("事件记录:", eventId);
   ```

2. **检查数据库状态**
   ```typescript
   // 检查所有相关数据
   const allData = await Promise.all([
     db.query("player_tasks").collect(),
     db.query("task_events").collect(),
     db.query("notifications").collect()
   ]);
   ```

3. **验证任务处理器**
   ```typescript
   // 检查处理器是否正确注册
   console.log("可用处理器:", Object.keys(taskHandlers));
   ``` 