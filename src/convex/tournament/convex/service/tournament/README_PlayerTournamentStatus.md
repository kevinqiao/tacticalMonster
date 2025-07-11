# 玩家锦标赛状态管理指南

## 概述

`player_tournaments` 表的 `status` 字段用于跟踪玩家在锦标赛中的参与状态。通过完整的状态管理机制，我们可以：

1. **提高查询效率**：直接通过状态过滤，避免复杂的关联查询
2. **支持状态流转**：确保状态变更的合法性和一致性
3. **提供审计追踪**：记录所有状态变更的历史
4. **支持业务逻辑**：根据不同状态执行相应的业务操作

## 状态定义

### 状态枚举
```typescript
enum PlayerTournamentStatus {
    ACTIVE = "active",           // 活跃参与中
    COMPLETED = "completed",     // 已完成
    WITHDRAWN = "withdrawn",     // 主动退出
    DISQUALIFIED = "disqualified", // 被取消资格
    EXPIRED = "expired"          // 已过期（锦标赛结束但未完成）
}
```

### 状态流转规则
```typescript
const STATUS_TRANSITIONS = {
    [PlayerTournamentStatus.ACTIVE]: [
        PlayerTournamentStatus.COMPLETED,
        PlayerTournamentStatus.WITHDRAWN,
        PlayerTournamentStatus.DISQUALIFIED,
        PlayerTournamentStatus.EXPIRED
    ],
    [PlayerTournamentStatus.COMPLETED]: [], // 终态
    [PlayerTournamentStatus.WITHDRAWN]: [], // 终态
    [PlayerTournamentStatus.DISQUALIFIED]: [], // 终态
    [PlayerTournamentStatus.EXPIRED]: [] // 终态
};
```

## 核心功能

### 1. 状态更新
```typescript
// 更新单个玩家的锦标赛状态
await PlayerTournamentStatusManager.updatePlayerTournamentStatus(ctx, {
    uid: "player123",
    tournamentId: "tournament456",
    newStatus: PlayerTournamentStatus.COMPLETED,
    reason: "锦标赛完成",
    metadata: { score: 1500, rank: 1 }
});
```

### 2. 批量状态更新
```typescript
// 批量更新锦标赛中所有参与者的状态
await PlayerTournamentStatusManager.batchUpdatePlayerTournamentStatus(ctx, {
    tournamentId: "tournament456",
    newStatus: PlayerTournamentStatus.EXPIRED,
    reason: "锦标赛过期"
});
```

### 3. 锦标赛完成处理
```typescript
// 锦标赛完成时，自动更新所有参与者状态
await PlayerTournamentStatusManager.completeTournamentForAllPlayers(ctx, {
    tournamentId: "tournament456",
    completedPlayers: ["player123", "player456"], // 完成比赛的玩家
    reason: "锦标赛完成"
});
```

### 4. 玩家退出处理
```typescript
// 玩家主动退出锦标赛
await PlayerTournamentStatusManager.withdrawPlayerFromTournament(ctx, {
    uid: "player123",
    tournamentId: "tournament456",
    reason: "玩家主动退出"
});
```

### 5. 取消资格处理
```typescript
// 取消玩家资格
await PlayerTournamentStatusManager.disqualifyPlayerFromTournament(ctx, {
    uid: "player123",
    tournamentId: "tournament456",
    reason: "违反规则",
    metadata: { violationType: "cheating", evidence: "..." }
});
```

## API 接口

### 状态更新 API
```typescript
// 更新玩家锦标赛状态
export const updatePlayerTournamentStatus = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        newStatus: v.union(
            v.literal("active"),
            v.literal("completed"),
            v.literal("withdrawn"),
            v.literal("disqualified"),
            v.literal("expired")
        ),
        reason: v.optional(v.string()),
        metadata: v.optional(v.any())
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentService.updatePlayerTournamentStatus(ctx, args);
    }
});
```

### 玩家退出 API
```typescript
export const withdrawPlayerFromTournament = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        reason: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentService.withdrawPlayerFromTournament(ctx, args);
    }
});
```

### 取消资格 API
```typescript
export const disqualifyPlayerFromTournament = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        reason: v.string(),
        metadata: v.optional(v.any())
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentService.disqualifyPlayerFromTournament(ctx, args);
    }
});
```

### 统计查询 API
```typescript
export const getPlayerParticipationStats = (query as any)({
    args: {
        uid: v.string(),
        timeRange: v.optional(v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("seasonal"),
            v.literal("total")
        ))
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentService.getPlayerParticipationStats(ctx, args);
    }
});
```

## 使用场景

### 1. 锦标赛结算时
```typescript
// 在锦标赛完成时自动更新状态
async completeTournament(ctx: any, tournamentId: string, now: any) {
    // 更新锦标赛状态
    await ctx.db.patch(tournamentId, {
        status: "completed",
        updatedAt: now.iso
    });

    // 获取完成比赛的玩家列表
    const completedMatches = await this.getCompletedMatches!(ctx, tournamentId);
    const completedPlayers = new Set<string>();
    
    for (const match of completedMatches) {
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
            .collect();
        
        for (const playerMatch of playerMatches) {
            if (playerMatch.completed) {
                completedPlayers.add(playerMatch.uid);
            }
        }
    }

    // 更新参与者状态
    await PlayerTournamentStatusManager.completeTournamentForAllPlayers(ctx, {
        tournamentId,
        completedPlayers: Array.from(completedPlayers),
        reason: "锦标赛完成"
    });
}
```

### 2. 查询当前参与
```typescript
// 优化后的 getCurrentParticipations 方法
private static async getCurrentParticipations(ctx: any, params: {
    uid: string;
    tournamentType: string;
    gameType: string;
}) {
    const { uid, tournamentType, gameType } = params;

    // 只查询活跃状态的参与记录
    const activeParticipations = await ctx.db
        .query("player_tournaments")
        .withIndex("by_uid_status", (q: any) => 
            q.eq("uid", uid).eq("status", "active")
        )
        .collect();

    if (activeParticipations.length === 0) {
        return [];
    }

    // 获取相关的锦标赛信息
    const tournamentIds = activeParticipations.map((pt: any) => pt.tournamentId);
    const tournaments = await Promise.all(
        tournamentIds.map((id: string) => ctx.db.get(id))
    );

    // 过滤出符合条件的锦标赛
    const validTournaments = tournaments.filter((tournament: any) => 
        tournament && 
        tournament.tournamentType === tournamentType &&
        tournament.gameType === gameType &&
        tournament.status === "open"
    );

    // 构建参与信息
    const currentParticipations: any[] = [];
    for (const pt of activeParticipations) {
        const tournament = validTournaments.find((t: any) => t._id === pt.tournamentId);
        if (!tournament) continue;

        // 获取比赛统计...
        currentParticipations.push({
            tournamentId: tournament._id,
            tournamentName: tournament.tournamentType,
            status: tournament.status,
            participationStatus: pt.status, // 新增：参与状态
            joinedAt: pt.joinedAt || pt.createdAt,
            // ... 其他统计信息
        });
    }

    return currentParticipations;
}
```

### 3. 定期清理
```typescript
// 定期清理过期的参与记录
export const cleanupExpiredParticipations = (mutation as any)({
    args: {
        daysToKeep: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.cleanupExpiredParticipations(ctx, args);
        return result;
    }
});

// 使用示例
await cleanupExpiredParticipations({ daysToKeep: 30 }); // 保留30天内的记录
```

## 数据维护策略

### 1. 自动状态更新
- **锦标赛完成时**：自动将所有参与者状态更新为 `completed` 或 `expired`
- **锦标赛过期时**：将未完成的参与者状态更新为 `expired`
- **玩家提交分数时**：检查是否需要更新状态

### 2. 手动状态管理
- **玩家主动退出**：状态更新为 `withdrawn`
- **管理员取消资格**：状态更新为 `disqualified`
- **系统异常处理**：根据具体情况更新状态

### 3. 数据清理
- **定期清理**：删除超过保留期限的已完成/退出/取消资格记录
- **归档策略**：将历史数据归档到专门的日志表

### 4. 监控和审计
- **状态变更日志**：记录所有状态变更的历史
- **异常监控**：监控异常的状态变更
- **统计报告**：定期生成参与统计报告

## 性能优化

### 1. 索引优化
```sql
-- 已添加的索引
CREATE INDEX by_uid_status ON player_tournaments (uid, status);
CREATE INDEX by_tournament ON player_tournaments (tournamentId);
CREATE INDEX by_uid_tournament ON player_tournaments (uid, tournamentId);
```

### 2. 查询优化
- 使用 `by_uid_status` 索引快速查询活跃参与
- 避免复杂的关联查询
- 批量处理状态更新

### 3. 数据分区
- 按时间范围分区查询
- 定期清理过期数据
- 使用时间戳过滤减少查询范围

## 最佳实践

### 1. 状态更新原则
- **原子性**：状态更新应该是原子操作
- **一致性**：确保状态变更的一致性
- **可追溯性**：记录所有状态变更的原因和元数据

### 2. 错误处理
- **验证状态流转**：确保状态变更的合法性
- **回滚机制**：提供状态回滚的能力
- **异常记录**：记录所有异常情况

### 3. 监控告警
- **状态异常**：监控异常的状态变更
- **性能监控**：监控查询性能
- **数据一致性**：定期检查数据一致性

## 总结

通过完整的状态管理机制，我们可以：

1. **提高系统性能**：减少复杂的关联查询
2. **增强数据一致性**：确保状态变更的合法性
3. **提供审计能力**：记录所有状态变更历史
4. **支持业务扩展**：为未来的业务需求提供基础

这个状态管理系统为锦标赛系统提供了强大的数据管理能力，确保了数据的准确性和系统的可维护性。 