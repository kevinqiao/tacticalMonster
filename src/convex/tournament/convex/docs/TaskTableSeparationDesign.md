# 任务表分离设计

## 设计概述

通过分离活跃任务表和已完成任务表，简化任务生命周期管理，去除复杂的重置机制，通过新分配机制统一完成新任务。

## 设计优势

### **1. 逻辑简化**
```typescript
// 旧设计：复杂的重置逻辑
if (isExpired && !shouldProtectCompletedTask) {
    // 允许重置
} else if (isExpired && shouldProtectCompletedTask) {
    // 不重置，保护奖励
} else {
    // 不重置
}

// 新设计：简单的分配逻辑
const shouldAllocateNewTask = async (ctx, uid, template) => {
    // 1. 检查是否已有活跃任务
    const activeTask = await getActiveTaskByTemplate(ctx, uid, template.templateId);
    if (activeTask) return false;

    // 2. 检查是否已完成且在有效期内
    const isCompletedInValidPeriod = await isTemplateCompletedInValidPeriod(ctx, uid, template.templateId, template);
    if (isCompletedInValidPeriod) return false;

    // 3. 分配新任务
    return true;
};
```

### **2. 清晰的数据分离**
- **活跃任务表**：只存储进行中的任务
- **已完成任务表**：存储所有已完成的任务（包括已领取和未领取奖励的）
- **任务模板表**：存储任务配置

### **3. 简化的生命周期**
```
任务分配 → 任务进行中 → 任务完成 → 移动到已完成表
    ↓           ↓           ↓
active_tasks → active_tasks → completed_tasks
```

## 数据结构设计

### **活跃任务表 (active_tasks)**
```typescript
{
    uid: string;
    taskId: string;
    templateId: string;
    name: string;
    description: string;
    type: string;
    category: string;
    condition: TaskCondition;
    progress: TaskProgress;
    dueTime?: string; // 任务过期时间
    rewards: TaskRewards;
    version?: string;
    createdAt: string;
    updatedAt: string;
}
```

### **已完成任务表 (completed_tasks)**
```typescript
{
    uid: string;
    taskId: string;
    templateId: string;
    name: string;
    description: string;
    type: string;
    category: string;
    condition: TaskCondition;
    progress: TaskProgress; // 最终进度
    completedAt: string;
    rewardsClaimed: boolean;
    claimedAt?: string;
    rewards: TaskRewards;
    version?: string;
    createdAt: string;
}
```

## 核心方法实现

### **1. 新分配任务机制**
```typescript
/**
 * 新分配任务机制 - 基于分离的表结构
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
        const existingActiveTask = await ctx.db.query("active_tasks")
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

        await ctx.db.insert("active_tasks", {
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
    const activeTask = await ctx.db.query("active_tasks")
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

### **3. 清理过期任务**
```typescript
/**
 * 清理过期任务 - 从活跃任务移动到已完成任务（标记为失败）
 */
static async cleanupExpiredTasks(ctx: any, uid: string): Promise<{ success: boolean; message: string; cleanedTasks?: string[] }> {
    const now = getTorontoMidnight();
    const cleanedTasks: string[] = [];

    // 获取所有活跃任务
    const activeTasks = await this.getPlayerActiveTasks(ctx, uid);

    for (const task of activeTasks) {
        if (!task.dueTime) continue; // 没有过期时间的任务跳过

        const taskDueTime = new Date(task.dueTime);
        const nowTime = now.localDate.getTime();
        const isExpired = nowTime > taskDueTime.getTime();

        if (isExpired) {
            // 获取活跃任务记录
            const activeTaskRecord = await ctx.db.query("active_tasks")
                .withIndex("by_uid_taskId", (q: any) => q.eq("uid", uid).eq("taskId", task.taskId))
                .unique();

            if (activeTaskRecord) {
                // 创建已完成任务记录（标记为失败）
                await ctx.db.insert("completed_tasks", {
                    uid: task.uid,
                    taskId: task.taskId,
                    templateId: task.templateId,
                    name: task.name,
                    description: task.description,
                    type: task.type,
                    category: task.category,
                    condition: task.condition,
                    progress: task.progress,
                    completedAt: now.iso,
                    rewardsClaimed: false, // 过期任务不给予奖励
                    rewards: task.rewards,
                    version: task.version,
                    createdAt: task.createdAt
                });

                // 删除活跃任务
                await ctx.db.delete(activeTaskRecord._id);
                cleanedTasks.push(task.taskId);
            }
        }
    }

    return {
        success: true,
        message: `清理了 ${cleanedTasks.length} 个过期任务`,
        cleanedTasks
    };
}
```

### **4. 检查有效期内的已完成任务**
```typescript
/**
 * 检查模板任务是否已完成且在有效期内
 */
static async isTemplateCompletedInValidPeriod(ctx: any, uid: string, templateId: string, template: TaskTemplate): Promise<boolean> {
    const completedTasks = await ctx.db.query("completed_tasks")
        .withIndex("by_uid_templateId", (q: any) => q.eq("uid", uid).eq("templateId", templateId))
        .collect();

    if (completedTasks.length === 0) return false;

    // 检查是否有在有效期内的已完成任务
    const now = getTorontoMidnight();
    for (const task of completedTasks) {
        const completedAt = new Date(task.completedAt);
        const taskAge = now.localDate.getTime() - completedAt.getTime();
        const daysDiff = taskAge / (1000 * 60 * 60 * 24);

        // 根据任务类型判断是否在有效期内
        let isValidPeriod = false;
        switch (template.type) {
            case "daily":
                isValidPeriod = daysDiff < 1; // 1天内有效
                break;
            case "weekly":
                isValidPeriod = daysDiff < 7; // 7天内有效
                break;
            case "monthly":
                isValidPeriod = daysDiff < 30; // 30天内有效
                break;
            case "one_time":
            case "achievement":
            case "season":
                isValidPeriod = true; // 永久有效
                break;
            default:
                isValidPeriod = false;
        }

        if (isValidPeriod) return true;
    }

    return false;
}
```

## 任务生命周期管理

### **新的管理流程**

```typescript
/**
 * 简化的任务管理流程
 */
static async managePlayerTasksNew(ctx: any, uid: string): Promise<{
    success: boolean;
    message: string;
    allocatedTasks?: string[];
    cleanedTasks?: string[];
}> {
    const results = {
        allocatedTasks: [],
        cleanedTasks: []
    };

    // 步骤1: 清理过期任务
    const cleanupResult = await this.cleanupExpiredTasks(ctx, uid);
    if (cleanupResult.success) {
        results.cleanedTasks = cleanupResult.cleanedTasks || [];
    }

    // 步骤2: 分配新任务
    const allocationResult = await this.allocateTasksForPlayerNew(ctx, uid);
    if (allocationResult.success) {
        results.allocatedTasks = allocationResult.allocatedTasks || [];
    }

    return {
        success: true,
        message: `任务管理完成，分配了 ${results.allocatedTasks.length} 个新任务，清理了 ${results.cleanedTasks.length} 个过期任务`,
        ...results
    };
}
```

## 实际应用场景

### **场景1：新玩家首次登录**
```
时间点1: 玩家登录
├── managePlayerTasksNew() 调用
├── 清理过期任务：无任务需要清理
├── 分配新任务：检查所有模板
├── 检查活跃任务：无
├── 检查已完成任务：无
└── 分配所有可用任务到 active_tasks

结果：玩家获得所有可用的活跃任务
```

### **场景2：现有玩家每日登录**
```
时间点1: 玩家登录
├── managePlayerTasksNew() 调用
├── 清理过期任务：检查 active_tasks 中的过期任务
├── 将过期任务移动到 completed_tasks（标记为失败）
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
├── 从 active_tasks 获取任务
├── 创建记录到 completed_tasks
├── 删除 active_tasks 中的记录
└── 任务状态：rewardsClaimed = false

时间点2: 玩家领取奖励
├── claimTaskRewards() 调用
├── 更新 completed_tasks 中的 rewardsClaimed = true
└── 发放奖励

时间点3: 下次任务分配
├── 检查已完成任务：发现该模板已完成
├── 检查有效期：根据任务类型判断
└── 决定是否分配新任务
```

## 优势总结

### **相比旧设计的优势**

1. **逻辑简化**：
   - 去除复杂的重置机制
   - 简化的任务分配逻辑
   - 清晰的数据分离

2. **性能提升**：
   - 活跃任务表更小，查询更快
   - 已完成任务可以独立优化
   - 减少复杂的条件判断

3. **数据完整性**：
   - 已完成任务永久保存
   - 清晰的任务历史记录
   - 更好的数据审计能力

4. **扩展性**：
   - 易于添加新的任务类型
   - 支持复杂的有效期规则
   - 灵活的任务分配策略

5. **维护性**：
   - 代码逻辑更清晰
   - 减少状态转换错误
   - 更容易调试和测试

## 迁移策略

### **从旧设计迁移到新设计**

1. **数据迁移**：
   ```typescript
   // 迁移现有任务数据
   const migrateTasks = async (ctx, uid) => {
       // 获取现有任务
       const existingTasks = await getPlayerTasks(ctx, uid);
       
       for (const task of existingTasks) {
           if (task.isCompleted) {
               // 移动到已完成任务表
               await insertCompletedTask(ctx, task);
           } else {
               // 移动到活跃任务表
               await insertActiveTask(ctx, task);
           }
       }
   };
   ```

2. **API 兼容性**：
   ```typescript
   // 保持向后兼容的API
   export const getPlayerTasks = query({
       args: { uid: v.string() },
       handler: async (ctx, args) => {
           // 合并活跃任务和已完成任务
           const activeTasks = await TaskSystem.getPlayerActiveTasks(ctx, args.uid);
           const completedTasks = await TaskSystem.getPlayerCompletedTasks(ctx, args.uid);
           
           return [...activeTasks, ...completedTasks];
       },
   });
   ```

## 总结

任务表分离设计提供了：

1. **简化的逻辑**：去除复杂的重置机制
2. **清晰的数据分离**：活跃任务和已完成任务独立管理
3. **更好的性能**：更小的活跃任务表，更快的查询
4. **完整的历史记录**：已完成任务永久保存
5. **良好的扩展性**：易于添加新功能和优化

这个设计比复杂的重置机制更加简洁、高效和可维护！ 