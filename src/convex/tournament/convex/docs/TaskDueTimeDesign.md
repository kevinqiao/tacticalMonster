# 任务 DueTime 设计说明

## 设计概述

通过为任务定义 `dueTime`（过期时间），实现更精确和灵活的任务生命周期管理。**所有任务（已完成/未完成）都统一基于 `dueTime` 来控制重置**。

## 设计优势

### **1. 统一的过期控制**
```typescript
// 统一基于dueTime的过期检查，不区分任务状态
const taskDueTime = new Date(task.dueTime || task.createdAt);
const nowTime = now.localDate.getTime();
const isExpired = nowTime > taskDueTime.getTime();

if (isExpired) {
    // 任务已过期，允许重置（无论是否完成）
    shouldReset = true;
    resetReason = `expired_${resetType}`;
} else {
    // 任务未过期，不重置（无论是否完成）
    shouldReset = false;
    resetReason = `not_expired_${resetType}`;
}
```

### **2. 简化的业务逻辑**
- **所有任务**：统一基于 `dueTime` 判断是否重置
- **已完成任务**：过期后重置，重新开始
- **未完成任务**：过期后重置，重新开始
- **无状态区分**：不再区分已完成和未完成的不同处理逻辑

### **3. 一致的行为模式**
- 任务在dueTime之前：正常工作，不重置
- 任务在dueTime之后：自动过期，重置重新开始

## DueTime 计算规则

### **任务类型过期时间设置**

| 任务类型 | 过期时间 | 说明 |
|---------|---------|------|
| daily | 创建时间 + 1天 | 每日任务，明天过期 |
| weekly | 创建时间 + 7天 | 每周任务，7天后过期 |
| monthly | 创建时间 + 1个月 | 每月任务，下个月过期 |
| one_time | 无过期时间 | 一次性任务，永久有效 |
| achievement | 无过期时间 | 成就任务，永久有效 |
| season | 无过期时间 | 赛季任务，永久有效 |
| multi_stage | 无过期时间 | 多阶段任务，永久有效 |
| conditional | 无过期时间 | 条件任务，永久有效 |
| time_based | 无过期时间 | 时间任务，永久有效 |

### **实现代码**

```typescript
/**
 * 计算任务过期时间
 */
private static calculateTaskDueTime(taskType: string, now: any): string | undefined {
    const dueTime = new Date(now.localDate);
    
    switch (taskType) {
        case "daily":
            dueTime.setDate(dueTime.getDate() + 1); // 每日任务，过期时间为明天
            break;
        case "weekly":
            dueTime.setDate(dueTime.getDate() + 7); // 每周任务，过期时间为7天后
            break;
        case "monthly":
            dueTime.setMonth(dueTime.getMonth() + 1); // 每月任务，过期时间为下个月
            dueTime.setDate(1); // 设置为下个月1日
            break;
        case "one_time":
        case "achievement":
        case "season":
        case "multi_stage":
        case "conditional":
        case "time_based":
            // 一次性任务和成就任务没有固定过期时间
            return undefined;
        default:
            return undefined;
    }
    
    return dueTime.toISOString();
}
```

## 统一重置逻辑

### **简化的重置条件**

| 任务状态 | DueTime状态 | 重置结果 | 原因 |
|---------|------------|---------|------|
| 已完成 | 已过期 | **允许重置** | `expired_{type}` |
| 已完成 | 未过期 | **不重置** | `not_expired_{type}` |
| 未完成 | 已过期 | **允许重置** | `expired_{type}` |
| 未完成 | 未过期 | **不重置** | `not_expired_{type}` |

### **统一重置逻辑实现**

```typescript
/**
 * 智能重置玩家任务 - 统一基于dueTime控制
 */
static async smartResetPlayerTasks(ctx: any, uid: string, resetType: "daily" | "weekly" | "monthly"): Promise<{ success: boolean; message: string; resetTasks?: string[]; skippedTasks?: string[] }> {
    const now = getTorontoMidnight();
    const resetTasks: string[] = [];
    const skippedTasks: string[] = [];

    // 获取需要重置的任务
    const playerTasks = await this.getPlayerTasks(ctx, uid);

    for (const task of playerTasks) {
        if (task.type !== resetType) continue;

        let shouldReset = false;
        let resetReason = "";

        // 统一基于dueTime判断是否重置
        const taskDueTime = new Date(task.dueTime || task.createdAt);
        const nowTime = now.localDate.getTime();
        const isExpired = nowTime > taskDueTime.getTime();
        
        if (isExpired) {
            // 任务已过期，允许重置（无论是否完成）
            shouldReset = true;
            resetReason = `expired_${resetType}`;
        } else {
            // 任务未过期，不重置（无论是否完成）
            shouldReset = false;
            resetReason = `not_expired_${resetType}`;
        }

        if (shouldReset) {
            // 重置任务状态
            const taskRecord = await ctx.db.query("player_tasks")
                .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                .unique();

            const newState = {
                isCompleted: false,
                completedAt: undefined,
                rewardsClaimed: false,
                claimedAt: undefined,
                progress: this.getInitialProgress(task.condition),
                lastReset: now.iso,
                updatedAt: now.iso
            };

            await ctx.db.patch(taskRecord._id, newState);
            resetTasks.push(task.taskId);
        } else {
            skippedTasks.push(task.taskId);
        }
    }

    return {
        success: true,
        message: `重置了 ${resetTasks.length} 个任务，跳过了 ${skippedTasks.length} 个任务`,
        resetTasks,
        skippedTasks
    };
}
```

## 实际应用场景

### **场景1：新玩家首次登录**
```
时间点1: 玩家登录
├── allocateTasksForPlayer() 分配任务
├── daily任务：dueTime = 明天
├── weekly任务：dueTime = 7天后
└── monthly任务：dueTime = 下个月1日

时间点2: 任务管理检查
├── smartResetPlayerTasks() 调用
├── 检查所有任务dueTime vs 当前时间
├── 未过期任务：跳过重置（无论完成状态）
└── 已过期任务：允许重置（无论完成状态）
```

### **场景2：现有玩家每日重置**
```
时间点1: 玩家登录
├── managePlayerTasks() 调用
├── 检查daily任务dueTime
├── 如果dueTime < 当前时间：允许重置（无论完成状态）
└── 如果dueTime > 当前时间：跳过重置（无论完成状态）
```

### **场景3：已完成任务的重新开始**
```
时间点1: 玩家完成daily任务
├── 任务状态：isCompleted = true
├── dueTime = 明天

时间点2: 明天到来
├── 检查任务dueTime
├── 发现任务已过期（即使已完成）
└── 重置任务，重新开始
```

## 设计优势总结

### **相比复杂状态判断的优势**

1. **逻辑简化**：
   - 不再需要区分已完成和未完成的不同处理逻辑
   - 统一的过期检查机制
   - 代码更简洁，更易维护

2. **行为一致**：
   - 所有任务都遵循相同的过期规则
   - 已完成任务和未完成任务的处理方式一致
   - 避免了状态不一致的问题

3. **更好的用户体验**：
   - 已完成的任务在过期后也会重新开始
   - 给玩家更多机会获得奖励
   - 保持游戏的活跃度

4. **更清晰的业务逻辑**：
   - 任务过期就是过期，不区分状态
   - 业务逻辑更加直观
   - 减少了复杂的条件判断

5. **更好的扩展性**：
   - 易于添加新的任务类型
   - 易于修改过期策略
   - 代码结构更加清晰

## 测试用例

### **测试用例1：已完成任务的过期重置**
```typescript
// 模拟已完成的过期任务
const completedExpiredTask = {
    taskId: "test_task_1",
    type: "daily",
    isCompleted: true,
    dueTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
};

// 调用重置方法
const result = await smartResetPlayerTasks(ctx, uid, "daily");

// 期望结果：任务被重置（即使已完成）
expect(result.resetTasks).toContain("test_task_1");
```

### **测试用例2：未完成任务的过期重置**
```typescript
// 模拟未完成的过期任务
const incompleteExpiredTask = {
    taskId: "test_task_2",
    type: "daily",
    isCompleted: false,
    dueTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
};

// 调用重置方法
const result = await smartResetPlayerTasks(ctx, uid, "daily");

// 期望结果：任务被重置
expect(result.resetTasks).toContain("test_task_2");
```

### **测试用例3：未过期任务的处理**
```typescript
// 模拟未过期的任务（无论完成状态）
const activeTasks = [
    {
        taskId: "test_task_3",
        type: "daily",
        isCompleted: true,
        dueTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12小时后过期
        createdAt: new Date().toISOString()
    },
    {
        taskId: "test_task_4",
        type: "daily",
        isCompleted: false,
        dueTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12小时后过期
        createdAt: new Date().toISOString()
    }
];

// 调用重置方法
const result = await smartResetPlayerTasks(ctx, uid, "daily");

// 期望结果：两个任务都被跳过
expect(result.skippedTasks).toContain("test_task_3");
expect(result.skippedTasks).toContain("test_task_4");
expect(result.resetTasks).not.toContain("test_task_3");
expect(result.resetTasks).not.toContain("test_task_4");
```

## 监控和日志

### **简化的重置原因分类**
- `expired_daily`: 任务已过期（每日任务）
- `expired_weekly`: 任务已过期（每周任务）
- `expired_monthly`: 任务已过期（每月任务）
- `not_expired_daily`: 任务未过期（每日任务）
- `not_expired_weekly`: 任务未过期（每周任务）
- `not_expired_monthly`: 任务未过期（每月任务）

### **日志示例**
```
重置任务 task_123: expired_daily
跳过任务 task_456: not_expired_weekly
重置任务 task_789: expired_monthly
跳过任务 task_101: not_expired_daily
```

## 总结

统一基于 `dueTime` 控制的设计提供了：

1. **简化的逻辑**：不再区分已完成和未完成的不同处理
2. **一致的行为**：所有任务都遵循相同的过期规则
3. **更好的用户体验**：已完成任务也会重新开始，增加游戏活跃度
4. **清晰的业务逻辑**：任务过期就是过期，逻辑直观
5. **优秀的扩展性**：易于添加新任务类型和修改过期策略

这个设计比复杂的状态判断更加简洁和实用，能够更好地满足任务系统的需求。 