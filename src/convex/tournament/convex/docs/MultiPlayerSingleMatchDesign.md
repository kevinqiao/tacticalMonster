# 多人单场比赛锦标赛设计文档

## 概述

多人单场比赛锦标赛（Multi-Player Single Match Tournament）是一种特殊的锦标赛模式，允许多个玩家参与同一个锦标赛实例，并在同一场比赛中进行竞争。

## 核心概念

### 1. 共享锦标赛实例
- **关键特性**：多个玩家共享同一个锦标赛实例，而不是每个玩家创建独立的锦标赛
- **设计原则**：通过 `findOrCreateMultiPlayerTournament` 函数实现共享锦标赛的查找和创建
- **优势**：确保所有玩家在同一个锦标赛中进行排名和奖励分配

### 2. 多人单场比赛
- **比赛模式**：所有玩家参与同一场比赛实例
- **匹配机制**：使用 `TournamentMatchingService` 进行智能匹配
- **容量管理**：每个锦标赛有最大玩家数限制（默认8人）

### 3. 多次参与支持
- **尝试次数**：每个玩家最多可参与10次尝试
- **独立计分**：每次尝试都有独立的分数记录
- **最佳成绩**：最终排名基于玩家的最佳分数

### 4. 双重奖励系统
- **每场比赛奖励**：每次完成比赛后立即获得积分奖励
- **最终排名奖励**：锦标赛结束后根据最终排名获得额外奖励

## 修复说明

### 问题描述
之前的实现中，`join` 方法直接调用 `createMultiPlayerTournament`，导致每个玩家都创建了独立的锦标赛实例，这与多人单场比赛的设计理念完全相反。

### 修复方案
1. **引入共享锦标赛查找**：使用 `findOrCreateMultiPlayerTournament` 函数
2. **复用现有锦标赛**：优先查找现有的开放锦标赛
3. **容量控制**：检查当前玩家数量，避免超过最大限制
4. **统一管理**：所有玩家共享同一个锦标赛实例

## 配置示例

```typescript
{
    typeId: "multi_player_single_match_tournament",
    name: "多人单场比赛锦标赛",
    description: "与其他玩家在同一场比赛中竞争",
    category: "competitive",
    gameType: "solitaire",
    isActive: true,
    priority: 1,

    entryRequirements: {
        minSegment: "bronze",
        isSubscribedRequired: false,
        entryFee: {
            coins: 40
        }
    },

    matchRules: {
        matchType: "multi_player_single_match",
        minPlayers: 2,
        maxPlayers: 8,
        isSingleMatch: true,
        maxAttempts: 10,
        allowMultipleAttempts: true,
        rankingMethod: "best_score"
    },

    rewards: {
        baseRewards: {
            coins: 100,
            gamePoints: 50,
            props: [],
            tickets: []
        },
        rankRewards: [
            {
                rankRange: [1, 1],
                multiplier: 3.0
            },
            {
                rankRange: [2, 3],
                multiplier: 2.0
            },
            {
                rankRange: [4, 5],
                multiplier: 1.5
            }
        ],
        perMatchRewards: {
            enabled: true,
            basePoints: 10,
            scoreMultiplier: 0.1,
            minPoints: 5,
            maxPoints: 50,
            bonusConditions: [
                {
                    type: "score_threshold",
                    value: 1000,
                    bonusPoints: 20
                },
                {
                    type: "perfect_score",
                    value: 1500,
                    bonusPoints: 50
                }
            ]
        }
    },

    advanced: {
        matching: {
            algorithm: "skill_based",
            maxPlayersPerMatch: 8,
            minPlayersToStart: 2,
            maxWaitTime: 300,
            fallbackToAI: true
        }
    }
}
```

## 实现流程

### 1. 加入锦标赛
```typescript
// 查找或创建共享锦标赛
const tournament = await findOrCreateMultiPlayerTournament(ctx, {
    uid,
    gameType,
    tournamentType,
    player,
    season,
    config: tournamentTypeConfig,
    now,
    attemptNumber: attempts + 1
});

// 使用 TournamentMatchingService 进行智能匹配
const matchResult = await TournamentMatchingService.joinTournamentMatch(ctx, {
    uid,
    tournamentId: tournament._id,
    gameType,
    player,
    config: tournamentTypeConfig
});
```

### 2. 分数提交
```typescript
// 更新比赛记录
await MatchManager.submitScore(ctx, {
    matchId: playerMatch.matchId,
    tournamentId,
    uid,
    gameType,
    score,
    gameData,
    propsUsed,
    attemptNumber: 1
});

// 计算并分配每场比赛的积分奖励
const matchRewards = await calculateAndDistributeMatchRewards(ctx, {
    uid,
    score,
    tournament,
    playerMatch,
    now
});
```

### 3. 锦标赛结算
```typescript
// 计算玩家排名（基于最佳分数）
const sortedPlayers = await calculatePlayerRankings(ctx, tournamentId);

// 分配最终排名奖励
for (const player of sortedPlayers) {
    const reward = calculateFinalReward(player.rank, tournament.config.rewards);
    await distributeFinalReward(ctx, {
        uid: player.uid,
        rank: player.rank,
        score: player.score,
        tournament,
        matches: completedMatches,
        reward
    });
}
```

## 数据库结构

### tournaments 表
```typescript
{
    _id: Id<"tournaments">,
    seasonId: Id<"seasons">,
    gameType: "solitaire",
    segmentName: "bronze",
    status: "open",
    tournamentType: "multi_player_single_match_tournament",
    isSubscribedRequired: false,
    isSingleMatch: true,  // 多人单场比赛
    prizePool: 32,        // 入场费 * 0.8
    config: {
        // ... 标准配置
        multiPlayerSingleMatch: {
            maxPlayersPerMatch: 8,
            minPlayersToStart: 2,
            currentPlayerCount: 1  // 当前玩家数量
        },
        multipleAttemptsMode: true,
        perMatchRewardsEnabled: true
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    endTime: "2024-01-01T00:30:00.000Z"
}
```

### matches 表
```typescript
{
    _id: Id<"matches">,
    tournamentId: Id<"tournaments">,
    gameType: "solitaire",
    matchType: "tournament",
    status: "pending",  // 等待玩家加入
    maxPlayers: 8,
    minPlayers: 2,
    currentPlayers: 1,
    gameData: {
        tournamentType: "multi_player_single_match_tournament",
        attemptNumber: 1
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### player_matches 表
```typescript
{
    _id: Id<"player_matches">,
    matchId: Id<"matches">,
    tournamentId: Id<"tournaments">,
    uid: "user123",
    gameType: "solitaire",
    score: 1250,
    rank: 2,
    completed: true,
    attemptNumber: 1,
    propsUsed: ["hint"],
    playerGameData: {
        moves: 85,
        timeTaken: 180
    },
    joinTime: "2024-01-01T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:05:00.000Z"
}
```

### match_rewards 表（新增）
```typescript
{
    _id: Id<"match_rewards">,
    uid: "user123",
    tournamentId: Id<"tournaments">,
    matchId: Id<"matches">,
    score: 1250,
    points: 135,        // 基础积分 + 分数加成 + 奖励积分
    coins: 67,          // 积分转换为金币
    gamePoints: 135,    // 积分直接作为游戏积分
    bonusPoints: 20,    // 额外奖励积分
    createdAt: "2024-01-01T00:05:00.000Z"
}
```

## 关键函数

### findOrCreateMultiPlayerTournament
```typescript
async function findOrCreateMultiPlayerTournament(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
    attemptNumber: number;
}) {
    // 1. 查找现有的共享锦标赛
    const existingTournament = await ctx.db
        .query("tournaments")
        .withIndex("by_type_status_game", (q: any) =>
            q.eq("tournamentType", tournamentType)
                .eq("status", "open")
                .eq("gameType", gameType)
        )
        .filter((q: any) => q.eq(q.field("isSingleMatch"), true))
        .order("desc")
        .first();

    if (existingTournament) {
        // 2. 检查容量限制
        const currentPlayers = existingTournament.config.multiPlayerSingleMatch?.currentPlayerCount || 0;
        if (currentPlayers >= (existingTournament.config.advanced?.matching?.maxPlayersPerMatch || 8)) {
            throw new Error("锦标赛已满员");
        }

        // 3. 更新玩家数量
        await ctx.db.patch(existingTournament._id, {
            "config.multiPlayerSingleMatch.currentPlayerCount": currentPlayers + 1,
            updatedAt: now.iso
        });

        return existingTournament;
    }

    // 4. 创建新的共享锦标赛
    return await createMultiPlayerTournament(ctx, {
        uid,
        gameType,
        tournamentType,
        player,
        season,
        config,
        now
    });
}
```

## 使用场景

### 1. 实时竞技
- 玩家可以立即加入正在进行的锦标赛
- 与其他玩家在同一场比赛中竞争
- 实时查看排名和进度

### 2. 多次挑战
- 支持多次尝试，提高最佳成绩
- 每次尝试都有即时奖励
- 最终排名基于最佳成绩

### 3. 社交互动
- 与朋友一起参与同一锦标赛
- 实时比较成绩和排名
- 增加游戏的社交元素

## 优势

### 1. 真正的多人体验
- 所有玩家在同一个锦标赛实例中竞争
- 实时排名和进度更新
- 增强竞技感和社交互动

### 2. 灵活的参与方式
- 支持多次尝试，提高参与度
- 即时奖励激励持续参与
- 最终排名奖励提供长期目标

### 3. 智能匹配系统
- 使用 TournamentMatchingService 进行智能匹配
- 考虑玩家技能水平和等待时间
- 自动处理容量管理和匹配优化

## 与其他模式的对比

| 特性 | 独立锦标赛 | 共享锦标赛 | 多人单场比赛锦标赛 |
|------|------------|------------|-------------------|
| 锦标赛实例 | 每个玩家独立 | 多个玩家共享 | 多个玩家共享 |
| 比赛模式 | 单人比赛 | 独立比赛 | 同一场比赛 |
| 参与方式 | 一次性 | 多次尝试 | 多次尝试 |
| 奖励系统 | 最终排名 | 最终排名 | 双重奖励 |
| 社交互动 | 无 | 有限 | 丰富 |

## 总结

修复后的多人单场比赛锦标赛设计确保了真正的多人体验，通过共享锦标赛实例和智能匹配系统，为玩家提供了丰富的竞技和社交体验。同时支持多次参与和双重奖励系统，提高了玩家的参与度和游戏体验。 