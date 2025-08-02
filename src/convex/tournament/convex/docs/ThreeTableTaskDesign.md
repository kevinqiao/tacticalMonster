# 三表任务设计

## 设计概述

基于用户建议的优化设计，将任务系统分为三个独立的表：

1. **player_tasks** - 只存储正在进行中的任务
2. **completed_tasks** - 存储成功完成的任务
3. **expired_tasks** - 存储过期未完成的任务

## 设计优势

### **1. 更清晰的数据分离**
```typescript
// 三表设计
player_tasks: {
    uid: string;
    taskId: string;
    templateId: string;
    // ... 任务配置
    progress: TaskProgress;
    dueTime?: string;
    createdAt: string;
    updatedAt: string;
}

completed_tasks: {
    uid: string;
    taskId: string;
    templateId: string;
    // ... 任务配置
    progress: TaskProgress;
    completedAt: string;
    rewardsClaimed: boolean;
    claimedAt?: string;
    createdAt: string;
}

expired_tasks: {
    uid: string;
    taskId: string;
    templateId: string;
    // ... 任务配置
    progress: TaskProgress;
    expiredAt: string;
    createdAt: string;
}
```

### **2. 简化的生命周期**
```
任务分配 → 任务进行中 → 任务完成 → 移动到completed_tasks
    ↓           ↓           ↓
player_tasks → player_tasks → completed_tasks

任务分配 → 任务进行中 → 任务过期 → 移动到expired_tasks
    ↓           ↓           ↓
player_tasks → player_tasks → expired_tasks
```

### **3. 直观的状态管理**
- **活跃状态**：在 `player_tasks` 中
- **完成状态**：在 `completed_tasks` 中
- **过期状态**：在 `expired_tasks` 中

## 核心方法实现

### **1. 新分配任务机制**
```typescript
/**
 * 新分配任务机制 - 基于三表设计
 */
static async allocateTasksForPlayerNew(ctx: any, uid: string): Promise<{ success: boolean; message: string; allocatedTasks?: string[] }> {
    const now = getTorontoMidnight();
    const allocatedTasks: string[] = [];

    // 获取所有活跃任务模板
    const templates = await this.getAllTaskTemplates(ctx);

    for (const template of templates) {
        // 检查分配规则
        if (!this.checkAllocationRules(template.allocationRules, player)) {
            continue;
        }

        // 检查是否已有活跃任务
        const existingActiveTask = await ctx.db.query("player_tasks")
            .withIndex("by_uid_templateId", (q: any) => q.eq("uid", uid).eq("templateId", template.templateId))
            .unique();

        if (existingActiveTask) {
            continue; // 已有活跃任务，不重复分配
        }

        // 检查是否已完成且在有效期内
        const isCompletedInValidPeriod = await this.isTemplateCompletedInValidPeriod(ctx, uid, template.templateId, template);
        if (isCompletedInValidPeriod) {
            continue; // 已完成且在有效期内，不重复分配
        }

        // 创建新活跃任务
        const taskId = `${uid}_${template.templateId}_${now.iso}`;
        const initialProgress = this.getInitialProgress(template.condition);
        const dueTime = this.calculateTaskDueTime(template.type, now);

        await ctx.db.insert("player_tasks", {
            uid,
            taskId,
            templateId: template.templateId,
            name: template.name,
            description: template.description,
            type: template.type,
            category: template.category,
            condition: template.condition,
            progress: initialProgress,
            dueTime: dueTime,
            rewards: template.rewards,
            version: template.version,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        allocatedTasks.push(taskId);
    }

    return {
        success: true,
        message: `成功分配 ${allocatedTasks.length} 个活跃任务`,
        allocatedTasks
    };
}
```

### **2. 完成任务**
```typescript
/**
 * 完成任务 - 从活跃任务移动到已完成任务
 */
static async completeTask(ctx: any, uid: string, taskId: string): Promise<{ success: boolean; message: string }> {
    const now = getTorontoMidnight();

    // 获取活跃任务
    const activeTask = await ctx.db.query("player_tasks")
        .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
        .unique();

    if (!activeTask) {
        return { success: false, message: "任务不存在或已完成" };
    }

    // 创建已完成任务记录
    await ctx.db.insert("completed_tasks", {
        uid: activeTask.uid,
        taskId: activeTask.taskId,
        templateId: activeTask.templateId,
        name: activeTask.name,
        description: activeTask.description,
        type: activeTask.type,
        category: activeTask.category,
        condition: activeTask.condition,
        progress: activeTask.progress,
        completedAt: now.iso,
        rewardsClaimed: false,
        rewards: activeTask.rewards,
        version: activeTask.version,
        createdAt: activeTask.createdAt
    });

    // 删除活跃任务
    await ctx.db.delete(activeTask._id);

    return {
        success: true,
        message: "任务完成，已移动到已完成任务表"
    };
}
```

### **3. 处理过期任务**
```typescript
/**
 * 处理过期任务 - 从活跃任务移动到过期任务表
 */
static async handleExpiredTasks(ctx: any, uid: string): Promise<{
    success: boolean;
    message: string;
    movedTasks?: string[];
    totalExpired?: number;
}> {
    const now = getTorontoMidnight();
    const movedTasks: string[] = [];
    let totalExpired = 0;

    // 获取所有活跃任务
    const activeTasks = await this.getPlayerActiveTasks(ctx, uid);

    for (const task of activeTasks) {
        if (!task.dueTime) continue; // 没有过期时间的任务跳过

        const taskDueTime = new Date(task.dueTime);
        const nowTime = now.localDate.getTime();
        const isExpired = nowTime > taskDueTime.getTime();

        if (isExpired) {
            totalExpired++;
            const activeTaskRecord = await ctx.db.query("player_tasks")
                .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                .unique();

            if (activeTaskRecord) {
                // 创建过期任务记录
                await ctx.db.insert("expired_tasks", {
                    uid: activeTaskRecord.uid,
                    taskId: activeTaskRecord.taskId,
                    templateId: activeTaskRecord.templateId,
                    name: activeTaskRecord.name,
                    description: activeTaskRecord.description,
                    type: activeTaskRecord.type,
                    category: activeTaskRecord.category,
                    condition: activeTaskRecord.condition,
                    progress: activeTaskRecord.progress,
                    expiredAt: now.iso,
                    rewards: activeTaskRecord.rewards,
                    version: activeTaskRecord.version,
                    createdAt: activeTaskRecord.createdAt
                });

                // 删除活跃任务
                await ctx.db.delete(activeTaskRecord._id);
                movedTasks.push(task.taskId);
            }
        }
    }

    return {
        success: true,
        message: `处理了 ${totalExpired} 个过期任务，移动了 ${movedTasks.length} 个到过期任务表`,
        movedTasks,
        totalExpired
    };
}
```

### **4. 恢复过期任务**
```typescript
/**
 * 恢复过期任务 - 从过期任务表移回活跃任务表
 */
static async restoreExpiredTask(ctx: any, uid: string, taskId: string): Promise<{ success: boolean; message: string }> {
    const now = getTorontoMidnight();

    // 查找过期任务
    const expiredTask = await ctx.db.query("expired_tasks")
        .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", taskId))
        .unique();

    if (!expiredTask) {
        return { success: false, message: "过期任务不存在" };
    }

    // 计算新的过期时间
    const newDueTime = this.calculateTaskDueTime(expiredTask.type, now);

    // 创建新的活跃任务
    await ctx.db.insert("player_tasks", {
        uid: expiredTask.uid,
        taskId: expiredTask.taskId,
        templateId: expiredTask.templateId,
        name: expiredTask.name,
        description: expiredTask.description,
        type: expiredTask.type,
        category: expiredTask.category,
        condition: expiredTask.condition,
        progress: expiredTask.progress,
        dueTime: newDueTime,
        rewards: expiredTask.rewards,
        version: expiredTask.version,
        createdAt: expiredTask.createdAt,
        updatedAt: now.iso
    });

    // 删除过期任务
    await ctx.db.delete(expiredTask._id);

    return {
        success: true,
        message: "任务已恢复，可以继续完成"
    };
}
```

### **5. 统一的任务管理流程**
```typescript
/**
 * 统一的任务管理流程
 */
static async managePlayerTasksNew(ctx: any, uid: string): Promise<{
    success: boolean;
    message: string;
    allocatedTasks?: string[];
    movedTasks?: string[];
    totalExpired?: number;
}> {
    const results = {
        allocatedTasks: [],
        movedTasks: [],
        totalExpired: 0
    };

    // 步骤1: 处理过期任务
    const expiredResult = await this.handleExpiredTasks(ctx, uid);
    if (expiredResult.success) {
        results.movedTasks = expiredResult.movedTasks || [];
        results.totalExpired = expiredResult.totalExpired || 0;
    }

    // 步骤2: 分配新任务
    const allocationResult = await this.allocateTasksForPlayerNew(ctx, uid);
    if (allocationResult.success) {
        results.allocatedTasks = allocationResult.allocatedTasks || [];
    }

    return {
        success: true,
        message: `任务管理完成，分配了 ${results.allocatedTasks.length} 个新任务，处理了 ${results.totalExpired} 个过期任务`,
        ...results
    };
}
```

## 实际应用场景

### **场景1：新玩家首次登录**
```
时间点1: 玩家登录
├── managePlayerTasksNew() 调用
├── 处理过期任务：无任务需要处理
├── 分配新任务：检查所有模板
├── 检查活跃任务：无
├── 检查已完成任务：无
└── 分配所有可用任务到 player_tasks

结果：玩家获得所有可用的活跃任务
```

### **场景2：现有玩家每日登录**
```
时间点1: 玩家登录
├── managePlayerTasksNew() 调用
├── 处理过期任务：检查 player_tasks 中的过期任务
├── 将过期任务移动到 expired_tasks
├── 分配新任务：检查所有模板
├── 检查活跃任务：跳过已有活跃任务
├── 检查已完成任务：跳过在有效期内的已完成任务
└── 分配新的可用任务

结果：清理过期任务，分配新任务
```

### **场景3：玩家完成任务**
```
时间点1: 玩家完成任务
├── completeTask() 调用
├── 从 player_tasks 获取任务
├── 创建记录到 completed_tasks
├── 删除 player_tasks 中的记录
└── 任务状态：rewardsClaimed = false

时间点2: 玩家领取奖励
├── claimTaskRewards() 调用
├── 更新 completed_tasks 中的 rewardsClaimed = true
└── 发放奖励
```

### **场景4：任务过期**
```
时间点1: 任务过期
├── handleExpiredTasks() 调用
├── 检查 player_tasks 中的过期任务
├── 创建记录到 expired_tasks
├── 删除 player_tasks 中的记录
└── 任务状态：保留在过期任务表中

时间点2: 玩家恢复过期任务
├── restoreExpiredTask() 调用
├── 从 expired_tasks 获取任务
├── 创建新记录到 player_tasks（新的过期时间）
├── 删除 expired_tasks 中的记录
└── 任务状态：重新变为活跃状态
```

## 优势总结

### **相比旧设计的优势**

1. **逻辑更简单**：
   - 去除复杂的重置机制
   - 简化的任务分配逻辑
   - 清晰的数据分离

2. **性能更优**：
   - 活跃任务表更小，查询更快
   - 已完成任务和过期任务可以独立优化
   - 减少复杂的条件判断

3. **数据更完整**：
   - 已完成任务永久保存
   - 过期任务有独立的历史记录
   - 更好的数据审计能力

4. **扩展性更好**：
   - 易于添加新的任务类型
   - 支持复杂的有效期规则
   - 灵活的任务分配策略

5. **维护性更强**：
   - 代码逻辑更清晰
   - 减少状态转换错误
   - 更容易调试和测试

## 总结

三表任务设计提供了：

1. **更清晰的数据分离**：活跃任务、已完成任务、过期任务独立管理
2. **更简单的生命周期**：任务在三个表之间移动，逻辑清晰
3. **更好的性能**：每个表都可以独立优化
4. **更完整的历史记录**：所有任务状态都有完整记录
5. **更好的用户体验**：支持过期任务恢复，提供更灵活的任务管理

这个设计比复杂的重置机制更加简洁、高效和可维护！ 