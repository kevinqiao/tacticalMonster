# 任务分配机制设计文档

## 概述

基于 Tournament 系统的 `getPlayerAttempts` 机制，我们设计了一套智能的任务分配系统，能够正确处理一次性任务和周期性任务的分配逻辑。

## 核心机制

### 1. 时间范围计算

参考 Tournament 的 `getPlayerAttempts` 方法，我们实现了 `getTaskStartTime` 方法：

```typescript
private static getTaskStartTime(taskType: string): string {
    const now = getTorontoMidnight();
    
    switch (taskType) {
        case "daily":
            return now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
        case "weekly":
            const weekStart = new Date(now.localDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return weekStart.toISOString();
        case "season":
            const seasonStart = new Date(now.localDate);
            seasonStart.setMonth(0, 1); // 1月1日
            seasonStart.setHours(0, 0, 0, 0);
            return seasonStart.toISOString();
        case "monthly":
            const monthStart = new Date(now.localDate);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            return monthStart.toISOString();
        default:
            return "1970-01-01T00:00:00.000Z"; // 一次性任务
    }
}
```

### 2. 智能分配检查

`shouldAllocateTask` 方法根据任务类型采用不同的检查策略：

#### 一次性任务 (one_time, achievement)
```typescript
// 检查是否已存在该模板的任务
const existingTask = await this.getPlayerTaskByTemplateId(ctx, uid, template.templateId);
if (existingTask) {
    return { shouldAllocate: false, reason: "一次性任务已存在" };
}
```

#### 周期性任务 (daily, weekly, season, monthly)
```typescript
// 检查当前周期内是否已存在该任务
const existsInCurrentPeriod = await this.checkTaskExistsInCurrentPeriod(ctx, uid, template.templateId, template.type);
if (existsInCurrentPeriod) {
    return { shouldAllocate: false, reason: `${template.type}任务在当前周期已存在` };
}
```

## 使用场景

### 场景1：每日登录任务

**任务配置：**
```json
{
    "templateId": "daily_login",
    "name": "每日登录",
    "type": "daily",
    "condition": {
        "type": "simple",
        "action": "login",
        "targetValue": 1
    }
}
```

**分配逻辑：**
1. 玩家首次登录：分配任务 ✅
2. 玩家再次登录（同一天）：跳过分配 ✅
3. 玩家第二天登录：分配新任务 ✅

### 场景2：一次性成就任务

**任务配置：**
```json
{
    "templateId": "first_win",
    "name": "首次胜利",
    "type": "one_time",
    "condition": {
        "type": "simple",
        "action": "win_match",
        "targetValue": 1
    }
}
```

**分配逻辑：**
1. 玩家首次登录：分配任务 ✅
2. 玩家再次登录：跳过分配（已存在） ✅
3. 玩家完成后再登录：跳过分配（已存在） ✅

### 场景3：每周任务

**任务配置：**
```json
{
    "templateId": "weekly_wins",
    "name": "每周获胜10局",
    "type": "weekly",
    "condition": {
        "type": "simple",
        "action": "win_match",
        "targetValue": 10
    }
}
```

**分配逻辑：**
1. 玩家本周首次登录：分配任务 ✅
2. 玩家本周再次登录：跳过分配 ✅
3. 下周玩家登录：分配新任务 ✅

## 优势

### 1. 避免重复分配
- 一次性任务永远不会重复分配
- 周期性任务在当前周期内不会重复分配

### 2. 自动周期管理
- 每日任务：每天自动重新分配
- 每周任务：每周自动重新分配
- 每月任务：每月自动重新分配
- 赛季任务：每个赛季自动重新分配

### 3. 性能优化
- 使用数据库索引进行高效查询
- 避免不必要的任务创建

### 4. 逻辑清晰
- 参考成熟的 Tournament 机制
- 代码逻辑易于理解和维护

## 数据库查询优化

### 索引设计
```typescript
// player_tasks 表索引
.index("by_uid", ["uid"])
.index("by_uid_templateId", ["uid", "templateId"])
.index("by_uid_type_createdAt", ["uid", "type", "createdAt"])
```

### 查询示例
```typescript
// 检查当前周期内的任务
const existingTasks = await ctx.db.query("player_tasks")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
    .filter((q: any) => q.eq(q.field("templateId"), templateId))
    .filter((q: any) => q.eq(q.field("type"), taskType))
    .filter((q: any) => q.gte(q.field("createdAt"), startTime))
    .collect();
```

## 总结

这个新的任务分配机制解决了之前的问题：

1. **一次性任务**：通过 `templateId` 检查是否已存在
2. **周期性任务**：通过时间范围检查当前周期是否已存在
3. **自动管理**：无需手动重置，系统自动处理周期切换
4. **性能优化**：使用高效的数据库查询和索引

这种设计确保了任务分配的正确性和效率，同时保持了代码的简洁性和可维护性。 