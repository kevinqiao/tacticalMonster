# TournamentMatchingService 使用指南

## 概述

`TournamentMatchingService` 是基于 `tournamentSchema.ts` 中的 `matchingQueue` 表实现的多人匹配服务。它提供了智能的玩家匹配、优先级队列管理和实时状态监控功能。

## 核心特性

### 1. 智能匹配算法
- **技能匹配 (skill_based)**: 根据玩家总分进行匹配
- **段位匹配 (segment_based)**: 根据玩家段位进行匹配
- **ELO匹配 (elo_based)**: 根据ELO分数进行匹配
- **随机匹配 (random)**: 随机匹配玩家

### 2. 优先级队列
- 订阅用户优先级提升
- 段位等级影响优先级
- 技能分数影响优先级
- 等待时间影响优先级

### 3. 实时状态监控
- 队列状态实时查询
- 等待时间统计
- 匹配成功率分析
- 队列性能监控

## 数据库表结构

### matchingQueue 表
```typescript
{
    uid: string,                    // 玩家ID
    tournamentId: string,           // 锦标赛ID
    gameType: string,               // 游戏类型
    playerInfo: {                   // 玩家信息
        uid: string,
        skill: number,              // 技能分数
        segmentName: string,        // 段位名称
        eloScore?: number,          // ELO分数
        totalPoints?: number,       // 总积分
        isSubscribed: boolean       // 是否订阅
    },
    matchingConfig: {               // 匹配配置
        algorithm: string,          // 匹配算法
        maxWaitTime: number,        // 最大等待时间
        skillRange?: number,        // 技能范围
        eloRange?: number,          // ELO范围
        segmentRange?: number,      // 段位范围
        fallbackToAI?: boolean      // 是否回退到AI
    },
    status: "waiting" | "matched" | "expired" | "cancelled",
    matchId?: string,               // 匹配到的比赛ID
    playerMatchId?: string,         // 玩家比赛记录ID
    joinedAt: string,               // 加入时间
    matchedAt?: string,             // 匹配时间
    expiredAt?: string,             // 过期时间
    priority: number,               // 优先级
    weight: number,                 // 权重
    metadata?: any,                 // 元数据
    createdAt: string,
    updatedAt: string
}
```

## API 接口

### 1. 加入匹配队列
```typescript
// 前端调用
const result = await convex.mutation("joinMatchingQueue", {
    uid: "player123",
    tournamentId: "tournament_456",
    gameType: "solitaire"
});

// 返回结果
{
    success: true,
    queueId: "queue_789",
    status: "matched" | "waiting",
    matchId?: "match_123",
    playerMatchId?: "player_match_456",
    gameId?: "game_789",
    serverUrl?: "remote_server_url",
    message: "匹配成功" | "等待匹配中",
    waitTime: 0
}
```

### 2. 获取匹配状态
```typescript
// 前端调用
const status = await convex.query("getMatchingStatus", {
    uid: "player123",
    tournamentId: "tournament_456"
});

// 返回结果
{
    inQueue: true,
    queueId: "queue_789",
    status: "waiting",
    waitTime: 45,           // 等待秒数
    priority: 150,
    algorithm: "skill_based",
    otherPlayers: 3,        // 队列中其他玩家数
    message: "等待匹配中 (45秒，队列中还有3人)"
}
```

### 3. 取消匹配
```typescript
// 前端调用
const result = await convex.mutation("cancelMatching", {
    uid: "player123",
    tournamentId: "tournament_456",
    reason: "user_cancelled"
});

// 返回结果
{
    success: true,
    message: "已取消匹配"
}
```

### 4. 获取队列统计
```typescript
// 前端调用
const stats = await convex.query("getQueueStats", {
    tournamentId: "tournament_456",  // 可选
    gameType: "solitaire"            // 可选
});

// 返回结果
{
    success: true,
    stats: {
        totalWaiting: 15,
        averageWaitTime: 120,        // 平均等待秒数
        oldestWait: 300,             // 最长等待秒数
        algorithmDistribution: {
            "skill_based": 10,
            "random": 5
        },
        segmentDistribution: {
            "gold": 8,
            "platinum": 4,
            "silver": 3
        },
        priorityDistribution: {
            high: 5,      // 优先级 >= 150
            medium: 7,    // 优先级 >= 100
            low: 3        // 优先级 < 100
        }
    }
}
```

### 5. 清理过期队列
```typescript
// 系统定时任务调用
const result = await convex.mutation("cleanupExpiredQueue", {});

// 返回结果
{
    success: true,
    cleanedCount: 5,
    message: "清理了 5 个过期队列条目"
}
```

## 配置示例

### 锦标赛配置
```typescript
const tournamentConfig = {
    advanced: {
        matching: {
            algorithm: "skill_based",     // 匹配算法
            maxWaitTime: 300,             // 最大等待时间(秒)
            skillRange: 200,              // 技能范围
            eloRange: 100,                // ELO范围
            segmentRange: 1,              // 段位范围
            fallbackToAI: false           // 是否回退到AI
        }
    }
};
```

### 玩家信息
```typescript
const player = {
    uid: "player123",
    totalPoints: 1500,           // 总积分
    segmentName: "gold",         // 段位
    eloScore: 1200,              // ELO分数
    isSubscribed: true,          // 是否订阅
    level: 10                    // 等级
};
```

## 使用流程

### 1. 玩家加入匹配
```typescript
// 1. 玩家点击加入锦标赛
const joinResult = await convex.mutation("joinMatchingQueue", {
    uid: player.uid,
    tournamentId: tournament.id,
    gameType: tournament.gameType
});

// 2. 检查匹配结果
if (joinResult.status === "matched") {
    // 立即匹配成功，进入游戏
    startGame(joinResult.gameId, joinResult.serverUrl);
} else {
    // 等待匹配，开始轮询状态
    startStatusPolling(player.uid, tournament.id);
}
```

### 2. 状态轮询
```typescript
// 定期查询匹配状态
const pollStatus = async () => {
    const status = await convex.query("getMatchingStatus", {
        uid: player.uid,
        tournamentId: tournament.id
    });
    
    if (status.inQueue) {
        // 更新UI显示等待状态
        updateWaitingUI(status.waitTime, status.otherPlayers);
        
        // 检查是否超时
        if (status.waitTime > maxWaitTime) {
            // 取消匹配或显示超时提示
            handleTimeout();
        }
    } else {
        // 已匹配或已取消
        stopPolling();
    }
};

// 每5秒轮询一次
const interval = setInterval(pollStatus, 5000);
```

### 3. 取消匹配
```typescript
// 玩家主动取消
const cancelResult = await convex.mutation("cancelMatching", {
    uid: player.uid,
    tournamentId: tournament.id,
    reason: "user_cancelled"
});

if (cancelResult.success) {
    // 更新UI，停止轮询
    updateUI("已取消匹配");
    stopPolling();
}
```

## 性能优化

### 1. 索引优化
- `by_tournament_status`: 按锦标赛和状态查询
- `by_uid_tournament`: 按玩家和锦标赛查询
- `by_status_priority`: 按状态和优先级查询
- `by_joined_at`: 按加入时间查询

### 2. 查询优化
- 限制查询结果数量 (take(20))
- 使用复合索引减少查询时间
- 缓存常用统计数据

### 3. 清理策略
- 定期清理过期队列条目
- 自动清理已匹配的队列记录
- 监控队列大小，防止内存泄漏

## 监控和告警

### 1. 关键指标
- 平均等待时间
- 匹配成功率
- 队列大小
- 超时率

### 2. 告警条件
- 平均等待时间 > 5分钟
- 匹配成功率 < 80%
- 队列大小 > 1000
- 超时率 > 20%

### 3. 日志记录
- 匹配事件日志
- 错误日志
- 性能日志
- 用户行为日志

## 测试

### 运行测试套件
```typescript
// 运行完整测试
const testResult = await convex.mutation("runFullTestSuite", {});

// 运行单个测试
const joinTest = await convex.mutation("testJoinMatchingQueue", {});
const statusTest = await convex.query("testGetMatchingStatus", {});
const cancelTest = await convex.mutation("testCancelMatching", {});
const statsTest = await convex.query("testGetQueueStats", {});
const cleanupTest = await convex.mutation("testCleanupExpiredQueue", {});
```

### 测试覆盖
- 加入队列测试
- 状态查询测试
- 取消匹配测试
- 统计查询测试
- 清理队列测试
- 错误处理测试
- 性能测试

## 最佳实践

### 1. 前端实现
- 使用轮询而不是WebSocket（简化实现）
- 设置合理的轮询间隔（5-10秒）
- 实现优雅的错误处理和重试机制
- 提供清晰的用户反馈

### 2. 后端配置
- 根据游戏类型调整匹配参数
- 监控队列性能，及时调整配置
- 实现合理的超时和清理策略
- 记录详细的匹配日志

### 3. 用户体验
- 显示实时等待时间
- 提供取消匹配选项
- 显示队列中的玩家数量
- 提供匹配算法说明

## 故障排除

### 常见问题
1. **匹配超时**: 检查队列大小和匹配算法配置
2. **队列卡死**: 检查清理任务是否正常运行
3. **性能问题**: 检查索引和查询优化
4. **数据不一致**: 检查事务处理和错误处理

### 调试工具
- 使用 `getQueueStats` 查看队列状态
- 使用 `getMatchingStatus` 查看玩家状态
- 查看 `match_events` 表了解匹配过程
- 使用测试套件验证功能

## 扩展功能

### 1. 高级匹配
- 支持自定义匹配规则
- 实现动态匹配算法
- 支持团队匹配
- 支持跨服务器匹配

### 2. 智能优化
- 机器学习匹配算法
- 动态调整匹配参数
- 预测匹配时间
- 智能负载均衡

### 3. 社交功能
- 好友匹配
- 公会匹配
- 聊天功能
- 观战功能 