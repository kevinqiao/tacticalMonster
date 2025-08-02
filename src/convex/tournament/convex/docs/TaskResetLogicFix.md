# 任务重置逻辑修复说明

## 问题描述

在 `smartResetPlayerTasks` 方法中，存在一个逻辑缺陷：**刚分配的任务可能会被立即重置**。

### 问题场景

1. **新玩家登录** → `allocateTasksForPlayer()` → 分配新任务
2. **任务管理** → `managePlayerTasks()` → `smartResetPlayerTasks()` → 重置刚分配的任务！

### 问题原因

```typescript
// 原始逻辑（有问题）
if (task.lastReset) {
    // 有重置记录，按时间间隔判断
} else {
    // 未完成且没有重置记录，允许重置 ❌
    shouldReset = true;
    resetReason = "incomplete_no_reset_record";
}
```

**问题分析：**
- 新分配的任务 `lastReset` 为 `undefined`
- 新分配的任务 `isCompleted` 为 `false`
- 按照原始逻辑，会被立即重置

## 修复方案

### 修复后的逻辑

```typescript
// 修复后的逻辑
if (task.lastReset) {
    // 有重置记录，按时间间隔判断
} else {
    // 未完成且没有重置记录 - 检查是否为刚分配的任务
    const taskAge = now.localDate.getTime() - new Date(task.createdAt).getTime();
    const hoursSinceCreation = taskAge / (1000 * 60 * 60);
    
    // 根据任务类型设置不同的保护期
    let protectionHours = 24; // 默认保护期
    switch (resetType) {
        case "daily":
            protectionHours = 2; // 每日任务：2小时保护期
            break;
        case "weekly":
            protectionHours = 24; // 每周任务：24小时保护期
            break;
        case "monthly":
            protectionHours = 72; // 每月任务：72小时保护期
            break;
    }
    
    // 如果任务创建时间小于保护期，认为是刚分配的任务，不重置
    if (hoursSinceCreation < protectionHours) {
        shouldReset = false;
        resetReason = `incomplete_recently_allocated_${resetType}`;
    } else {
        // 任务创建时间超过保护期，允许重置
        shouldReset = true;
        resetReason = `incomplete_no_reset_record_old_${resetType}`;
    }
}
```

### 修复要点

1. **时间检查**：通过 `task.createdAt` 检查任务创建时间
2. **差异化保护期**：根据任务类型设置不同的保护期
3. **区分处理**：区分新分配的任务和真正需要重置的旧任务

## 保护期设置

### 任务类型保护期

| 任务类型 | 保护期 | 说明 |
|---------|--------|------|
| daily | 2小时 | 每日任务，快速重置，短保护期 |
| weekly | 24小时 | 每周任务，中等保护期 |
| monthly | 72小时 | 每月任务，长保护期，避免过早重置 |

### 设计原理

1. **daily任务**：2小时保护期
   - 每日任务需要频繁重置
   - 2小时足够让玩家看到任务，但不会影响每日重置
   - 避免刚分配就被重置的问题

2. **weekly任务**：24小时保护期
   - 每周任务有较长的生命周期
   - 24小时保护期确保玩家有足够时间了解任务
   - 平衡保护和重置需求

3. **monthly任务**：72小时保护期
   - 每月任务生命周期最长
   - 72小时（3天）保护期确保玩家充分了解任务
   - 避免长时间未登录玩家的任务被过早重置

## 重置逻辑总结

### 任务重置条件

| 任务状态 | 重置记录 | 创建时间 | 重置结果 | 原因 |
|---------|---------|---------|---------|------|
| 已完成 | 有 | - | 按时间间隔 | `completed_and_interval_passed` |
| 已完成 | 无 | - | 允许重置 | `completed_no_reset_record` |
| 未完成 | 有 | - | 按时间间隔 | `incomplete_and_interval_passed` |
| 未完成 | 无 | < 保护期 | **不重置** | `incomplete_recently_allocated_{type}` |
| 未完成 | 无 | ≥ 保护期 | 允许重置 | `incomplete_no_reset_record_old_{type}` |

### 时间间隔规则

| 任务类型 | 重置间隔 | 保护期 | 说明 |
|---------|---------|--------|------|
| daily | 1天 | 2小时 | 每日任务，快速重置，短保护期 |
| weekly | 7天 | 24小时 | 每周任务，中等保护期 |
| monthly | 30天 | 72小时 | 每月任务，长保护期 |

## 实际应用场景

### 场景1：新玩家首次登录
```
时间点1: 玩家登录
├── managePlayerTasks() 调用
├── 检测到新玩家 (playerTasks.length === 0)
├── allocateTasksForPlayer() 分配任务
└── 任务创建时间记录为当前时间

时间点2: 任务管理检查（2小时后）
├── smartResetPlayerTasks() 调用
├── daily任务：检查创建时间 < 2小时 → 跳过重置
├── weekly任务：检查创建时间 < 24小时 → 跳过重置
└── monthly任务：检查创建时间 < 72小时 → 跳过重置
```

### 场景2：现有玩家每日重置
```
时间点1: 玩家登录
├── managePlayerTasks() 调用
├── 检测到现有玩家
├── smartResetPlayerTasks() 检查重置
├── daily任务：如果创建时间 > 2小时，允许重置
├── weekly任务：如果创建时间 > 24小时，允许重置
└── monthly任务：如果创建时间 > 72小时，允许重置
```

### 场景3：长时间未登录的玩家
```
时间点1: 玩家登录
├── managePlayerTasks() 调用
├── 检查任务状态
├── daily任务：创建时间 > 2小时 → 允许重置
├── weekly任务：创建时间 > 24小时 → 允许重置
└── monthly任务：创建时间 > 72小时 → 允许重置
```

## 测试用例

### 测试用例1：不同任务类型的保护期
```typescript
// 模拟不同时间创建的任务
const tasks = [
    {
        taskId: "daily_task_1",
        type: "daily",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1小时前
        isCompleted: false,
        lastReset: undefined
    },
    {
        taskId: "weekly_task_1", 
        type: "weekly",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12小时前
        isCompleted: false,
        lastReset: undefined
    },
    {
        taskId: "monthly_task_1",
        type: "monthly", 
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 36小时前
        isCompleted: false,
        lastReset: undefined
    }
];

// 测试daily任务重置
const dailyResult = await smartResetPlayerTasks(ctx, uid, "daily");
// 期望：daily_task_1 被跳过（1小时 < 2小时保护期）

// 测试weekly任务重置  
const weeklyResult = await smartResetPlayerTasks(ctx, uid, "weekly");
// 期望：weekly_task_1 被跳过（12小时 < 24小时保护期）

// 测试monthly任务重置
const monthlyResult = await smartResetPlayerTasks(ctx, uid, "monthly");
// 期望：monthly_task_1 被跳过（36小时 < 72小时保护期）
```

### 测试用例2：超过保护期的任务
```typescript
// 模拟超过保护期的任务
const oldTasks = [
    {
        taskId: "daily_task_old",
        type: "daily",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3小时前
        isCompleted: false,
        lastReset: undefined
    },
    {
        taskId: "weekly_task_old",
        type: "weekly", 
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25小时前
        isCompleted: false,
        lastReset: undefined
    },
    {
        taskId: "monthly_task_old",
        type: "monthly",
        createdAt: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(), // 73小时前
        isCompleted: false,
        lastReset: undefined
    }
];

// 测试重置
const result = await smartResetPlayerTasks(ctx, uid, "daily");
// 期望：daily_task_old 被重置（3小时 > 2小时保护期）
```

## 监控和日志

### 重置原因分类
- `completed_and_interval_passed`: 已完成且间隔已过
- `completed_but_interval_not_passed`: 已完成但间隔未过
- `completed_no_reset_record`: 已完成但无重置记录
- `incomplete_and_interval_passed`: 未完成且间隔已过
- `incomplete_but_interval_not_passed`: 未完成但间隔未过
- `incomplete_recently_allocated_daily`: 未完成但刚分配（每日任务保护）
- `incomplete_recently_allocated_weekly`: 未完成但刚分配（每周任务保护）
- `incomplete_recently_allocated_monthly`: 未完成但刚分配（每月任务保护）
- `incomplete_no_reset_record_old_daily`: 未完成且无重置记录（旧每日任务）
- `incomplete_no_reset_record_old_weekly`: 未完成且无重置记录（旧每周任务）
- `incomplete_no_reset_record_old_monthly`: 未完成且无重置记录（旧每月任务）

### 日志示例
```
重置任务 task_123: completed_and_interval_passed
跳过任务 task_456: incomplete_recently_allocated_daily
跳过任务 task_789: incomplete_recently_allocated_weekly
重置任务 task_101: incomplete_no_reset_record_old_monthly
```

## 总结

这个修复解决了以下关键问题：

1. **差异化保护**：根据任务类型设置合适的保护期
2. **保护新任务**：防止刚分配的任务被立即重置
3. **区分新旧任务**：通过创建时间和任务类型区分新分配和需要重置的任务
4. **保持灵活性**：仍然允许重置真正需要重置的旧任务
5. **提高用户体验**：避免玩家刚获得任务就被重置的困惑

修复后的逻辑更加健壮和合理，能够正确处理各种任务生命周期场景。 