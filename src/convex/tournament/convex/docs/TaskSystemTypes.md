# 任务系统类型定义文档

## 概述

任务系统采用清晰的两层类型定义：
- **任务类型 (TaskType)**: 定义任务的重复性和重置周期
- **条件类型 (TaskConditionType)**: 定义任务的完成条件和逻辑

## 任务类型 (TaskType)

### 1. one_time - 一次性任务
- **特点**: 完成后永久有效，不能重复完成
- **重置**: 永不重置
- **适用场景**: 成就、里程碑、特殊事件
- **示例**: 首次登录、达到特定段位、完成特定挑战

### 2. daily - 每日任务
- **特点**: 每天重置，可重复完成
- **重置**: 每日00:00重置
- **适用场景**: 日常活动、每日登录、每日游戏
- **示例**: 每日登录、每日完成3局游戏

### 3. weekly - 每周任务
- **特点**: 每周重置，可重复完成
- **重置**: 每周一00:00重置
- **适用场景**: 周常活动、每周挑战
- **示例**: 一周内完成10局游戏、参加3次锦标赛

### 4. seasonal - 赛季任务
- **特点**: 每个赛季重置，可重复完成
- **重置**: 赛季结束时重置
- **适用场景**: 赛季活动、赛季挑战
- **示例**: 赛季内达到黄金段位、赛季内完成特定成就

## 条件类型 (TaskConditionType)

### 1. simple - 简单条件
- **特点**: 单一目标值，简单计数
- **结构**:
```typescript
{
    type: "simple",
    action: "login",
    targetValue: 5
}
```
- **适用场景**: 登录次数、游戏局数、胜利次数

### 2. conditional - 条件任务
- **特点**: 支持AND/OR逻辑组合多个子条件
- **结构**:
```typescript
{
    type: "conditional",
    logic: "or", // "and" | "or"
    subConditions: [
        {
            type: "simple",
            action: "invite_friend",
            targetValue: 3
        },
        {
            type: "simple", 
            action: "share_game",
            targetValue: 5
        }
    ]
}
```
- **适用场景**: 社交任务、多选一任务

### 3. multi_stage - 多阶段任务
- **特点**: 按顺序完成多个阶段，每个阶段有独立奖励
- **结构**:
```typescript
{
    type: "multi_stage",
    stages: [
        {
            action: "tournament_join",
            targetValue: 1,
            reward: { coins: 50, seasonPoints: 10 }
        },
        {
            action: "win_match",
            targetValue: 3,
            reward: { coins: 100, seasonPoints: 20 }
        }
    ]
}
```
- **适用场景**: 锦标赛挑战、进阶任务

### 4. time_based - 时间任务
- **特点**: 在指定时间窗口内完成目标
- **结构**:
```typescript
{
    type: "time_based",
    action: "complete_match",
    targetValue: 4,
    withinDays: 7
}
```
- **适用场景**: 限时挑战、时间窗口任务

## 类型组合示例

### 示例1: 每日简单任务
```typescript
{
    templateId: "daily_login",
    type: "daily",           // 每日重置
    condition: {
        type: "simple",      // 简单计数
        action: "login",
        targetValue: 2
    }
}
```

### 示例2: 一次性多阶段任务
```typescript
{
    templateId: "tournament_champion",
    type: "one_time",        // 一次性完成
    condition: {
        type: "multi_stage", // 多阶段
        stages: [
            { action: "tournament_join", targetValue: 1 },
            { action: "win_match", targetValue: 3 }
        ]
    }
}
```

### 示例3: 每周条件任务
```typescript
{
    templateId: "social_achiever",
    type: "weekly",          // 每周重置
    condition: {
        type: "conditional", // 条件组合
        logic: "or",
        subConditions: [
            { action: "invite_friend", targetValue: 3 },
            { action: "share_game", targetValue: 5 }
        ]
    }
}
```

### 示例4: 赛季时间任务
```typescript
{
    templateId: "weekly_challenge",
    type: "seasonal",        // 赛季重置
    condition: {
        type: "time_based",  // 时间窗口
        action: "complete_match",
        targetValue: 4,
        withinDays: 7
    }
}
```

## 验证规则

### 任务类型验证
- 只允许: `"one_time" | "daily" | "weekly" | "seasonal"`
- 其他类型将被拒绝

### 条件类型验证
- 只允许: `"simple" | "conditional" | "multi_stage" | "time_based"`
- 其他类型将被拒绝

### 组合验证
- `simple` 条件必须包含 `action` 和 `targetValue`
- `conditional` 条件必须包含 `logic` 和 `subConditions`
- `multi_stage` 条件必须包含 `stages` 数组
- `time_based` 条件必须包含 `withinDays`

## 扩展性

### 添加新的任务类型
1. 在 `TaskType` 中添加新类型
2. 在 `isTemplateCompletedInValidPeriod` 中添加处理逻辑
3. 在 `calculateTaskDueTime` 中添加过期时间计算

### 添加新的条件类型
1. 在 `TaskConditionType` 中添加新类型
2. 在 `updateTaskProgress` 中添加进度更新逻辑
3. 在 `checkTaskCompletion` 中添加完成检查逻辑 