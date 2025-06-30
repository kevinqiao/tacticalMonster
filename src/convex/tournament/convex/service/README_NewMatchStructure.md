# 新的比赛表结构设计

## 概述

为了优化数据组织和查询效率，我们将原来的单一 `matches` 表拆分为三个相关表：

1. **`matches`** - 比赛基础信息表
2. **`player_matches`** - 玩家比赛记录表  
3. **`match_events`** - 比赛事件日志表

## 表结构设计

### 1. matches 表（比赛基础信息）

```typescript
matches: defineTable({
    tournamentId: v.id("tournaments"),
    gameType: v.string(),
    matchType: v.string(), // "single_player", "multi_player", "team"
    status: v.string(), // "pending", "in_progress", "completed", "cancelled"
    maxPlayers: v.number(),
    minPlayers: v.number(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    gameData: v.any(), // 游戏通用数据，如规则配置
    createdAt: v.string(),
    updatedAt: v.string(),
})
```

**用途：**
- 存储比赛的核心信息和状态
- 管理比赛的生命周期
- 支持多种比赛类型（单人、多人、团队）

### 2. player_matches 表（玩家比赛记录）

```typescript
player_matches: defineTable({
    matchId: v.id("matches"),
    tournamentId: v.id("tournaments"),
    uid: v.string(),
    gameType: v.string(),
    score: v.number(),
    rank: v.optional(v.number()),
    completed: v.boolean(),
    attemptNumber: v.number(),
    propsUsed: v.array(v.string()),
    playerGameData: v.any(), // 玩家特定的游戏数据
    joinTime: v.string(),
    leaveTime: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
})
```

**用途：**
- 记录每个玩家在比赛中的表现
- 支持多次尝试和排名计算
- 存储玩家特定的游戏数据

### 3. match_events 表（比赛事件日志）

```typescript
match_events: defineTable({
    matchId: v.id("matches"),
    tournamentId: v.id("tournaments"),
    uid: v.optional(v.string()),
    eventType: v.string(), // "player_join", "score_submit", "match_start", "match_end"
    eventData: v.any(),
    timestamp: v.string(),
    createdAt: v.string(),
})
```

**用途：**
- 记录比赛过程中的重要事件
- 支持审计和调试
- 提供完整的时间线追踪

## 优势

### 1. 数据分离
- **关注点分离**：比赛信息、玩家表现、事件日志分别存储
- **减少冗余**：避免在多个记录中重复存储相同信息
- **提高一致性**：单一数据源，减少数据不一致的风险

### 2. 查询效率
- **索引优化**：为不同查询模式提供专门的索引
- **减少连接**：通过合理的表结构减少复杂的表连接
- **分页友好**：支持高效的分页查询

### 3. 扩展性
- **支持多种比赛类型**：单人、多人、团队比赛
- **灵活的事件系统**：可以轻松添加新的事件类型
- **历史追踪**：完整保留比赛历史记录

### 4. 维护性
- **清晰的职责**：每个表有明确的职责
- **易于调试**：事件日志提供完整的操作追踪
- **版本兼容**：支持未来的功能扩展

## 使用示例

### 创建比赛
```typescript
const matchId = await MatchManager.createMatch(ctx, {
    tournamentId: "tournament_123",
    gameType: "solitaire",
    matchType: "single_player",
    maxPlayers: 1,
    minPlayers: 1,
    gameData: { rules: "standard" }
});
```

### 玩家加入比赛
```typescript
const playerMatchId = await MatchManager.joinMatch(ctx, {
    matchId: "match_456",
    tournamentId: "tournament_123",
    uid: "user_789",
    gameType: "solitaire"
});
```

### 提交分数
```typescript
const result = await MatchManager.submitScore(ctx, {
    matchId: "match_456",
    tournamentId: "tournament_123",
    uid: "user_789",
    gameType: "solitaire",
    score: 1500,
    gameData: { moves: 80, timeTaken: 200 },
    propsUsed: ["hint", "undo"]
});
```

### 获取比赛详情
```typescript
const details = await MatchManager.getMatchDetails(ctx, "match_456");
// 返回：{ match, players, events }
```

## 迁移策略

### 1. 数据迁移
使用 `migrateMatchesToPlayerMatches` 函数将现有数据迁移到新结构：

```typescript
// 执行迁移
await ctx.runMutation(internal.service.migration.migrateMatchesToPlayerMatches.migrateMatchesToPlayerMatches, {});

// 验证迁移结果
const validation = await ctx.runMutation(internal.service.migration.migrateMatchesToPlayerMatches.validateMigration, {});
```

### 2. 代码更新
- 更新所有使用旧 `matches` 表的代码
- 使用新的 `MatchManager` 类进行比赛操作（位于 `service/tournament/matchManager.ts`）
- 更新查询逻辑以使用新的表结构

### 3. 测试验证
- 验证数据完整性
- 测试所有比赛相关功能
- 确保性能符合预期

## 索引策略

### matches 表索引
- `by_tournament` - 按锦标赛查询比赛
- `by_status` - 按状态查询比赛
- `by_game_type` - 按游戏类型查询
- `by_tournament_status` - 复合索引优化

### player_matches 表索引
- `by_match_uid` - 查询特定玩家在特定比赛中的记录
- `by_tournament_uid` - 查询玩家在锦标赛中的所有记录
- `by_uid` - 查询玩家的所有比赛记录
- `by_match` - 查询比赛的所有玩家
- `by_completed` - 查询已完成的比赛记录
- `by_score` - 按分数排序

### match_events 表索引
- `by_match` - 查询比赛的所有事件
- `by_tournament` - 查询锦标赛的所有事件
- `by_uid` - 查询玩家相关的事件
- `by_event_type` - 按事件类型查询
- `by_timestamp` - 按时间排序

## 文件结构

```
service/
├── tournament/
│   ├── matchManager.ts          # 比赛管理器（新位置）
│   ├── tournaments.ts           # 锦标赛管理
│   ├── participationManager.ts  # 参与管理
│   └── ...
├── migration/
│   └── migrateMatchesToPlayerMatches.ts  # 数据迁移脚本
└── README_NewMatchStructure.md  # 本文档
```

## 注意事项

1. **向后兼容**：迁移期间保持旧表结构，确保系统正常运行
2. **数据备份**：迁移前务必备份所有数据
3. **分阶段部署**：建议分阶段进行迁移和部署
4. **监控性能**：迁移后密切监控系统性能
5. **回滚计划**：准备回滚方案以应对意外情况

## 总结

新的表结构设计提供了更好的数据组织、查询效率和扩展性。通过合理的表分离和索引策略，可以支持更复杂的比赛场景和更高的并发访问。

`MatchManager` 类现在位于 `service/tournament/matchManager.ts`，提供了完整的比赛管理功能。 