# 任务系统类型修正总结

## 修正内容

### 1. 任务类型 (TaskType) 修正
**修正前**: 包含多种混合类型
```typescript
// 旧定义 (已移除)
type TaskType = "daily" | "weekly" | "monthly" | "one_time" | "achievement" | "season" | "multi_stage" | "conditional" | "time_based";
```

**修正后**: 只保留四种核心任务类型
```typescript
// 新定义
export type TaskType = "one_time" | "daily" | "weekly" | "seasonal";
```

### 2. 条件类型 (TaskConditionType) 修正
**修正前**: 条件类型与任务类型混淆
```typescript
// 旧定义 (已移除)
type TaskConditionType = "simple" | "multi_stage" | "conditional" | "time_based" | "achievement" | "season";
```

**修正后**: 只保留四种核心条件类型
```typescript
// 新定义
export type TaskConditionType = "simple" | "conditional" | "multi_stage" | "time_based";
```

## 类型定义说明

### 任务类型 (TaskType)
- **one_time**: 一次性任务，完成后永久有效
- **daily**: 每日任务，每天重置
- **weekly**: 每周任务，每周重置
- **seasonal**: 赛季任务，每个赛季重置

### 条件类型 (TaskConditionType)
- **simple**: 简单条件，单一目标值
- **conditional**: 条件任务，支持AND/OR逻辑组合
- **multi_stage**: 多阶段任务，按顺序完成多个阶段
- **time_based**: 时间任务，在指定时间窗口内完成

## 修正的文件

### 1. `data/taskTemplate.ts`
- 添加了明确的类型定义
- 更新了任务模板配置
- 移除了不存在的任务类型
- 添加了类型验证逻辑

### 2. `service/task/taskSystem.ts`
- 更新了 `isTemplateCompletedInValidPeriod` 方法
- 更新了 `calculateTaskDueTime` 方法
- 移除了对不存在任务类型的处理

### 3. 新增文档
- `docs/TaskSystemTypes.md`: 详细的类型定义文档
- `docs/TaskTypeCorrection.md`: 本修正总结文档

## 任务模板示例

### 每日任务示例
```typescript
{
    templateId: "daily_login",
    type: "daily",
    condition: {
        type: "simple",
        action: "login",
        targetValue: 2
    }
}
```

### 一次性多阶段任务示例
```typescript
{
    templateId: "tournament_champion",
    type: "one_time",
    condition: {
        type: "multi_stage",
        stages: [
            { action: "tournament_join", targetValue: 1 },
            { action: "win_match", targetValue: 3 }
        ]
    }
}
```

### 每周条件任务示例
```typescript
{
    templateId: "social_achiever",
    type: "weekly",
    condition: {
        type: "conditional",
        logic: "or",
        subConditions: [
            { action: "invite_friend", targetValue: 3 },
            { action: "share_game", targetValue: 5 }
        ]
    }
}
```

### 赛季时间任务示例
```typescript
{
    templateId: "weekly_challenge",
    type: "seasonal",
    condition: {
        type: "time_based",
        action: "complete_match",
        targetValue: 4,
        withinDays: 7
    }
}
```

## 验证结果

- ✅ TypeScript 编译通过
- ✅ 类型定义清晰明确
- ✅ 任务模板配置正确
- ✅ 系统逻辑一致性

## 后续建议

1. **类型安全**: 所有新添加的任务模板都应该使用这些明确的类型
2. **文档维护**: 保持类型定义文档的更新
3. **测试覆盖**: 为每种类型组合添加测试用例
4. **扩展性**: 如需添加新类型，请遵循现有的扩展模式 