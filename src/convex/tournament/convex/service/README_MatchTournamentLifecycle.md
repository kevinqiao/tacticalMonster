# Match 和 Tournament 生命周期关系

## 概述

`Match`（比赛）和 `Tournament`（锦标赛）是两个不同层次的概念，它们有着密切的生命周期关系。理解这种关系对于正确实现比赛系统至关重要。

## 概念层次

```
Tournament (锦标赛)
├── 包含多个 Match (比赛)
├── 管理整体规则和奖励
└── 控制整体生命周期

Match (比赛)
├── 属于特定 Tournament
├── 记录具体游戏过程
└── 管理单个游戏会话
```

## Tournament 生命周期

### 1. 状态定义
```typescript
tournament.status: "open" | "completed" | "cancelled"
```

### 2. 生命周期阶段

#### **创建阶段 (Creation)**
- **触发条件**: 玩家加入锦标赛
- **状态**: `"open"`
- **操作**: 
  - 创建锦标赛记录
  - 设置结束时间
  - 初始化参与者列表
  - 扣除入场费

#### **进行阶段 (Active)**
- **状态**: `"open"`
- **操作**:
  - 玩家可以提交分数
  - 创建比赛记录
  - 累积参与数据

#### **结算阶段 (Settlement)**
- **触发条件**: 
  - 时间到期
  - 所有玩家完成
  - 手动触发
- **状态**: `"completed"`
- **操作**:
  - 计算最终排名
  - 分配奖励
  - 更新玩家统计

## Match 生命周期

### 1. 状态定义
```typescript
match.status: "pending" | "in_progress" | "completed" | "cancelled"
```

### 2. 生命周期阶段

#### **创建阶段 (Creation)**
- **触发条件**: 玩家开始游戏
- **状态**: `"pending"`
- **操作**:
  - 创建比赛记录
  - 初始化玩家数据
  - 记录比赛事件

#### **进行阶段 (Active)**
- **状态**: `"in_progress"`
- **操作**:
  - 玩家进行游戏
  - 记录游戏事件
  - 更新游戏状态

#### **完成阶段 (Completion)**
- **触发条件**: 玩家完成游戏
- **状态**: `"completed"`
- **操作**:
  - 记录最终分数
  - 更新玩家排名
  - 处理道具扣除

## 关系映射

### 1. 一对多关系
```
Tournament (1) ←→ (N) Match
```

- 一个锦标赛可以包含多个比赛
- 每个比赛属于一个特定的锦标赛

### 2. 状态依赖关系

#### **Tournament 状态影响 Match**
```typescript
// 锦标赛状态检查
if (tournament.status !== "open") {
    throw new Error("锦标赛已结束，无法提交分数");
}
```

#### **Match 状态影响 Tournament**
```typescript
// 比赛完成触发锦标赛检查
if (allMatchesCompleted) {
    await tournament.settle();
}
```

### 3. 时间关系

#### **锦标赛时间窗口**
```typescript
tournament.endTime: string // 锦标赛结束时间
```

#### **比赛时间记录**
```typescript
match.startTime: string  // 比赛开始时间
match.endTime: string    // 比赛结束时间
```

## 实现模式

### 1. 单人锦标赛模式

```typescript
// 锦标赛创建
const tournament = await createTournament({
    gameType: "solitaire",
    tournamentType: "daily_special",
    duration: 24 * 60 * 60 * 1000 // 24小时
});

// 比赛创建（每次尝试）
const match = await MatchManager.createMatch({
    tournamentId: tournament._id,
    matchType: "single_player",
    maxPlayers: 1,
    minPlayers: 1
});

// 分数提交
await MatchManager.submitScore({
    matchId: match._id,
    score: 1500,
    gameData: { moves: 80, timeTaken: 200 }
});

// 锦标赛结算（比赛完成后立即）
await tournament.settle();
```

### 2. 多人锦标赛模式

```typescript
// 锦标赛创建
const tournament = await createTournament({
    gameType: "rummy",
    tournamentType: "weekly_championship",
    duration: 7 * 24 * 60 * 60 * 1000 // 7天
});

// 多个比赛并行进行
const match1 = await MatchManager.createMatch({
    tournamentId: tournament._id,
    matchType: "multi_player",
    maxPlayers: 4,
    minPlayers: 2
});

const match2 = await MatchManager.createMatch({
    tournamentId: tournament._id,
    matchType: "multi_player",
    maxPlayers: 4,
    minPlayers: 2
});

// 锦标赛结算（时间到期或所有比赛完成）
await tournament.settle();
```

## 事件流

### 1. 锦标赛事件
```typescript
// 锦标赛创建事件
await ctx.db.insert("match_events", {
    matchId: null,
    tournamentId: tournament._id,
    eventType: "tournament_created",
    eventData: { tournamentType, gameType }
});

// 锦标赛结算事件
await ctx.db.insert("match_events", {
    matchId: null,
    tournamentId: tournament._id,
    eventType: "tournament_settled",
    eventData: { finalRankings, rewards }
});
```

### 2. 比赛事件
```typescript
// 比赛创建事件
await ctx.db.insert("match_events", {
    matchId: match._id,
    tournamentId: tournament._id,
    eventType: "match_created",
    eventData: { matchType, maxPlayers }
});

// 玩家加入事件
await ctx.db.insert("match_events", {
    matchId: match._id,
    tournamentId: tournament._id,
    uid: player.uid,
    eventType: "player_join",
    eventData: { playerCount }
});

// 分数提交事件
await ctx.db.insert("match_events", {
    matchId: match._id,
    tournamentId: tournament._id,
    uid: player.uid,
    eventType: "score_submit",
    eventData: { score, propsUsed }
});
```

## 数据一致性

### 1. 状态同步
```typescript
// 确保比赛状态与锦标赛状态一致
async function validateMatchState(match: any, tournament: any) {
    if (tournament.status === "completed" && match.status !== "completed") {
        throw new Error("锦标赛已结束，比赛状态不一致");
    }
}
```

### 2. 数据完整性
```typescript
// 锦标赛结算时验证所有比赛
async function validateTournamentSettlement(tournamentId: string) {
    const matches = await getMatchesByTournament(tournamentId);
    const incompleteMatches = matches.filter(m => m.status !== "completed");
    
    if (incompleteMatches.length > 0) {
        throw new Error("存在未完成的比赛");
    }
}
```

## 最佳实践

### 1. 状态管理
- 使用明确的状态枚举
- 实现状态转换验证
- 记录状态变更事件

### 2. 错误处理
- 处理状态不一致情况
- 实现回滚机制
- 记录错误日志

### 3. 性能优化
- 使用索引优化查询
- 实现批量操作
- 缓存常用数据

### 4. 监控和调试
- 记录完整事件日志
- 实现状态检查工具
- 提供调试接口

## 总结

Match 和 Tournament 的生命周期关系是比赛系统的核心设计。通过清晰的状态定义、事件驱动架构和一致的数据管理，可以构建出稳定可靠的比赛系统。

关键要点：
1. **层次关系**: Tournament 包含 Match，Match 属于 Tournament
2. **状态依赖**: 两者状态相互影响，需要保持一致性
3. **事件驱动**: 通过事件记录完整的生命周期
4. **数据完整性**: 确保数据的一致性和完整性 