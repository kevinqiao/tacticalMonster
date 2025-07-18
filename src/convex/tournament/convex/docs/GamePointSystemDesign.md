# 游戏点数系统设计文档

## 📋 概述

游戏点数系统是锦标赛系统的核心组件，负责计算、累积和管理玩家在锦标赛中的点数。每场比赛根据排名获得相应点数，累积点数决定最终排名，这种设计确保了公平性和策略性。

## 🎯 核心概念

### 1. 点数计算机制
- **基础点数**：根据单场比赛排名分配
- **奖励点数**：特殊表现获得额外点数
- **累积计算**：所有点数累加得到总分
- **实时更新**：每场比赛后立即更新点数

### 2. 数据库结构

#### player_tournaments 表扩展
```typescript
{
    uid: string,                    // 玩家ID
    tournamentId: Id<"tournaments">, // 锦标赛ID
    tournamentType: string,         // 锦标赛类型
    gameType: string,              // 游戏类型
    status: "active" | "completed" | "withdrawn" | "disqualified", // 参与状态
    gamePoint: number,             // 累积的比赛点数
    matchCount: number,            // 参与的比赛场数
    bestScore: number,             // 最佳单场分数
    averageScore: number,          // 平均分数
    lastMatchAt: string,           // 最后一场比赛时间
    joinedAt: string,              // 加入时间
    createdAt: string,
    updatedAt: string
}
```

#### game_point_changes 表
```typescript
{
    uid: string,                   // 玩家ID
    tournamentId: Id<"tournaments">, // 锦标赛ID
    matchId: Id<"matches">,        // 比赛ID
    oldGamePoint: number,          // 更新前点数
    newGamePoint: number,          // 更新后点数
    pointsEarned: number,          // 本次获得点数
    matchRank: number,             // 比赛排名
    totalPlayers: number,          // 参与人数
    score: number,                 // 比赛分数
    gameData: any,                 // 游戏数据
    timestamp: string,             // 时间戳
    createdAt: string
}
```

## 🏗️ 系统架构

### 1. 核心服务

#### GamePointService
```typescript
export class GamePointService {
    // 计算基础点数
    static calculateBasePoints(matchRank: number, totalPlayers: number, specialRules?: any[]): number
    
    // 计算奖励点数
    static calculateBonusPoints(gameData: any, specialRules?: any[]): number
    
    // 计算总点数
    static calculateTotalPoints(matchRank: number, totalPlayers: number, gameData: any, specialRules?: any[]): number
    
    // 更新玩家点数
    static async updatePlayerGamePoints(ctx: any, params: UpdateParams): Promise<UpdateResult>
    
    // 批量更新点数
    static async batchUpdateGamePoints(ctx: any, params: BatchUpdateParams): Promise<BatchUpdateResult[]>
    
    // 获取玩家统计
    static async getPlayerGamePointStats(ctx: any, params: StatsParams): Promise<PlayerStats>
    
    // 获取排行榜
    static async getGamePointLeaderboard(ctx: any, params: LeaderboardParams): Promise<LeaderboardEntry[]>
}
```

### 2. API 接口

#### 查询接口
- `getPlayerGamePointStats`: 获取玩家点数统计
- `getGamePointLeaderboard`: 获取点数排行榜
- `getPointsDescription`: 获取点数分配说明
- `validatePointsRules`: 验证点数分配规则
- `calculateMatchPoints`: 计算单场比赛点数
- `getPlayerPointHistory`: 获取玩家点数历史
- `getTournamentPointOverview`: 获取锦标赛点数概览

#### 修改接口
- `updatePlayerGamePoints`: 更新玩家点数
- `batchUpdateGamePoints`: 批量更新点数
- `resetPlayerGamePoints`: 重置玩家点数

## 🎮 点数计算规则

### 1. 基础点数计算

#### 默认规则
```typescript
// 基于排名和参与人数的动态计算
const basePoints = Math.max(1, Math.floor(100 / matchRank));
const participationBonus = Math.min(20, Math.floor(totalPlayers / 10));
return basePoints + participationBonus;
```

#### 自定义规则
```typescript
// 通过 specialRules 配置
{
    type: "points_per_match",
    value: {
        "1st": 100,
        "2nd": 60,
        "3rd": 30,
        "4th": 10
    }
}
```

### 2. 奖励点数计算

#### 奖励类型
```typescript
{
    type: "bonus_points",
    value: {
        winning_streak: 20,      // 连胜奖励
        perfect_score: 50,       // 完美分数
        quick_win: 30,           // 快速获胜
        high_score: 25,          // 高分奖励
        participation: 15        // 参与奖励
    }
}
```

#### 触发条件
- **连胜奖励**：连续获胜3场或以上
- **完美分数**：达到完美分数标准
- **快速获胜**：5分钟内完成比赛
- **高分奖励**：单场分数超过1000
- **参与奖励**：参与5场或以上比赛

### 3. 总点数计算
```typescript
const totalPoints = basePoints + bonusPoints;
```

## 🔄 更新流程

### 1. 单场比赛点数更新
```typescript
// 1. 计算点数
const pointsEarned = GamePointService.calculateTotalPoints(
    matchRank, totalPlayers, gameData, specialRules
);

// 2. 更新统计数据
const newGamePoint = oldGamePoint + pointsEarned;
const newMatchCount = oldMatchCount + 1;
const newBestScore = Math.max(oldBestScore, score);
const newAverageScore = (oldTotalScore + score) / newMatchCount;

// 3. 更新数据库
await ctx.db.patch(playerTournament._id, {
    gamePoint: newGamePoint,
    matchCount: newMatchCount,
    bestScore: newBestScore,
    averageScore: newAverageScore,
    lastMatchAt: now.iso,
    updatedAt: now.iso
});

// 4. 记录变化日志
await ctx.db.insert("game_point_changes", {
    uid, tournamentId, matchId,
    oldGamePoint, newGamePoint, pointsEarned,
    matchRank, totalPlayers, score, gameData,
    timestamp: now.iso, createdAt: now.iso
});
```

### 2. 批量更新流程
```typescript
// 用于多人比赛同时结算
const results = await GamePointService.batchUpdateGamePoints(ctx, {
    tournamentId,
    matchId,
    playerResults: [
        { uid: "player1", rank: 1, score: 150, gameData: {...} },
        { uid: "player2", rank: 2, score: 120, gameData: {...} },
        { uid: "player3", rank: 3, score: 90, gameData: {...} }
    ],
    specialRules
});
```

## 📊 排名系统集成

### 1. 修改排名计算
```typescript
export async function calculatePlayerRankings(ctx: any, tournamentId: string, rankingMethod: string = "highest_score") {
    // 获取参与玩家
    const playerTournaments = await ctx.db
        .query("player_tournaments")
        .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
        .filter((q: any) => q.eq(q.field("status"), "active"))
        .collect();

    if (rankingMethod === "total_score") {
        // 使用累积点数排名
        for (const pt of playerTournaments) {
            playerScores[pt.uid] = {
                totalScore: pt.gamePoint || 0,
                matchCount: pt.matchCount || 0,
                bestScore: pt.bestScore || 0,
                averageScore: pt.averageScore || 0,
                lastMatchAt: pt.lastMatchAt
            };
        }
    }
    // ... 其他排名方法
}
```

### 2. 支持的排名方法
- **total_score**: 累积点数排名
- **highest_score**: 最高分数排名
- **average_score**: 平均分数排名
- **best_of_attempts**: 最佳尝试排名

## 🎯 使用示例

### 1. 锦标赛配置
```typescript
const tournamentConfig = {
    typeId: "multi_player_real_time_battle",
    name: "多人实时对战锦标赛",
    gameType: "rummy",
    config: {
        matchRules: {
            rankingMethod: "total_score",
            specialRules: [
                {
                    type: "points_per_match",
                    value: {
                        "1st": 100,
                        "2nd": 60,
                        "3rd": 30,
                        "4th": 10
                    }
                },
                {
                    type: "bonus_points",
                    value: {
                        winning_streak: 20,
                        perfect_score: 50,
                        quick_win: 30,
                        high_score: 25,
                        participation: 15
                    }
                }
            ]
        }
    }
};
```

### 2. 比赛结算
```typescript
// 提交比赛结果
const result = await multiPlayerRealTimeBattleHandler.submitScore(ctx, {
    tournamentId: "tournament123",
    uid: "player123",
    gameType: "rummy",
    score: 150,
    gameData: {
        matchRank: 2,              // 本场排名第2
        totalPlayers: 4,           // 4人参与
        winningStreak: 2,          // 2连胜
        quickWin: true,            // 快速获胜
        matchDuration: 240,        // 4分钟完成
        matchCount: 3              // 第3场比赛
    },
    propsUsed: ["wild_card"]
});

// 自动更新点数
// 基础点数: 60 (第2名)
// 奖励点数: 30 (快速获胜) + 25 (高分奖励) = 55
// 总点数: 115
```

### 3. 查询排行榜
```typescript
// 获取点数排行榜
const leaderboard = await getGamePointLeaderboard({
    tournamentId: "tournament123",
    limit: 10,
    offset: 0
});

// 获取玩家统计
const playerStats = await getPlayerGamePointStats({
    tournamentId: "tournament123",
    uid: "player123"
});

// 获取点数历史
const history = await getPlayerPointHistory({
    tournamentId: "tournament123",
    uid: "player123",
    limit: 20
});
```

## 🔧 性能优化

### 1. 索引优化
```typescript
// player_tournaments 表索引
.index("by_tournament_gamePoint", ["tournamentId", "gamePoint"])
.index("by_tournament_matchCount", ["tournamentId", "matchCount"])
.index("by_tournament_bestScore", ["tournamentId", "bestScore"])

// game_point_changes 表索引
.index("by_uid_tournament", ["uid", "tournamentId"])
.index("by_timestamp", ["timestamp"])
.index("by_uid_timestamp", ["uid", "timestamp"])
```

### 2. 缓存策略
- 排行榜缓存：定期更新排行榜缓存
- 玩家统计缓存：玩家统计信息缓存
- 点数计算缓存：常用计算结果的缓存

### 3. 批量操作
- 批量更新点数：减少数据库操作次数
- 批量查询：优化排行榜查询性能
- 异步处理：非关键操作异步处理

## 🛡️ 数据一致性

### 1. 事务处理
```typescript
// 确保点数更新和日志记录的原子性
const result = await GamePointService.updatePlayerGamePoints(ctx, {
    uid, tournamentId, matchId, matchRank, totalPlayers, score, gameData, specialRules
});
```

### 2. 数据验证
```typescript
// 验证点数分配规则
const validation = GamePointService.validatePointsRules(specialRules);
if (!validation.valid) {
    throw new Error(`点数规则验证失败: ${validation.errors.join(", ")}`);
}
```

### 3. 错误处理
```typescript
try {
    const result = await updatePlayerGamePoints(params);
    return result;
} catch (error) {
    console.error("更新玩家点数失败:", error);
    // 记录错误日志
    await ctx.db.insert("error_logs", {
        error: error.message,
        context: "game_point_update",
        uid: params.uid,
        createdAt: now.iso
    });
    throw error;
}
```

## 📈 监控和分析

### 1. 关键指标
- 点数分布统计
- 玩家参与度分析
- 排行榜变化趋势
- 系统性能指标

### 2. 日志记录
- 点数变化日志
- 错误日志
- 性能日志
- 用户行为日志

### 3. 报表功能
- 锦标赛点数报表
- 玩家表现分析
- 系统使用统计
- 异常情况报告

## 🚀 扩展功能

### 1. 动态点数调整
- 根据参与人数动态调整点数
- 基于时间段的点数倍率
- 特殊事件的点数奖励

### 2. 团队点数系统
- 团队累积点数
- 团队排名奖励
- 团队协作奖励

### 3. 成就系统集成
- 点数相关成就
- 连胜成就
- 参与度成就

### 4. 社交功能
- 点数分享
- 排行榜分享
- 成就炫耀

## 📝 总结

游戏点数系统为锦标赛提供了公平、透明、可扩展的排名机制。通过合理的点数分配和累积计算，确保了比赛的公平性，同时为玩家提供了丰富的游戏体验。系统的模块化设计使得扩展和维护变得简单，为未来的功能增强奠定了坚实的基础。 