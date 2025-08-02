# 任务奖励保护机制设计

## 问题背景

在任务系统中，存在一个重要的风险：**玩家完成任务后还没来得及领取奖励就被重置了**。

### **风险场景**
```
时间点1: 玩家完成任务
├── 任务状态：isCompleted = true
├── 奖励状态：rewardsClaimed = false

时间点2: 任务过期检查
├── smartResetPlayerTasks() 调用
├── 检查任务dueTime
├── 发现任务已过期（即使已完成但未领取奖励）
└── 重置任务，玩家失去奖励！
```

### **问题根源**
- 当前逻辑只检查 `dueTime`，不检查奖励领取状态
- 已完成但未领取奖励的任务也会被重置
- 玩家可能因为网络延迟、游戏中断等原因错过领取奖励

## 解决方案

### **1. 奖励保护机制**

在重置逻辑中添加保护条件：

```typescript
// 检查是否需要保护已完成但未领取奖励的任务
const shouldProtectCompletedTask = task.isCompleted && !task.rewardsClaimed;

if (isExpired && !shouldProtectCompletedTask) {
    // 任务已过期，且不需要保护，允许重置
    shouldReset = true;
    resetReason = `expired_${resetType}`;
} else if (isExpired && shouldProtectCompletedTask) {
    // 任务已过期，但需要保护（已完成未领取奖励），不重置
    shouldReset = false;
    resetReason = `expired_but_protected_${resetType}`;
} else {
    // 任务未过期，不重置
    shouldReset = false;
    resetReason = `not_expired_${resetType}`;
}
```

### **2. 受保护任务处理**

添加专门的方法处理过期但受保护的任务：

```typescript
/**
 * 处理过期但受保护的任务（已完成但未领取奖励）
 */
static async handleExpiredProtectedTasks(ctx: any, uid: string): Promise<{ success: boolean; message: string; processedTasks?: string[] }> {
    const now = getTorontoMidnight();
    const processedTasks: string[] = [];

    // 获取所有已完成但未领取奖励的过期任务
    const playerTasks = await this.getPlayerTasks(ctx, uid);
    
    for (const task of playerTasks) {
        if (!task.isCompleted || task.rewardsClaimed) continue;

        const taskDueTime = new Date(task.dueTime || task.createdAt);
        const nowTime = now.localDate.getTime();
        const isExpired = nowTime > taskDueTime.getTime();

        if (isExpired) {
            // 任务已过期，标记为需要处理
            const taskRecord = await ctx.db.query("player_tasks")
                .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                .unique();

            // 更新任务状态，标记为需要处理
            await ctx.db.patch(taskRecord._id, {
                updatedAt: now.iso,
                // 可以添加一个标记字段表示需要处理
                // needsAttention: true
            });

            processedTasks.push(task.taskId);
            console.log(`标记过期受保护任务 ${task.taskId} 需要处理`);
        }
    }

    return {
        success: true,
        message: `处理了 ${processedTasks.length} 个过期但受保护的任务`,
        processedTasks
    };
}
```

## 重置逻辑更新

### **新的重置条件**

| 任务状态 | 奖励状态 | DueTime状态 | 重置结果 | 原因 |
|---------|---------|------------|---------|------|
| 已完成 | 已领取 | 已过期 | **允许重置** | `expired_{type}` |
| 已完成 | 未领取 | 已过期 | **不重置** | `expired_but_protected_{type}` |
| 已完成 | 已领取 | 未过期 | **不重置** | `not_expired_{type}` |
| 已完成 | 未领取 | 未过期 | **不重置** | `not_expired_{type}` |
| 未完成 | - | 已过期 | **允许重置** | `expired_{type}` |
| 未完成 | - | 未过期 | **不重置** | `not_expired_{type}` |

### **保护机制逻辑**

```typescript
// 统一基于dueTime判断是否重置
const taskDueTime = new Date(task.dueTime || task.createdAt);
const nowTime = now.localDate.getTime();
const isExpired = nowTime > taskDueTime.getTime();

// 检查是否需要保护已完成但未领取奖励的任务
const shouldProtectCompletedTask = task.isCompleted && !task.rewardsClaimed;

if (isExpired && !shouldProtectCompletedTask) {
    // 任务已过期，且不需要保护，允许重置
    shouldReset = true;
    resetReason = `expired_${resetType}`;
} else if (isExpired && shouldProtectCompletedTask) {
    // 任务已过期，但需要保护（已完成未领取奖励），不重置
    shouldReset = false;
    resetReason = `expired_but_protected_${resetType}`;
} else {
    // 任务未过期，不重置
    shouldReset = false;
    resetReason = `not_expired_${resetType}`;
}
```

## 任务管理流程更新

### **更新后的管理流程**

```typescript
/**
 * 任务生命周期管理 - 统一处理周期性任务
 */
static async managePeriodicTasks(ctx: any, uid: string, taskType: "daily" | "weekly" | "monthly"): Promise<{
    success: boolean;
    message: string;
    resetTasks?: string[];
    reallocatedTasks?: string[];
    skippedTasks?: string[];
    protectedTasks?: string[];
}> {
    const now = getTorontoMidnight();
    const resetTasks: string[] = [];
    const reallocatedTasks: string[] = [];
    const skippedTasks: string[] = [];
    const protectedTasks: string[] = [];

    // 步骤1: 重置现有任务状态
    const resetResult = await this.smartResetPlayerTasks(ctx, uid, taskType);
    if (resetResult.success) {
        resetTasks.push(...(resetResult.resetTasks || []));
        skippedTasks.push(...(resetResult.skippedTasks || []));
    }

    // 步骤2: 处理过期但受保护的任务
    const protectedResult = await this.handleExpiredProtectedTasks(ctx, uid);
    if (protectedResult.success) {
        protectedTasks.push(...(protectedResult.processedTasks || []));
    }

    // 步骤3: 检查并分配新任务模板
    const reallocateResult = await this.checkAndAllocateNewTemplates(ctx, uid, taskType);
    if (reallocateResult.success) {
        reallocatedTasks.push(...(reallocateResult.reallocatedTasks || []));
    }

    return {
        success: true,
        message: `${taskType}任务管理完成，重置了 ${resetTasks.length} 个任务，重新分配了 ${reallocatedTasks.length} 个任务，跳过了 ${skippedTasks.length} 个任务，保护了 ${protectedTasks.length} 个任务`,
        resetTasks,
        reallocatedTasks,
        skippedTasks,
        protectedTasks
    };
}
```

## 实际应用场景

### **场景1：正常完成任务并领取奖励**
```
时间点1: 玩家完成任务
├── 任务状态：isCompleted = true
├── 奖励状态：rewardsClaimed = false

时间点2: 玩家领取奖励
├── 调用 claimTaskRewards()
├── 奖励状态：rewardsClaimed = true

时间点3: 任务过期检查
├── smartResetPlayerTasks() 调用
├── 检查：isCompleted = true, rewardsClaimed = true
├── 保护条件：shouldProtectCompletedTask = false
└── 允许重置：expired_{type}
```

### **场景2：完成任务但未领取奖励**
```
时间点1: 玩家完成任务
├── 任务状态：isCompleted = true
├── 奖励状态：rewardsClaimed = false

时间点2: 任务过期检查
├── smartResetPlayerTasks() 调用
├── 检查：isCompleted = true, rewardsClaimed = false
├── 保护条件：shouldProtectCompletedTask = true
└── 不重置：expired_but_protected_{type}
```

### **场景3：网络延迟导致未领取奖励**
```
时间点1: 玩家完成任务
├── 任务状态：isCompleted = true
├── 奖励状态：rewardsClaimed = false

时间点2: 网络延迟，玩家未收到完成通知

时间点3: 任务过期检查
├── smartResetPlayerTasks() 调用
├── 检查：isCompleted = true, rewardsClaimed = false
├── 保护条件：shouldProtectCompletedTask = true
└── 不重置：expired_but_protected_{type}

时间点4: 玩家重新登录
├── 发现任务已完成但未领取奖励
└── 可以正常领取奖励
```

## 测试用例

### **测试用例1：保护已完成未领取奖励的任务**
```typescript
// 模拟已完成但未领取奖励的过期任务
const protectedTask = {
    taskId: "test_task_1",
    type: "daily",
    isCompleted: true,
    rewardsClaimed: false,
    dueTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
};

// 调用重置方法
const result = await smartResetPlayerTasks(ctx, uid, "daily");

// 期望结果：任务被跳过，不重置
expect(result.skippedTasks).toContain("test_task_1");
expect(result.resetTasks).not.toContain("test_task_1");
```

### **测试用例2：允许重置已完成已领取奖励的任务**
```typescript
// 模拟已完成且已领取奖励的过期任务
const completedClaimedTask = {
    taskId: "test_task_2",
    type: "daily",
    isCompleted: true,
    rewardsClaimed: true,
    dueTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
};

// 调用重置方法
const result = await smartResetPlayerTasks(ctx, uid, "daily");

// 期望结果：任务被重置
expect(result.resetTasks).toContain("test_task_2");
expect(result.skippedTasks).not.toContain("test_task_2");
```

### **测试用例3：处理受保护任务**
```typescript
// 模拟多个受保护的任务
const protectedTasks = [
    {
        taskId: "test_task_3",
        type: "daily",
        isCompleted: true,
        rewardsClaimed: false,
        dueTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
        taskId: "test_task_4",
        type: "weekly",
        isCompleted: true,
        rewardsClaimed: false,
        dueTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
];

// 调用处理受保护任务的方法
const result = await handleExpiredProtectedTasks(ctx, uid);

// 期望结果：两个任务都被处理
expect(result.processedTasks).toContain("test_task_3");
expect(result.processedTasks).toContain("test_task_4");
```

## 监控和日志

### **重置原因分类**
- `expired_daily`: 任务已过期（每日任务）
- `expired_weekly`: 任务已过期（每周任务）
- `expired_monthly`: 任务已过期（每月任务）
- `expired_but_protected_daily`: 任务已过期但受保护（每日任务）
- `expired_but_protected_weekly`: 任务已过期但受保护（每周任务）
- `expired_but_protected_monthly`: 任务已过期但受保护（每月任务）
- `not_expired_daily`: 任务未过期（每日任务）
- `not_expired_weekly`: 任务未过期（每周任务）
- `not_expired_monthly`: 任务未过期（每月任务）

### **日志示例**
```
重置任务 task_123: expired_daily
跳过任务 task_456: expired_but_protected_weekly
跳过任务 task_789: not_expired_monthly
处理受保护任务 task_101: 标记需要处理
```

## 优势总结

### **保护机制的优势**

1. **防止奖励丢失**：
   - 已完成但未领取奖励的任务不会被重置
   - 确保玩家不会因为技术问题失去奖励

2. **提升用户体验**：
   - 玩家可以安心完成任务，不用担心奖励丢失
   - 减少因网络问题导致的奖励丢失投诉

3. **系统健壮性**：
   - 处理各种异常情况（网络延迟、游戏中断等）
   - 提供更好的容错机制

4. **清晰的业务逻辑**：
   - 明确区分已完成已领取和已完成未领取的任务
   - 业务逻辑更加合理

5. **可扩展性**：
   - 可以轻松添加更多的保护条件
   - 支持复杂的奖励保护策略

## 总结

任务奖励保护机制解决了以下关键问题：

1. **防止奖励丢失**：保护已完成但未领取奖励的任务
2. **提升用户体验**：确保玩家不会因技术问题失去奖励
3. **系统健壮性**：处理各种异常情况
4. **清晰的业务逻辑**：明确的任务状态处理
5. **良好的扩展性**：支持复杂的保护策略

这个机制确保了任务系统的可靠性和用户体验，是一个重要的改进！ 