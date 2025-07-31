# 任务系统完整设计总结

## 系统概述

任务系统是一个完整的游戏内任务管理平台，支持多种任务类型和奖励系统，旨在激励玩家参与游戏并提升用户留存率。

## 核心特性

### 🎯 任务类型支持
- **每日任务 (daily)**: 每日重置，如每日登录、连胜三局
- **每周任务 (weekly)**: 每周重置，如完成10局Solitaire游戏
- **一次性任务 (one_time)**: 永久性任务，如连续登录7天
- **成就任务 (achievement)**: 与成就系统关联的任务
- **赛季任务 (season)**: 与赛季系统关联的任务
- **多阶段任务 (multi_stage)**: 按顺序完成多个阶段的任务
- **条件组合任务 (conditional)**: 支持AND/OR逻辑的复杂任务
- **时间相关任务 (time_based)**: 支持连续天数、时间窗口的任务

### 🏆 奖励系统
- **金币 (coins)**: 游戏内货币，用于购买道具和门票
- **道具 (props)**: 游戏道具，按游戏类型分类（Ludo、Solitaire等）
- **门票 (tickets)**: 锦标赛门票，用于参与各种锦标赛
- **赛季点 (seasonPoints)**: 赛季积分，影响段位晋升
- **游戏积分 (gamePoints)**: 分为通用积分和特定游戏积分

### 🎮 游戏类型支持
- **Ludo**: 多人对战游戏
- **Solitaire**: 单人纸牌游戏
- **Rummy**: 策略配对游戏
- **扩展性**: 支持添加新游戏类型

## 系统架构

### 数据库设计

```typescript
// 任务模板表
task_templates: {
    templateId: string,
    name: string,
    description: string,
    type: string, // daily, weekly, one_time, etc.
    category: string, // gameplay, social, collection, challenge, tournament
    gameType?: string, // 特定游戏类型
    condition: TaskCondition, // 任务条件
    rewards: TaskRewards, // 奖励配置
    resetInterval?: string, // 重置间隔
    maxCompletions?: number, // 最大完成次数
    isActive: boolean,
    allocationRules?: TaskAllocationRules, // 分配规则
    validFrom?: string, // 有效期开始
    validUntil?: string, // 有效期结束
}

// 玩家任务表
player_tasks: {
    uid: string,
    taskId: string,
    templateId: string,
    name: string,
    description: string,
    type: string,
    category: string,
    condition: TaskCondition,
    progress: TaskProgress, // 进度数据
    isCompleted: boolean,
    completedAt?: string,
    rewardsClaimed: boolean,
    claimedAt?: string,
    completions: number, // 完成次数
    lastReset?: string,
    rewards: TaskRewards,
}

// 任务事件表
task_events: {
    uid: string,
    action: string, // login, complete_match, win_match, etc.
    actionData: any, // 事件相关数据
    gameType?: string,
    tournamentId?: string,
    matchId?: string,
    processed: boolean,
}

// 任务进度日志表
task_progress_logs: {
    uid: string,
    taskId: string,
    oldProgress: number,
    newProgress: number,
    increment: number,
    source: string, // tournament, gameplay, purchase
    context: {
        tournamentId?: string,
        matchId?: string,
        gameType?: string,
    },
}
```

### 核心组件

#### 1. TaskSystem (任务系统核心)
- 任务模板管理
- 玩家任务管理
- 任务分配和创建
- 任务进度更新
- 任务奖励领取
- 任务重置
- 任务统计和分析

#### 2. TaskIntegration (任务系统集成)
- 与道具系统集成
- 与门票系统集成
- 与赛季系统集成
- 与积分系统集成
- 综合奖励发放
- 事件监听器
- 定时任务

#### 3. API接口 (tasks.ts)
- 查询接口：获取任务、统计等
- 修改接口：分配任务、处理事件、领取奖励等
- 事件处理：常用事件处理函数
- 批量操作：批量领取奖励、分配任务等
- 管理接口：创建、更新、删除任务模板

## 任务类型详解

### 1. 简单任务 (simple)
最基本的任务类型，只需要完成一个动作达到目标次数。

```typescript
{
    type: "simple",
    action: "login",
    targetValue: 1
}
```

### 2. 多阶段任务 (multi_stage)
按顺序完成多个阶段，每个阶段都有独立奖励。

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

### 3. 条件组合任务 (conditional)
支持AND/OR逻辑的条件组合。

```typescript
{
    type: "conditional",
    logic: "or", // or "and"
    subConditions: [
        { action: "invite_friend", targetValue: 3 },
        { action: "share_game", targetValue: 5 }
    ]
}
```

### 4. 时间相关任务 (time_based)
支持连续天数、时间窗口等时间相关的任务条件。

```typescript
{
    type: "time_based",
    action: "login",
    targetValue: 7,
    consecutive: true // 连续登录
}
```

## 奖励系统设计

### 奖励类型

#### 1. 金币奖励
```typescript
{
    coins: 100,
    props: [],
    tickets: [],
    seasonPoints: 0,
    gamePoints: { general: 0 }
}
```

#### 2. 道具奖励
```typescript
{
    coins: 50,
    props: [
        {
            gameType: "ludo",
            propType: "dice_boost",
            quantity: 2
        }
    ],
    tickets: [],
    seasonPoints: 10,
    gamePoints: { general: 20 }
}
```

#### 3. 门票奖励
```typescript
{
    coins: 75,
    props: [],
    tickets: [
        {
            gameType: "ludo",
            tournamentType: "daily",
            quantity: 1
        }
    ],
    seasonPoints: 15,
    gamePoints: { general: 30 }
}
```

#### 4. 综合奖励
```typescript
{
    coins: 200,
    props: [
        {
            gameType: "ludo",
            propType: "golden_dice",
            quantity: 1
        }
    ],
    tickets: [
        {
            gameType: "ludo",
            tournamentType: "elite",
            quantity: 1
        }
    ],
    seasonPoints: 50,
    gamePoints: {
        general: 100,
        specific: {
            gameType: "ludo",
            points: 50
        }
    }
}
```

## 分配规则系统

### 段位限制
```typescript
{
    allocationRules: {
        segmentName: ["bronze", "silver"] // 只分配给青铜和白银段位玩家
    }
}
```

### 订阅要求
```typescript
{
    allocationRules: {
        subscriptionRequired: true // 只分配给订阅用户
    }
}
```

### 游戏偏好匹配
```typescript
{
    allocationRules: {
        gamePreferences: ["solitaire"] // 优先分配给偏好Solitaire的玩家
    }
}
```

## 事件处理系统

### 常用事件类型
- **login**: 登录事件
- **complete_match**: 完成游戏事件
- **win_match**: 游戏胜利事件
- **use_prop**: 使用道具事件
- **tournament_join**: 参与锦标赛事件
- **invite_friend**: 邀请好友事件
- **share_game**: 分享游戏事件
- **unlock_achievement**: 解锁成就事件

### 事件处理流程
1. **事件记录**: 将事件记录到task_events表
2. **任务匹配**: 查找适用于该事件的任务
3. **进度更新**: 更新任务进度
4. **完成检查**: 检查任务是否完成
5. **奖励发放**: 如果完成，发放奖励

## 系统集成

### 与道具系统集成
- 处理道具使用事件
- 发放道具奖励
- 记录道具交易

### 与门票系统集成
- 处理锦标赛参与事件
- 发放门票奖励
- 记录门票交易

### 与赛季系统集成
- 处理段位变更事件
- 发放赛季点奖励
- 记录赛季点交易

### 与积分系统集成
- 发放游戏积分奖励
- 记录积分交易
- 支持通用积分和特定游戏积分

## 定时任务

### 每日任务重置
- 重置所有每日任务
- 为所有玩家分配新的每日任务

### 每周任务重置
- 重置所有每周任务
- 为所有玩家分配新的每周任务

### 新玩家任务分配
- 为新玩家自动分配任务
- 确保所有玩家都有任务可做

## 监控和维护

### 数据验证
- 验证任务系统数据完整性
- 检查孤立任务（模板不存在）
- 监控任务完成率

### 性能优化
- 批量处理事件
- 索引优化
- 缓存策略

### 用户反馈
- 根据玩家反馈调整任务设计
- 监控任务完成率
- 优化奖励分配

## 最佳实践

### 任务设计原则
1. **平衡性**: 确保任务难度与奖励价值匹配
2. **多样性**: 提供不同类型的任务以满足不同玩家需求
3. **可完成性**: 确保任务在合理时间内可以完成
4. **激励性**: 提供有意义的奖励来激励玩家参与

### 奖励设计原则
1. **多样性**: 提供多种类型的奖励
2. **价值感**: 确保奖励对玩家有价值
3. **稀缺性**: 某些奖励应该具有稀缺性以增加价值
4. **平衡性**: 确保不同奖励类型之间的平衡

### 系统维护原则
1. **定期检查**: 定期验证任务系统数据完整性
2. **性能监控**: 监控任务处理性能
3. **用户反馈**: 根据玩家反馈调整任务设计
4. **数据备份**: 定期备份重要数据

## 扩展性

### 新任务类型
系统设计支持轻松添加新的任务类型，只需要：
1. 定义新的任务类型
2. 实现相应的进度更新逻辑
3. 添加完成检查逻辑

### 新奖励类型
系统支持添加新的奖励类型，只需要：
1. 在TaskRewards接口中添加新字段
2. 实现相应的奖励发放逻辑
3. 更新奖励发放函数

### 新游戏类型
系统支持添加新的游戏类型，只需要：
1. 在相关接口中添加新游戏类型
2. 创建针对新游戏的任务模板
3. 实现相应的游戏事件处理

## 总结

这个任务系统提供了完整的游戏内任务管理功能，具有以下优势：

1. **功能完整**: 支持多种任务类型和奖励系统
2. **高度可扩展**: 易于添加新功能和新游戏类型
3. **性能优化**: 支持批量处理和高效查询
4. **用户友好**: 提供丰富的API接口和文档
5. **系统集成**: 与其他游戏系统深度集成
6. **监控完善**: 提供完整的监控和维护工具

通过这个任务系统，可以有效激励玩家参与游戏，提升用户留存率，并为游戏运营提供强大的数据支持。 