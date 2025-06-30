# 复杂任务系统设计文档

## 概述

复杂任务系统支持多种高级任务类型，包括多阶段任务、条件组合任务、时间相关任务等。系统采用处理器模式，每种任务类型都有专门的验证、进度更新和完成检查逻辑。

## 任务类型

### 1. 多阶段任务 (multi_stage)

多阶段任务要求玩家按顺序完成多个阶段，每个阶段都有独立的奖励。

#### 结构示例
```json
{
  "type": "multi_stage",
  "condition": {
    "stages": [
      { "action": "login", "count": 1, "reward": 10 },
      { "action": "complete_match", "count": 3, "reward": 50 },
      { "action": "win_match", "count": 1, "reward": 100 }
    ]
  },
  "reward": 200
}
```

#### 进度结构
```json
{
  "stages": [1, 2, 0],
  "currentStage": 1
}
```

#### 特点
- 按顺序完成阶段
- 每个阶段有独立奖励
- 支持阶段性奖励发放

### 2. 条件组合任务 (conditional)

支持 AND/OR 逻辑的条件组合任务。

#### AND 条件示例
```json
{
  "type": "conditional",
  "condition": {
    "type": "and",
    "subConditions": [
      { "action": "login", "count": 1 },
      { "action": "share_game", "count": 1 }
    ]
  }
}
```

#### OR 条件示例
```json
{
  "type": "conditional",
  "condition": {
    "type": "or",
    "subConditions": [
      { "action": "complete_match", "count": 5 },
      { "action": "share_game", "count": 1 }
    ]
  }
}
```

#### 进度结构
```json
{
  "sub_0": 1,
  "sub_1": 0
}
```

### 3. 时间相关任务 (time_based)

支持连续天数、时间窗口等时间相关的任务条件。

#### 连续登录示例
```json
{
  "type": "time_based",
  "condition": {
    "actions": [
      { "action": "login", "count": 7, "consecutive": true }
    ]
  }
}
```

#### 混合时间任务示例
```json
{
  "type": "time_based",
  "condition": {
    "actions": [
      { "action": "login", "count": 3, "consecutive": true },
      { "action": "complete_match", "count": 5, "within_days": 7 }
    ]
  }
}
```

#### 进度结构
```json
{
  "actions": [
    { "login": 2 },
    { "complete_match": 3 }
  ],
  "lastActionDate": "2024-01-15",
  "consecutiveDays": 2
}
```

## 处理器系统

### 处理器接口
```typescript
type TaskHandler = {
  validate: (task: Doc<"player_tasks">, event: any) => Promise<boolean>;
  updateProgress: (task: Doc<"player_tasks">, event: any) => any;
  isCompleted: (task: Doc<"player_tasks">, newProgress: any) => boolean;
  getReward?: (task: Doc<"player_tasks">, newProgress: any) => any;
};
```

### 注册的处理器
- `one_time`: 一次性任务
- `daily`: 每日任务
- `weekly`: 每周任务
- `season`: 赛季任务
- `complex`: 复杂条件任务
- `multi_stage`: 多阶段任务
- `time_based`: 时间相关任务
- `conditional`: 条件组合任务

## 事件处理流程

1. **事件验证**: 检查事件是否适用于任务
2. **进度更新**: 根据事件更新任务进度
3. **完成检查**: 检查任务是否完成
4. **奖励计算**: 计算阶段性奖励（如果支持）
5. **状态更新**: 更新任务状态和奖励

## 使用示例

### 创建多阶段任务
```typescript
const taskId = await db.insert("player_tasks", {
  playerId,
  type: "multi_stage",
  condition: {
    stages: [
      { action: "login", count: 1, reward: 10 },
      { action: "complete_match", count: 3, reward: 50 },
      { action: "win_match", count: 1, reward: 100 }
    ]
  },
  progress: { stages: [], currentStage: 0 },
  // ... 其他字段
});
```

### 处理事件
```typescript
const results = await processTaskEvents(ctx, {
  playerId,
  event: { action: "complete_match", actionData: { gameType: "ludo" } }
});
```

## 测试

使用 `testComplexTasks.ts` 中的测试函数验证各种任务类型：

- `testComplexTasks`: 测试各种复杂任务类型
- `testMultiStageProgress`: 测试多阶段任务进度
- `testTimeBasedTask`: 测试时间相关任务
- `testComplexConditionTask`: 测试复杂条件任务

## 扩展性

### 添加新的任务类型

1. 定义任务类型结构
2. 实现验证函数
3. 实现进度更新函数
4. 实现完成检查函数
5. 注册处理器

### 示例：添加成就任务
```typescript
// 1. 定义结构
const achievementTask = {
  type: "achievement",
  condition: {
    achievements: ["first_win", "perfect_game", "streak_5"]
  }
};

// 2. 实现处理器
const achievementHandler: TaskHandler = {
  validate: async (task, event) => {
    // 验证成就事件
  },
  updateProgress: (task, event) => {
    // 更新成就进度
  },
  isCompleted: (task, newProgress) => {
    // 检查是否完成所有成就
  }
};

// 3. 注册处理器
taskHandlers.achievement = achievementHandler;
```

## 最佳实践

1. **进度结构设计**: 使用清晰的数据结构存储进度
2. **事件验证**: 确保事件验证逻辑准确
3. **错误处理**: 在处理器中添加适当的错误处理
4. **性能优化**: 避免在处理器中进行复杂的数据库查询
5. **测试覆盖**: 为每种任务类型编写测试用例

## 注意事项

1. **进度初始化**: 确保新任务的进度结构正确初始化
2. **状态一致性**: 保持任务状态和进度的一致性
3. **奖励计算**: 正确处理阶段性奖励和最终奖励
4. **时间处理**: 注意时区和日期计算
5. **并发处理**: 考虑并发事件的处理 