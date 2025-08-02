# 过期任务处理策略

## 概述

在任务表分离设计中，未完成但已过期的任务需要特殊处理。本文档详细说明了多种处理策略及其适用场景。

## 处理策略

### **策略1：移动到已完成表 (move_to_completed)**

**特点**：
- 直接将过期任务移动到 `completed_tasks` 表
- 标记为 `completionType: "expired"`
- 不给予奖励 (`rewardsClaimed: false`)

**适用场景**：
- 周期性任务（daily/weekly/monthly）且进度为0
- 复杂任务且进度低于20%
- 需要彻底清理的任务

**代码示例**：
```typescript
const result = await TaskSystem.handleExpiredTasks(ctx, uid, "move_to_completed");
// 结果：{ movedTasks: ["task1", "task2"], markedTasks: [], totalExpired: 2 }
```

### **策略2：标记为过期 (mark_as_expired)**

**特点**：
- 保留在 `active_tasks` 表中
- 更新状态为 `status: "expired"`
- 记录过期时间 `expiredAt`
- 允许玩家恢复任务

**适用场景**：
- 一次性任务（one_time/achievement/season）
- 玩家可能有兴趣继续完成的任务
- 需要保留任务历史的场景

**代码示例**：
```typescript
const result = await TaskSystem.handleExpiredTasks(ctx, uid, "mark_as_expired");
// 结果：{ movedTasks: [], markedTasks: ["task1", "task2"], totalExpired: 2 }
```

### **策略3：混合策略 (hybrid) - 推荐**

**特点**：
- 根据任务类型和进度智能决定处理方式
- 结合前两种策略的优势
- 提供最佳的用户体验

**决策逻辑**：
```typescript
switch (task.type) {
    case "daily":
    case "weekly":
    case "monthly":
        // 周期性任务：如果进度为0，直接移动到已完成表
        return progress === 0;
    
    case "one_time":
    case "achievement":
    case "season":
        // 一次性任务：保留在活跃表，让玩家有机会完成
        return false;
    
    case "multi_stage":
    case "conditional":
    case "time_based":
        // 复杂任务：根据进度决定
        const progressRatio = progress / targetValue;
        return progressRatio < 0.2; // 进度低于20%时移动
    
    default:
        return false;
}
```

**代码示例**：
```typescript
const result = await TaskSystem.handleExpiredTasks(ctx, uid, "hybrid");
// 结果：{ movedTasks: ["task1"], markedTasks: ["task2"], totalExpired: 2 }
```

## 任务状态管理

### **活跃任务状态**

```typescript
interface ActiveTask {
    status: "active" | "expired" | "completed";
    dueTime?: string;     // 计划过期时间
    expiredAt?: string;   // 实际过期时间
    // ... 其他字段
}
```

### **已完成任务完成类型**

```typescript
interface CompletedTask {
    completionType: "success" | "expired" | "manual";
    failureReason?: string; // 失败原因
    // ... 其他字段
}
```

## 过期任务恢复机制

### **恢复过期任务**

```typescript
/**
 * 恢复过期任务 - 允许玩家继续完成
 */
static async restoreExpiredTask(ctx: any, uid: string, taskId: string): Promise<{ success: boolean; message: string }> {
    // 查找过期任务
    const expiredTask = await ctx.db.query("active_tasks")
        .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
        .filter((q: any) => q.eq(q.field("status"), "expired"))
        .unique();

    if (!expiredTask) {
        return { success: false, message: "过期任务不存在" };
    }

    // 计算新的过期时间
    const newDueTime = this.calculateTaskDueTime(expiredTask.type, now);

    // 恢复任务状态
    await ctx.db.patch(expiredTask._id, {
        status: "active",
        expiredAt: undefined,
        dueTime: newDueTime,
        updatedAt: now.iso
    });

    return {
        success: true,
        message: "任务已恢复，可以继续完成"
    };
}
```

### **强制完成过期任务**

```typescript
/**
 * 强制完成过期任务 - 管理员功能
 */
static async forceCompleteExpiredTask(ctx: any, uid: string, taskId: string): Promise<{ success: boolean; message: string }> {
    // 查找过期任务
    const expiredTask = await ctx.db.query("active_tasks")
        .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
        .filter((q: any) => q.eq(q.field("status"), "expired"))
        .unique();

    if (!expiredTask) {
        return { success: false, message: "过期任务不存在" };
    }

    // 移动到已完成表，标记为手动完成
    await ctx.db.insert("completed_tasks", {
        // ... 任务数据
        completionType: "manual",
        failureReason: "force_completed",
        rewardsClaimed: false,
        // ...
    });

    // 删除活跃任务
    await ctx.db.delete(expiredTask._id);

    return {
        success: true,
        message: "任务已强制完成"
    };
}
```

## 定期清理机制

### **清理长期过期任务**

```typescript
/**
 * 清理长期过期的任务 - 定期清理
 */
static async cleanupLongExpiredTasks(ctx: any, uid: string, daysThreshold: number = 30): Promise<{
    success: boolean;
    message: string;
    cleanedTasks?: string[];
}> {
    const now = getTorontoMidnight();
    const thresholdTime = now.localDate.getTime() - (daysThreshold * 24 * 60 * 60 * 1000);

    // 查找长期过期的任务
    const expiredTasks = await ctx.db.query("active_tasks")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .filter((q: any) => q.eq(q.field("status"), "expired"))
        .collect();

    for (const task of expiredTasks) {
        const expiredAt = new Date(task.expiredAt || task.updatedAt);
        if (expiredAt.getTime() < thresholdTime) {
            // 移动到已完成表
            await ctx.db.insert("completed_tasks", {
                // ... 任务数据
                completionType: "expired",
                failureReason: "long_expired_cleanup",
                // ...
            });

            await ctx.db.delete(task._id);
            cleanedTasks.push(task.taskId);
        }
    }

    return {
        success: true,
        message: `清理了 ${cleanedTasks.length} 个长期过期任务`,
        cleanedTasks
    };
}
```

## 统计和监控

### **过期任务统计**

```typescript
/**
 * 获取玩家过期任务统计
 */
static async getPlayerExpiredTasksStats(ctx: any, uid: string): Promise<{
    totalExpired: number;
    movedToCompleted: number;
    markedAsExpired: number;
    expiredTasks: ActiveTask[];
}> {
    const activeTasks = await this.getPlayerActiveTasks(ctx, uid);
    const expiredTasks = activeTasks.filter(task => task.status === "expired");
    
    const completedTasks = await this.getPlayerCompletedTasks(ctx, uid);
    const movedExpiredTasks = completedTasks.filter(task => task.completionType === "expired");

    return {
        totalExpired: expiredTasks.length + movedExpiredTasks.length,
        movedToCompleted: movedExpiredTasks.length,
        markedAsExpired: expiredTasks.length,
        expiredTasks
    };
}
```

## 实际应用场景

### **场景1：每日任务过期**

```
时间点：每日任务过期
├── 检查任务类型：daily
├── 检查进度：0/1
├── 决策：进度为0，移动到已完成表
├── 操作：insert into completed_tasks (completionType: "expired")
└── 结果：任务被清理，不给予奖励
```

### **场景2：成就任务过期**

```
时间点：成就任务过期
├── 检查任务类型：achievement
├── 检查进度：2/5
├── 决策：一次性任务，保留在活跃表
├── 操作：update active_tasks set status = "expired"
└── 结果：任务保留，玩家可以恢复
```

### **场景3：复杂任务过期**

```
时间点：多阶段任务过期
├── 检查任务类型：multi_stage
├── 检查进度：1/10 (10%)
├── 决策：进度低于20%，移动到已完成表
├── 操作：insert into completed_tasks (completionType: "expired")
└── 结果：任务被清理，不给予奖励
```

## 最佳实践

### **1. 使用混合策略**
```typescript
// 推荐使用混合策略
const result = await TaskSystem.handleExpiredTasks(ctx, uid, "hybrid");
```

### **2. 定期清理长期过期任务**
```typescript
// 每月清理30天前的过期任务
await TaskSystem.cleanupLongExpiredTasks(ctx, uid, 30);
```

### **3. 提供恢复机制**
```typescript
// 允许玩家恢复重要的过期任务
await TaskSystem.restoreExpiredTask(ctx, uid, taskId);
```

### **4. 监控过期任务统计**
```typescript
// 定期检查过期任务情况
const stats = await TaskSystem.getPlayerExpiredTasksStats(ctx, uid);
console.log(`玩家 ${uid} 有 ${stats.totalExpired} 个过期任务`);
```

## 总结

过期任务处理策略提供了：

1. **灵活性**：多种处理策略适应不同场景
2. **智能性**：根据任务类型和进度自动决策
3. **可恢复性**：允许玩家恢复重要任务
4. **可监控性**：提供详细的统计信息
5. **可维护性**：定期清理机制防止数据积累

这种设计既保证了系统的整洁性，又提供了良好的用户体验！ 