# 任务系统测试指南

## 概述

本指南介绍如何使用测试函数来验证不同任务类型的功能。测试文件包含以下任务类型的完整测试：

- **One-time 任务**: 一次性完成的任务
- **Daily 任务**: 每日重置的任务
- **Weekly 任务**: 每周重置的任务
- **Season 任务**: 赛季相关的任务
- **Complex 任务**: 复杂逻辑的任务
- **Time-based 任务**: 时间相关的任务

## 测试函数列表

### 1. One-time 任务测试

#### 可用任务类型
- `first_win`: 首次胜利
- `complete_tutorial`: 完成教程
- `share_game`: 分享游戏

#### 使用示例
```typescript
// 创建首次胜利任务
await testOneTimeTasks({
  playerId: "player123",
  taskType: "first_win"
});

// 创建任务并触发事件
await testOneTimeTasks({
  playerId: "player123",
  taskType: "first_win",
  event: {
    action: "win_match",
    actionData: { gameType: "ludo", score: 1000 }
  }
});
```

### 2. Daily 任务测试

#### 可用任务类型
- `daily_login`: 每日登录
- `daily_match`: 每日对战
- `daily_win`: 每日胜利

#### 使用示例
```typescript
// 创建每日登录任务
await testDailyTasks({
  playerId: "player123",
  taskType: "daily_login"
});

// 创建任务并触发登录事件
await testDailyTasks({
  playerId: "player123",
  taskType: "daily_login",
  event: {
    action: "login",
    actionData: {}
  }
});
```

### 3. Weekly 任务测试

#### 可用任务类型
- `weekly_login`: 每周登录
- `weekly_matches`: 每周对战
- `weekly_wins`: 每周胜利

#### 使用示例
```typescript
// 创建每周对战任务
await testWeeklyTasks({
  playerId: "player123",
  taskType: "weekly_matches"
});

// 创建任务并触发对战事件
await testWeeklyTasks({
  playerId: "player123",
  taskType: "weekly_matches",
  event: {
    action: "complete_match",
    actionData: { gameType: "ludo" }
  }
});
```

### 4. Season 任务测试

#### 可用任务类型
- `season_points`: 赛季积分
- `season_master`: 赛季大师

#### 使用示例
```typescript
// 创建赛季积分任务
await testSeasonTasks({
  playerId: "player123",
  taskType: "season_points"
});

// 创建任务并触发积分事件
await testSeasonTasks({
  playerId: "player123",
  taskType: "season_points",
  event: {
    action: "earn_season_points",
    actionData: { points: 100 }
  }
});
```

### 5. Complex 任务测试

#### 可用任务类型
- `complex_login_match`: 登录对战任务
- `complex_share_win`: 分享胜利任务
- `multi_stage_login`: 多阶段登录任务

#### 使用示例
```typescript
// 创建复杂任务
await testComplexTasks({
  playerId: "player123",
  taskType: "complex_login_match"
});

// 创建任务并触发事件
await testComplexTasks({
  playerId: "player123",
  taskType: "complex_login_match",
  event: {
    action: "login",
    actionData: {}
  }
});
```

### 6. Time-based 任务测试

#### 可用任务类型
- `consecutive_login`: 连续登录挑战
- `consecutive_match`: 连续对战大师
- `mixed_time_task`: 混合挑战
- `time_window_task`: 时间窗口挑战
- `complex_time_task`: 复杂时间挑战

#### 使用示例
```typescript
// 创建连续登录任务
await testTimeBasedTask({
  playerId: "player123",
  taskType: "consecutive_login"
});

// 创建任务并触发登录事件
await testTimeBasedTask({
  playerId: "player123",
  taskType: "consecutive_login",
  event: {
    action: "login",
    actionData: {}
  }
});
```

## 批量测试函数

### 1. 获取所有任务模板
```typescript
const templates = await getAllTaskTemplates();
console.log("Available templates:", templates);
```

### 2. 批量创建所有类型任务
```typescript
const results = await createAllTaskTypes({
  playerId: "player123"
});
console.log("Created tasks:", results);
```

### 3. 批量创建时间相关任务
```typescript
const results = await createMultipleTimeBasedTasks({
  playerId: "player123"
});
console.log("Created time-based tasks:", results);
```

## 场景测试函数

### 1. 连续登录场景测试
```typescript
const result = await testConsecutiveLoginScenario({
  playerId: "player123"
});
console.log("Consecutive login test:", result);
```

### 2. 混合时间任务场景测试
```typescript
const result = await testMixedTimeTaskScenario({
  playerId: "player123"
});
console.log("Mixed time task test:", result);
```

### 3. 时间窗口场景测试
```typescript
const result = await testTimeWindowScenario({
  playerId: "player123"
});
console.log("Time window test:", result);
```

## 任务模板数据结构

### One-time 任务模板
```json
{
  "title": "首次胜利",
  "description": "赢得第一场对战",
  "type": "one_time",
  "condition": {
    "action": "win_match",
    "count": 1,
    "gameType": undefined,
    "minScore": undefined
  },
  "rewards": {
    "coins": 100,
    "props": [],
    "tickets": [],
    "gamePoints": 20
  },
  "isDynamic": false
}
```

### Daily 任务模板
```json
{
  "title": "每日登录",
  "description": "每日登录游戏",
  "type": "daily",
  "condition": {
    "action": "login",
    "count": 1,
    "gameType": undefined,
    "minScore": undefined
  },
  "rewards": {
    "coins": 25,
    "props": [],
    "tickets": [],
    "gamePoints": 5
  },
  "isDynamic": true
}
```

### Weekly 任务模板
```json
{
  "title": "每周登录",
  "description": "连续7天登录",
  "type": "weekly",
  "condition": {
    "action": "login",
    "count": 7,
    "gameType": undefined,
    "minScore": undefined
  },
  "rewards": {
    "coins": 200,
    "props": [],
    "tickets": [],
    "gamePoints": 40
  },
  "isDynamic": true
}
```

### Season 任务模板
```json
{
  "title": "赛季积分",
  "description": "累计获得1000赛季积分",
  "type": "season",
  "condition": {
    "action": "earn_season_points",
    "count": 1000,
    "gameType": undefined,
    "minScore": undefined
  },
  "rewards": {
    "coins": 1000,
    "props": [],
    "tickets": [],
    "gamePoints": 200
  },
  "isDynamic": true
}
```

### Complex 任务模板
```json
{
  "title": "登录对战任务",
  "description": "登录并完成对战",
  "type": "complex",
  "condition": {
    "action": "login",
    "count": 1,
    "gameType": undefined,
    "minScore": undefined
  },
  "rewards": {
    "coins": 150,
    "props": [],
    "tickets": [],
    "gamePoints": 30
  },
  "isDynamic": false
}
```

### Time-based 任务模板
```json
{
  "title": "连续登录挑战",
  "description": "连续7天登录游戏",
  "type": "time_based",
  "condition": {
    "action": "login",
    "count": 7,
    "gameType": undefined,
    "minScore": undefined
  },
  "rewards": {
    "coins": 300,
    "props": [],
    "tickets": [],
    "gamePoints": 50
  },
  "isDynamic": true
}
```

## 事件数据结构

### 登录事件
```json
{
  "action": "login",
  "actionData": {}
}
```

### 对战事件
```json
{
  "action": "complete_match",
  "actionData": {
    "gameType": "ludo",
    "score": 1000
  }
}
```

### 胜利事件
```json
{
  "action": "win_match",
  "actionData": {
    "gameType": "ludo",
    "score": 1500
  }
}
```

### 分享事件
```json
{
  "action": "share_game",
  "actionData": {
    "platform": "facebook"
  }
}
```

### 教程完成事件
```json
{
  "action": "complete_tutorial",
  "actionData": {
    "tutorialType": "basic"
  }
}
```

### 赛季积分事件
```json
{
  "action": "earn_season_points",
  "actionData": {
    "points": 100,
    "source": "match_win"
  }
}
```

## 测试流程建议

### 1. 基础功能测试
1. 创建各种类型的任务
2. 验证任务数据结构
3. 检查任务是否正确保存到数据库

### 2. 事件处理测试
1. 创建任务
2. 触发相关事件
3. 验证任务进度更新
4. 检查任务完成状态

### 3. 奖励发放测试
1. 完成任务
2. 验证奖励是否正确计算
3. 检查玩家库存更新

### 4. 重置机制测试
1. 创建每日/每周任务
2. 等待重置时间
3. 验证任务是否正确重置

### 5. 复杂场景测试
1. 使用场景测试函数
2. 模拟真实游戏流程
3. 验证系统稳定性

## 故障排除

### 常见问题

1. **任务创建失败**
   - 检查玩家ID是否存在
   - 验证任务模板数据格式
   - 确认数据库连接正常

2. **事件处理失败**
   - 检查事件数据结构
   - 验证任务条件匹配
   - 确认事件处理器正常运行

3. **进度更新异常**
   - 检查任务类型处理器
   - 验证进度计算逻辑
   - 确认数据库更新操作

4. **奖励发放失败**
   - 检查奖励数据结构
   - 验证库存更新逻辑
   - 确认事务处理正常

### 调试技巧

1. **查看控制台日志**
   - 任务创建日志
   - 事件处理日志
   - 错误信息

2. **检查数据库状态**
   - 查询任务记录
   - 检查事件记录
   - 验证进度数据

3. **使用测试函数**
   - 逐步测试各个组件
   - 验证数据流转
   - 确认功能正确性

## 扩展测试

### 自定义任务模板
```typescript
const customTemplate = {
  title: "自定义任务",
  description: "自定义任务描述",
  type: "daily",
  condition: {
    action: "custom_action",
    count: 5,
    gameType: "ludo",
    minScore: 1000
  },
  rewards: {
    coins: 500,
    props: [],
    tickets: [],
    gamePoints: 100
  },
  isDynamic: true
};
```

### 自定义事件
```typescript
const customEvent = {
  action: "custom_action",
  actionData: {
    gameType: "ludo",
    score: 1500,
    customField: "customValue"
  }
};
```

通过这个测试指南，你可以全面测试任务系统的各种功能，确保系统的稳定性和正确性。 