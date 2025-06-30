# 远程游戏服务器集成方案

## 概述

本方案完全移除了本地游戏创建功能，统一使用远程游戏服务器来处理所有游戏逻辑。系统支持单人、多人锦标赛，通过统一的接口与远程游戏服务器进行通信。

## 架构设计

### 核心组件

1. **MatchManager** - 比赛管理器
   - 负责创建、管理比赛
   - 处理玩家加入/离开
   - 统一远程游戏创建接口

2. **TournamentService** - 锦标赛服务
   - 统一锦标赛入口
   - 支持多种锦标赛类型
   - 集成所有处理器

3. **Tournament Handlers** - 锦标赛处理器
   - `singlePlayerTournamentHandler` - 单人锦标赛
   - `multiPlayerTournamentHandler` - 多人锦标赛
   - `independentTournamentHandler` - 独立锦标赛

### 数据流

```
玩家请求 → TournamentService → Handler → MatchManager → 远程游戏服务器
                ↓
            事件通知 → 玩家客户端
```

## 远程游戏服务器配置

### 环境变量

```bash
# 游戏服务器API端点
GAME_SERVER_API=https://game-server.example.com/api/games
GAME_SERVER_TOKEN=your_game_server_token

# 事件同步服务
EVENT_SYNC_API=https://event-sync.example.com/api/events
EVENT_SYNC_TOKEN=your_event_sync_token
```

### 游戏类型映射

```typescript
const gameTypeMapping = {
    "solitaire": "solitaire",
    "uno": "uno", 
    "ludo": "ludo",
    "rummy": "rummy"
};
```

## 主要功能

### 1. 统一锦标赛加入

```typescript
// 加入锦标赛
const result = await TournamentService.joinTournament(ctx, {
    uid: "player123",
    gameType: "rummy",
    tournamentType: "multi_player_tournament"
});

// 返回结果
{
    success: true,
    tournamentId: "tournament_123",
    matchId: "match_456",
    playerMatchId: "player_match_789",
    gameId: "game_abc",
    serverUrl: "https://game-server.example.com/game/abc",
    attemptNumber: 1,
    message: "成功加入锦标赛"
}
```

### 2. 远程游戏创建

```typescript
// 创建远程游戏
const gameResult = await MatchManager.createRemoteGame(ctx, {
    matchId: "match_123",
    tournamentId: "tournament_456",
    uids: ["player1", "player2", "player3", "player4"],
    gameType: "rummy",
    matchType: "multi_match"
});

// 返回结果
{
    gameId: "game_abc",
    serverUrl: "https://game-server.example.com/game/abc",
    type: "remote",
    success: true
}
```

### 3. 分数提交

```typescript
// 提交分数
const result = await TournamentService.submitScore(ctx, {
    tournamentId: "tournament_123",
    uid: "player123",
    gameType: "rummy",
    score: 1500,
    gameData: { /* 游戏数据 */ },
    propsUsed: ["boost", "shield"],
    gameId: "game_abc"
});
```

## 锦标赛类型支持

### 1. 单人锦标赛 (single_player_tournament)

- **特点**: 每个玩家独立游戏，取最高分
- **流程**: 
  1. 玩家加入 → 创建单场比赛 → 创建远程游戏
  2. 玩家完成游戏 → 提交分数 → 立即结算

```typescript
// 配置示例
{
    "typeId": "single_player_tournament",
    "defaultConfig": {
        "rules": {
            "isSingleMatch": true,
            "maxAttempts": 3
        },
        "entryFee": {
            "coins": 100
        }
    }
}
```

### 2. 多人锦标赛 (multi_player_tournament)

- **特点**: 多个玩家同时游戏，实时对战
- **流程**:
  1. 玩家加入 → 匹配队列 → 创建多人比赛
  2. 达到人数 → 创建远程游戏 → 所有玩家同时游戏
  3. 游戏结束 → 提交分数 → 计算排名

```typescript
// 配置示例
{
    "typeId": "multi_player_tournament",
    "defaultConfig": {
        "rules": {
            "isSingleMatch": false,
            "maxPlayers": 4,
            "minPlayers": 2
        },
        "entryFee": {
            "coins": 50
        }
    }
}
```

### 3. 独立锦标赛 (independent_tournament)

- **特点**: 每次尝试都是独立的锦标赛
- **流程**:
  1. 玩家加入 → 创建独立锦标赛 → 创建单场比赛
  2. 完成游戏 → 提交分数 → 立即结算

## 事件系统

### 比赛事件

```typescript
// 事件类型
const eventTypes = {
    "match_created": "比赛创建",
    "player_join": "玩家加入",
    "match_start": "比赛开始",
    "remote_game_created": "远程游戏创建",
    "score_submit": "分数提交",
    "match_completed": "比赛完成"
};
```

### 玩家事件通知

```typescript
// 通知玩家游戏创建
await MatchManager.notifyPlayers(ctx, {
    uids: ["player1", "player2", "player3", "player4"],
    eventType: "GameCreated",
    eventData: {
        gameId: "game_abc",
        matchId: "match_123",
        serverUrl: "https://game-server.example.com/game/abc",
        gameType: "rummy"
    }
});
```

## 错误处理

### 远程游戏创建失败

```typescript
try {
    const gameResult = await MatchManager.createRemoteGame(ctx, params);
    return gameResult;
} catch (error) {
    // 记录错误日志
    await ctx.db.insert("error_logs", {
        error: `创建远程游戏失败: ${error.message}`,
        context: "createRemoteGame",
        matchId: params.matchId,
        tournamentId: params.tournamentId,
        createdAt: now.iso
    });
    
    throw new Error(`创建远程游戏失败: ${error.message}`);
}
```

### 超时处理

```typescript
// 游戏创建超时配置
const REMOTE_GAME_CONFIG = {
    timeout: 30000, // 30秒
    retryAttempts: 3
};

// 使用 AbortSignal 处理超时
const gameResponse = await fetch(REMOTE_GAME_CONFIG.gameAPI, {
    method: "POST",
    headers: { /* ... */ },
    body: JSON.stringify(gameRequest),
    signal: AbortSignal.timeout(REMOTE_GAME_CONFIG.timeout)
});
```

## 性能优化

### 1. 批量查询

```typescript
// 批量获取玩家信息
const playerUids = [...new Set(playerMatches.map(pm => pm.uid))];
const players = await Promise.all(
    playerUids.map(uid => 
        ctx.db.query("players")
            .withIndex("by_uid", q => q.eq("uid", uid))
            .first()
    )
);
```

### 2. 索引优化

```typescript
// 使用索引加速查询
const playerMatches = await ctx.db
    .query("player_matches")
    .withIndex("by_match", q => q.eq("matchId", matchId))
    .collect();
```

### 3. 异步处理

```typescript
// 异步通知玩家，不阻塞主流程
await MatchManager.notifyPlayers(ctx, {
    uids: params.uids,
    eventType: "GameCreated",
    eventData: eventData
});
```

## 监控和日志

### 错误日志

```typescript
// 记录详细错误信息
await ctx.db.insert("error_logs", {
    error: error.message,
    context: "tournament_service",
    uid: params.uid,
    tournamentId: params.tournamentId,
    matchId: params.matchId,
    createdAt: now.iso
});
```

### 性能监控

```typescript
// 记录关键操作耗时
const startTime = Date.now();
const result = await MatchManager.createRemoteGame(ctx, params);
const duration = Date.now() - startTime;

console.log(`远程游戏创建耗时: ${duration}ms`);
```

## 部署配置

### 1. 环境变量设置

```bash
# .env 文件
GAME_SERVER_API=https://your-game-server.com/api/games
GAME_SERVER_TOKEN=your_secret_token
EVENT_SYNC_API=https://your-event-sync.com/api/events
EVENT_SYNC_TOKEN=your_event_sync_token
```

### 2. 网络配置

```typescript
// 确保 Convex 可以访问远程服务器
// 配置防火墙规则
// 设置适当的超时时间
```

### 3. 监控告警

```typescript
// 设置关键指标监控
// 游戏创建成功率
// 平均响应时间
// 错误率
```

## 测试

### 单元测试

```typescript
// 测试远程游戏创建
describe('MatchManager.createRemoteGame', () => {
    it('should create remote game successfully', async () => {
        const result = await MatchManager.createRemoteGame(ctx, {
            matchId: 'test_match',
            tournamentId: 'test_tournament',
            uids: ['player1', 'player2'],
            gameType: 'rummy',
            matchType: 'test'
        });
        
        expect(result.success).toBe(true);
        expect(result.gameId).toBeDefined();
        expect(result.serverUrl).toBeDefined();
    });
});
```

### 集成测试

```typescript
// 测试完整流程
describe('TournamentService Integration', () => {
    it('should handle complete tournament flow', async () => {
        // 1. 加入锦标赛
        const joinResult = await TournamentService.joinTournament(ctx, {
            uid: 'test_player',
            gameType: 'rummy',
            tournamentType: 'multi_player_tournament'
        });
        
        // 2. 提交分数
        const scoreResult = await TournamentService.submitScore(ctx, {
            tournamentId: joinResult.tournamentId,
            uid: 'test_player',
            gameType: 'rummy',
            score: 1500,
            gameData: {},
            propsUsed: []
        });
        
        expect(scoreResult.success).toBe(true);
    });
});
```

## 总结

本方案通过以下方式实现了统一的远程游戏服务器集成：

1. **去除本地游戏创建** - 完全移除 `createLocalGame` 函数
2. **统一远程接口** - 所有游戏创建都通过 `MatchManager.createRemoteGame`
3. **支持多种锦标赛类型** - 单人、多人、独立锦标赛
4. **完善的事件系统** - 实时通知和状态同步
5. **健壮的错误处理** - 超时、重试、日志记录
6. **性能优化** - 批量查询、索引优化、异步处理

系统现在完全依赖远程游戏服务器，提供了更好的扩展性、稳定性和维护性。 