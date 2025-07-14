# 多人独立游戏锦标赛设计文档

## 概述

多人独立游戏锦标赛（Multi-Player Independent Games Tournament）是一种创新的锦标赛模式，允许多个玩家参与同一场比赛，但每个玩家玩的是独立的游戏实例。这种设计结合了多人参与的社交性和单人游戏的专注性。

## 核心概念

### 1. 共享比赛，独立游戏
- **同一场比赛**：多个玩家参与同一个比赛实例
- **独立游戏**：每个玩家有自己独立的游戏实例
- **同步开始**：所有玩家同时开始游戏
- **独立计分**：每个玩家根据自己的游戏成绩获得分数

### 2. 智能匹配系统
- **技能匹配**：根据玩家技能水平进行匹配
- **容量管理**：控制每场比赛的玩家数量（2-6人）
- **等待时间**：最多等待3分钟开始游戏
- **AI回退**：如果匹配失败，使用AI玩家填充

### 3. 社交互动功能
- **进度显示**：可以看到其他玩家的游戏进度
- **实时排名**：实时显示当前排名
- **社交元素**：增强游戏的社交体验
- **无干扰设计**：不干扰玩家的游戏体验

### 4. 灵活的游戏配置
- **游戏变体**：支持多种游戏变体（经典、蜘蛛、金字塔等）
- **难度等级**：可配置游戏难度
- **时间限制**：可设置游戏时间限制
- **随机种子**：可选择是否使用相同的随机种子

## 配置示例

```typescript
{
    typeId: "multi_player_independent_games_tournament",
    name: "多人独立游戏锦标赛",
    description: "与其他玩家在同一场比赛中竞争，但每个人玩独立的游戏",
    category: "competitive",
    gameType: "solitaire",
    isActive: true,
    priority: 1,

    entryRequirements: {
        minSegment: "bronze",
        isSubscribedRequired: false,
        entryFee: {
            coins: 35
        }
    },

    matchRules: {
        matchType: "multi_player_independent_games",
        minPlayers: 2,
        maxPlayers: 6,
        isSingleMatch: true,
        maxAttempts: 5,
        allowMultipleAttempts: true,
        rankingMethod: "best_score",
        independentGames: {
            enabled: true,
            gameType: "solitaire",
            difficulty: "medium",
            timeLimit: 600, // 10分钟
            sharedSeed: false, // 每个玩家使用不同的随机种子
            synchronizedStart: true // 同时开始游戏
        }
    },

    rewards: {
        baseRewards: {
            coins: 80,
            gamePoints: 40,
            props: [],
            tickets: []
        },
        rankRewards: [
            {
                rankRange: [1, 1],
                multiplier: 2.5
            },
            {
                rankRange: [2, 3],
                multiplier: 1.8
            },
            {
                rankRange: [4, 5],
                multiplier: 1.3
            }
        ],
        perMatchRewards: {
            enabled: true,
            basePoints: 8,
            scoreMultiplier: 0.08,
            minPoints: 4,
            maxPoints: 40,
            bonusConditions: [
                {
                    type: "score_threshold",
                    value: 1200,
                    bonusPoints: 15
                },
                {
                    type: "perfect_score",
                    value: 1800,
                    bonusPoints: 30
                }
            ]
        }
    },

    advanced: {
        matching: {
            algorithm: "skill_based",
            maxPlayersPerMatch: 6,
            minPlayersToStart: 2,
            maxWaitTime: 180, // 3分钟等待时间
            fallbackToAI: true
        },
        independentGames: {
            gameVariants: ["classic", "spider", "pyramid"],
            difficultyLevels: ["easy", "medium", "hard"],
            timeSync: true, // 时间同步
            progressTracking: true, // 进度跟踪
            socialFeatures: {
                showOtherPlayers: true,
                allowChat: false,
                showProgress: true
            }
        }
    }
}
```

## 实现流程

### 1. 加入锦标赛
```typescript
// 查找或创建共享的多人锦标赛
const tournament = await findOrCreateMultiPlayerIndependentGamesTournament(ctx, {
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

// 为每个玩家创建独立的游戏实例
const independentGameResult = await createIndependentGameInstance(ctx, {
    uid,
    matchId: matchResult.matchId,
    tournamentId: tournament._id,
    gameType,
    config: tournamentTypeConfig,
    player,
    now
});
```

### 2. 创建独立游戏实例
```typescript
// 生成独立的游戏配置
const independentGameConfig = {
    gameType,
    difficulty: config.matchRules?.independentGames?.difficulty || "medium",
    timeLimit: config.matchRules?.independentGames?.timeLimit || 600,
    sharedSeed: config.matchRules?.independentGames?.sharedSeed || false,
    synchronizedStart: config.matchRules?.independentGames?.synchronizedStart || true,
    playerUid: uid,
    matchId,
    tournamentId,
    // 为每个玩家生成独立的随机种子
    randomSeed: config.matchRules?.independentGames?.sharedSeed ? 
        `shared_${matchId}` : 
        `player_${uid}_${Date.now()}`,
    // 游戏变体（如果有配置）
    gameVariant: config.advanced?.independentGames?.gameVariants?.[0] || "classic"
};

// 创建独立的游戏实例
const gameId = `independent_game_${matchId}_${uid}_${Date.now()}`;
const serverUrl = `https://game-server.example.com/independent/${gameId}`;
```

### 3. 分数提交和奖励
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

## 数据库结构

### tournaments 表
```typescript
{
    _id: Id<"tournaments">,
    seasonId: Id<"seasons">,
    gameType: "solitaire",
    segmentName: "bronze",
    status: "open",
    tournamentType: "multi_player_independent_games_tournament",
    isSubscribedRequired: false,
    isSingleMatch: true,  // 多人单场比赛
    prizePool: 28,        // 入场费 * 0.8
    config: {
        // ... 标准配置
        multiPlayerIndependentGames: {
            maxPlayersPerMatch: 6,
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
    matchType: "tournament_match",
    status: "in_progress",  // 比赛进行中
    maxPlayers: 6,
    minPlayers: 2,
    currentPlayers: 4,
    gameData: {
        matchType: "tournament_based",
        createdAt: "2024-01-01T00:00:00.000Z",
        matchingAlgorithm: "skill_based"
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
    score: 1350,
    rank: 2,
    completed: true,
    attemptNumber: 1,
    propsUsed: ["hint"],
    playerGameData: {
        moves: 92,
        timeTaken: 480,
        gameVariant: "classic",
        difficulty: "medium"
    },
    joinTime: "2024-01-01T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:08:00.000Z"
}
```

### match_events 表（新增事件类型）
```typescript
{
    _id: Id<"match_events">,
    matchId: Id<"matches">,
    tournamentId: Id<"tournaments">,
    uid: "user123",
    eventType: "independent_game_created",
    eventData: {
        gameId: "independent_game_match123_user123_1704067200000",
        serverUrl: "https://game-server.example.com/independent/independent_game_match123_user123_1704067200000",
        independentGameConfig: {
            gameType: "solitaire",
            difficulty: "medium",
            timeLimit: 600,
            sharedSeed: false,
            synchronizedStart: true,
            playerUid: "user123",
            matchId: "match123",
            tournamentId: "tournament456",
            randomSeed: "player_user123_1704067200000",
            gameVariant: "classic"
        },
        playerUid: "user123"
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z"
}
```

## 关键函数

### createIndependentGameInstance
```typescript
async function createIndependentGameInstance(ctx: any, params: {
    uid: string;
    matchId: string;
    tournamentId: string;
    gameType: string;
    config: any;
    player: any;
    now: any;
}) {
    // 生成独立的游戏配置
    const independentGameConfig = {
        gameType,
        difficulty: config.matchRules?.independentGames?.difficulty || "medium",
        timeLimit: config.matchRules?.independentGames?.timeLimit || 600,
        sharedSeed: config.matchRules?.independentGames?.sharedSeed || false,
        synchronizedStart: config.matchRules?.independentGames?.synchronizedStart || true,
        playerUid: uid,
        matchId,
        tournamentId,
        // 为每个玩家生成独立的随机种子
        randomSeed: config.matchRules?.independentGames?.sharedSeed ? 
            `shared_${matchId}` : 
            `player_${uid}_${Date.now()}`,
        // 游戏变体（如果有配置）
        gameVariant: config.advanced?.independentGames?.gameVariants?.[0] || "classic"
    };

    // 创建独立的游戏实例
    const gameId = `independent_game_${matchId}_${uid}_${Date.now()}`;
    const serverUrl = `https://game-server.example.com/independent/${gameId}`;

    // 记录独立游戏创建事件
    await ctx.db.insert("match_events", {
        matchId,
        tournamentId,
        uid,
        eventType: "independent_game_created",
        eventData: {
            gameId,
            serverUrl,
            independentGameConfig,
            playerUid: uid
        },
        timestamp: now.iso,
        createdAt: now.iso,
    });

    return {
        gameId,
        serverUrl,
        config: independentGameConfig
    };
}
```

## 使用场景

### 1. 技能竞技
- 玩家在相同条件下进行技能比拼
- 可以看到其他玩家的进度和成绩
- 增加竞争的紧张感和刺激性

### 2. 社交游戏
- 与朋友一起参与同一场比赛
- 实时比较成绩和进度
- 增强游戏的社交元素

### 3. 公平竞争
- 每个玩家有独立的游戏环境
- 避免其他玩家的干扰
- 确保竞争的公平性

### 4. 多样化体验
- 支持多种游戏变体
- 可配置不同的难度等级
- 提供丰富的游戏体验

## 优势

### 1. 平衡的体验
- **社交性**：可以看到其他玩家，增加互动
- **专注性**：每个玩家有独立的游戏环境
- **公平性**：避免其他玩家的直接干扰

### 2. 灵活的配置
- **游戏变体**：支持多种游戏类型
- **难度设置**：可配置不同的难度等级
- **时间控制**：可设置游戏时间限制

### 3. 智能匹配
- **技能匹配**：根据玩家水平进行匹配
- **快速开始**：减少等待时间
- **AI回退**：确保游戏能够开始

### 4. 丰富的奖励
- **即时奖励**：每场比赛都有积分奖励
- **排名奖励**：根据最终排名获得额外奖励
- **成就系统**：支持各种成就和里程碑

## 与其他模式的对比

| 特性 | 单人锦标赛 | 多人单场比赛 | 多人独立游戏锦标赛 |
|------|------------|--------------|-------------------|
| 玩家数量 | 1人 | 多人 | 多人 |
| 游戏环境 | 独立 | 共享 | 独立 |
| 社交互动 | 无 | 丰富 | 中等 |
| 竞争强度 | 低 | 高 | 中等 |
| 公平性 | 高 | 中等 | 高 |
| 复杂度 | 低 | 高 | 中等 |

## 技术实现要点

### 1. 游戏实例管理
- 为每个玩家创建独立的游戏实例
- 管理游戏实例的生命周期
- 处理游戏实例的创建和销毁

### 2. 同步机制
- 实现游戏开始的时间同步
- 处理玩家进度的实时更新
- 管理比赛状态的同步

### 3. 事件系统
- 记录独立游戏创建事件
- 跟踪玩家进度变化
- 处理比赛状态变更

### 4. 匹配算法
- 实现基于技能的匹配
- 处理等待时间和容量管理
- 支持AI玩家回退机制

## 总结

多人独立游戏锦标赛为玩家提供了一种独特的游戏体验，既保持了多人参与的社交性，又确保了单人游戏的专注性和公平性。通过灵活的配置和智能的匹配系统，可以为不同类型的玩家提供合适的游戏环境，同时支持丰富的奖励机制和社交功能。

这种设计特别适合那些希望与朋友一起游戏但又不想被其他玩家直接干扰的场景，为游戏平台提供了更多的可能性。 