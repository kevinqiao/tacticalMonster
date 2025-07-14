# 锦标赛限制配置详解

## 概述

`limits` 配置是锦标赛系统中的重要组成部分，用于控制玩家参与锦标赛的频率和数量，防止滥用和确保游戏平衡。

## 配置结构

```typescript
limits: {
    // 每日限制
    daily: {
        maxParticipations: number;  // 最大参与次数
        maxTournaments: number;     // 最大锦标赛数量
        maxAttempts: number;        // 最大尝试次数
    };
    
    // 每周限制
    weekly: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };
    
    // 赛季限制
    seasonal: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };
    
    // 总限制
    total: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };
    
    // 订阅用户限制（更高权限）
    subscribed: {
        daily: { ... };
        weekly: { ... };
        seasonal: { ... };
    };
}
```

## 各字段含义

### 1. maxParticipations（最大参与次数）
- **定义**: 玩家在指定时间范围内可以参与的锦标赛实例数量
- **计算方式**: 每次调用 `joinTournament` 时计数 +1
- **重置时间**: 根据时间范围自动重置
- **用途**: 防止玩家过度参与，控制服务器负载

### 2. maxTournaments（最大锦标赛数量）
- **定义**: 玩家在指定时间范围内可以同时参与的锦标赛类型数量
- **计算方式**: 基于 `tournamentType` 去重计数
- **重置时间**: 根据时间范围自动重置
- **用途**: 限制玩家同时参与多种锦标赛

### 3. maxAttempts（最大尝试次数）
- **定义**: 玩家在指定时间范围内可以进行的比赛尝试次数
- **计算方式**: 每次提交分数时计数 +1
- **重置时间**: 根据时间范围自动重置
- **用途**: 控制玩家重试次数，防止刷分

## 时间范围说明

### daily（每日）
- **周期**: 24小时，从每天 00:00:00 开始
- **适用场景**: 日常锦标赛，每日重置
- **示例**: 每日最多参与 3 次锦标赛

### weekly（每周）
- **周期**: 7天，从每周日 00:00:00 开始
- **适用场景**: 周赛，每周重置
- **示例**: 每周最多参与 21 次锦标赛

### seasonal（赛季）
- **周期**: 当前赛季的持续时间
- **适用场景**: 赛季锦标赛，赛季结束时重置
- **示例**: 本赛季最多参与 90 次锦标赛

### total（总计）
- **周期**: 永久，不重置
- **适用场景**: 终身限制，防止长期滥用
- **示例**: 终身最多参与 1000 次锦标赛

## 订阅用户特权

订阅用户享有更高的限制配额：

```typescript
subscribed: {
    daily: {
        maxParticipations: 12,  // 普通用户 8，订阅用户 12
        maxTournaments: 6,      // 普通用户 4，订阅用户 6
        maxAttempts: 12         // 普通用户 8，订阅用户 12
    }
}
```

## 配置示例

### 1. 日常锦标赛（宽松限制）
```typescript
limits: {
    daily: {
        maxParticipations: 8,    // 每日最多参与 8 次
        maxTournaments: 4,       // 每日最多参与 4 种锦标赛
        maxAttempts: 8           // 每日最多尝试 8 次
    },
    weekly: {
        maxParticipations: 56,   // 每周最多参与 56 次
        maxTournaments: 28,      // 每周最多参与 28 种锦标赛
        maxAttempts: 56          // 每周最多尝试 56 次
    },
    seasonal: {
        maxParticipations: 240,  // 赛季最多参与 240 次
        maxTournaments: 120,     // 赛季最多参与 120 种锦标赛
        maxAttempts: 240         // 赛季最多尝试 240 次
    },
    total: {
        maxParticipations: 1000, // 终身最多参与 1000 次
        maxTournaments: 500,     // 终身最多参与 500 种锦标赛
        maxAttempts: 2000        // 终身最多尝试 2000 次
    },
    subscribed: {
        daily: {
            maxParticipations: 12,  // 订阅用户每日 12 次
            maxTournaments: 6,      // 订阅用户每日 6 种
            maxAttempts: 12         // 订阅用户每日 12 次尝试
        }
    }
}
```

### 2. 高级锦标赛（严格限制）
```typescript
limits: {
    daily: {
        maxParticipations: 3,    // 每日最多参与 3 次
        maxTournaments: 1,       // 每日最多参与 1 种锦标赛
        maxAttempts: 3           // 每日最多尝试 3 次
    },
    weekly: {
        maxParticipations: 21,   // 每周最多参与 21 次
        maxTournaments: 7,       // 每周最多参与 7 种锦标赛
        maxAttempts: 21          // 每周最多尝试 21 次
    },
    seasonal: {
        maxParticipations: 90,   // 赛季最多参与 90 次
        maxTournaments: 30,      // 赛季最多参与 30 种锦标赛
        maxAttempts: 90          // 赛季最多尝试 90 次
    },
    total: {
        maxParticipations: 1000, // 终身最多参与 1000 次
        maxTournaments: 500,     // 终身最多参与 500 种锦标赛
        maxAttempts: 3000        // 终身最多尝试 3000 次
    }
}
```

### 3. Best of Series 锦标赛（特殊限制）
```typescript
limits: {
    daily: {
        maxParticipations: 5,    // 每日最多参与 5 次
        maxTournaments: 1,       // 每日最多参与 1 种锦标赛
        maxAttempts: 1           // 每日最多尝试 1 次（三局两胜）
    },
    weekly: {
        maxParticipations: 20,   // 每周最多参与 20 次
        maxTournaments: 5,       // 每周最多参与 5 种锦标赛
        maxAttempts: 5           // 每周最多尝试 5 次
    },
    seasonal: {
        maxParticipations: 100,  // 赛季最多参与 100 次
        maxTournaments: 20,      // 赛季最多参与 20 种锦标赛
        maxAttempts: 20          // 赛季最多尝试 20 次
    },
    total: {
        maxParticipations: 1000, // 终身最多参与 1000 次
        maxTournaments: 100,     // 终身最多参与 100 种锦标赛
        maxAttempts: 100         // 终身最多尝试 100 次
    }
}
```

## 限制检查逻辑

### 1. 参与限制检查
```typescript
// 在 joinTournament 时检查
const currentParticipations = await getPlayerParticipations(ctx, {
    uid,
    timeRange: "daily"
});

if (currentParticipations.length >= limits.daily.maxParticipations) {
    throw new Error("已达到每日最大参与次数限制");
}
```

### 2. 锦标赛类型限制检查
```typescript
// 检查是否超过锦标赛类型限制
const currentTournamentTypes = new Set(
    currentParticipations.map(p => p.tournamentType)
);

if (currentTournamentTypes.size >= limits.daily.maxTournaments) {
    throw new Error("已达到每日最大锦标赛类型限制");
}
```

### 3. 尝试次数限制检查
```typescript
// 在 submitScore 时检查
const currentAttempts = await getPlayerAttempts(ctx, {
    uid,
    tournamentType,
    gameType,
    timeRange: "daily"
});

if (currentAttempts >= limits.daily.maxAttempts) {
    throw new Error("已达到每日最大尝试次数限制");
}
```

## 最佳实践

### 1. 合理设置限制
- **日常锦标赛**: 设置较高的限制，鼓励参与
- **高级锦标赛**: 设置适中的限制，保持竞争性
- **特殊锦标赛**: 设置较低的限制，增加稀缺性

### 2. 订阅用户特权
- 订阅用户限制通常比普通用户高 50-100%
- 体现订阅价值，鼓励用户订阅

### 3. 时间范围平衡
- `daily` 限制：控制短期参与频率
- `weekly` 限制：平衡周内活动
- `seasonal` 限制：管理赛季参与度
- `total` 限制：防止长期滥用

### 4. 动态调整
- 根据玩家反馈调整限制
- 监控参与数据，优化限制设置
- 特殊活动期间可临时调整限制

## 注意事项

1. **限制优先级**: 系统会检查所有时间范围的限制，取最严格的限制
2. **重置时机**: 限制在时间范围结束时自动重置
3. **订阅状态**: 订阅状态变化时，限制会立即生效
4. **错误处理**: 超过限制时会抛出明确的错误信息
5. **数据一致性**: 限制检查在事务中进行，确保数据一致性

## 监控和调试

### 1. 限制使用情况查询
```typescript
// 查询玩家当前限制使用情况
const usage = await getPlayerLimitUsage(ctx, {
    uid,
    timeRange: "daily"
});

console.log(`每日参与次数: ${usage.participations}/${limits.daily.maxParticipations}`);
console.log(`每日锦标赛类型: ${usage.tournaments}/${limits.daily.maxTournaments}`);
console.log(`每日尝试次数: ${usage.attempts}/${limits.daily.maxAttempts}`);
```

### 2. 限制统计
```typescript
// 获取限制触发统计
const stats = await getLimitTriggerStats(ctx, {
    timeRange: "daily",
    limitType: "maxParticipations"
});

console.log(`每日参与限制触发次数: ${stats.triggerCount}`);
console.log(`受影响玩家数: ${stats.affectedPlayers}`);
```

通过合理配置 `limits`，可以有效控制锦标赛的参与度，确保游戏平衡和系统稳定性。 