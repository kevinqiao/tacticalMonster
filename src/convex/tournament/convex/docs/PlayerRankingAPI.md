# 玩家锦标赛排行API文档

## 📋 概述

玩家锦标赛排行API提供了一系列功能来获取玩家在锦标赛中的排行信息，包括个人排行、排行榜、统计信息、成就等。

## 🎯 核心功能

### 1. 获取玩家排行
获取指定玩家在锦标赛中的当前排行信息。

### 2. 获取排行榜
获取锦标赛的完整排行榜，支持分页和玩家信息。

### 3. 获取统计信息
获取玩家在锦标赛中的详细统计数据和表现趋势。

### 4. 获取成就
获取玩家在锦标赛中获得的成就。

## 📚 API接口

### 1. 获取玩家排行

#### 接口：`getPlayerRanking`
获取玩家在锦标赛中的排行信息。

**参数：**
- `tournamentId` (string): 锦标赛ID
- `uid` (string): 玩家ID
- `includeDetails` (boolean, 可选): 是否包含详细信息

**返回：**
```typescript
{
    success: boolean;
    data?: {
        uid: string;
        rank: number;           // 当前排名
        totalRank: number;      // 总参与人数
        score: number;          // 当前分数
        totalScore: number;     // 总分
        matchCount: number;     // 比赛场数
        bestScore: number;      // 最佳分数
        averageScore: number;   // 平均分数
        pointsEarned: number;   // 获得点数
        lastMatchAt?: string;   // 最后比赛时间
        details?: any;          // 详细信息
    };
    error?: string;
}
```

**使用示例：**
```typescript
import { api } from "../_generated/api";
import { useQuery } from "convex/react";

// 在React组件中使用
const playerRanking = useQuery(api.playerRankingAPI.getPlayerRanking, {
    tournamentId: "tournament_123",
    uid: "player_001",
    includeDetails: true
});

if (playerRanking?.success) {
    console.log(`玩家排名: ${playerRanking.data.rank}/${playerRanking.data.totalRank}`);
    console.log(`当前分数: ${playerRanking.data.score}`);
}
```

### 2. 获取锦标赛排行榜

#### 接口：`getTournamentLeaderboard`
获取锦标赛的完整排行榜。

**参数：**
- `tournamentId` (string): 锦标赛ID
- `limit` (number, 可选): 返回数量限制，默认50
- `offset` (number, 可选): 偏移量，默认0
- `includePlayerInfo` (boolean, 可选): 是否包含玩家信息

**返回：**
```typescript
{
    success: boolean;
    data?: {
        leaderboard: Array<{
            uid: string;
            rank: number;
            score: number;
            totalScore: number;
            matchCount: number;
            bestScore: number;
            averageScore: number;
            pointsEarned: number;
            lastMatchAt?: string;
            playerInfo?: any;
        }>;
        totalPlayers: number;
        tournamentInfo: any;
    };
    error?: string;
}
```

**使用示例：**
```typescript
// 获取前10名排行榜
const leaderboard = useQuery(api.playerRankingAPI.getTournamentLeaderboard, {
    tournamentId: "tournament_123",
    limit: 10,
    offset: 0,
    includePlayerInfo: true
});

if (leaderboard?.success) {
    leaderboard.data.leaderboard.forEach((player, index) => {
        console.log(`${index + 1}. ${player.playerInfo?.nickname}: ${player.score}分`);
    });
}
```

### 3. 获取玩家统计信息

#### 接口：`getPlayerTournamentStats`
获取玩家在锦标赛中的详细统计信息。

**参数：**
- `tournamentId` (string): 锦标赛ID
- `uid` (string): 玩家ID

**返回：**
```typescript
{
    success: boolean;
    data?: {
        uid: string;
        tournamentId: string;
        totalPoints: number;
        matchCount: number;
        bestScore: number;
        averageScore: number;
        rank: number;
        totalRank: number;
        matchHistory: Array<{
            matchId: string;
            score: number;
            rank: number;
            pointsEarned: number;
            completedAt: string;
            gameData?: any;
        }>;
        performanceTrend: Array<{
            matchNumber: number;
            score: number;
            rank: number;
            cumulativePoints: number;
        }>;
        achievements: Array<{
            type: string;
            name: string;
            description: string;
            earnedAt: string;
        }>;
    };
    error?: string;
}
```

**使用示例：**
```typescript
const playerStats = useQuery(api.playerRankingAPI.getPlayerTournamentStats, {
    tournamentId: "tournament_123",
    uid: "player_001"
});

if (playerStats?.success) {
    console.log(`总点数: ${playerStats.data.totalPoints}`);
    console.log(`比赛场数: ${playerStats.data.matchCount}`);
    console.log(`成就数量: ${playerStats.data.achievements.length}`);
}
```

### 4. 获取玩家成就

#### 接口：`getPlayerAchievements`
获取玩家在锦标赛中获得的成就。

**参数：**
- `tournamentId` (string): 锦标赛ID
- `uid` (string): 玩家ID

**返回：**
```typescript
{
    success: boolean;
    data?: {
        achievements: Array<{
            type: string;
            name: string;
            description: string;
            earnedAt: string;
        }>;
        totalAchievements: number;
    };
    error?: string;
}
```

**使用示例：**
```typescript
const achievements = useQuery(api.playerRankingAPI.getPlayerAchievements, {
    tournamentId: "tournament_123",
    uid: "player_001"
});

if (achievements?.success) {
    achievements.data.achievements.forEach(achievement => {
        console.log(`🏆 ${achievement.name}: ${achievement.description}`);
    });
}
```

### 5. 获取比赛历史

#### 接口：`getPlayerMatchHistory`
获取玩家在锦标赛中的比赛历史。

**参数：**
- `tournamentId` (string): 锦标赛ID
- `uid` (string): 玩家ID
- `limit` (number, 可选): 返回数量限制，默认20
- `offset` (number, 可选): 偏移量，默认0

**返回：**
```typescript
{
    success: boolean;
    data?: {
        matchHistory: Array<{
            matchId: string;
            score: number;
            rank: number;
            pointsEarned: number;
            completedAt: string;
            gameData?: any;
        }>;
        totalMatches: number;
        hasMore: boolean;
    };
    error?: string;
}
```

### 6. 获取表现趋势

#### 接口：`getPlayerPerformanceTrend`
获取玩家在锦标赛中的表现趋势数据。

**参数：**
- `tournamentId` (string): 锦标赛ID
- `uid` (string): 玩家ID

**返回：**
```typescript
{
    success: boolean;
    data?: {
        performanceTrend: Array<{
            matchNumber: number;
            score: number;
            rank: number;
            cumulativePoints: number;
        }>;
        totalMatches: number;
    };
    error?: string;
}
```

### 7. 获取排行榜前N名

#### 接口：`getTopPlayers`
获取锦标赛排行榜前N名。

**参数：**
- `tournamentId` (string): 锦标赛ID
- `topN` (number, 可选): 前N名，默认10
- `includePlayerInfo` (boolean, 可选): 是否包含玩家信息

**返回：**
```typescript
{
    success: boolean;
    data?: {
        topPlayers: Array<any>;
        totalPlayers: number;
        tournamentInfo: any;
    };
    error?: string;
}
```

### 8. 获取锦标赛统计摘要

#### 接口：`getTournamentStatsSummary`
获取锦标赛的统计摘要信息。

**参数：**
- `tournamentId` (string): 锦标赛ID

**返回：**
```typescript
{
    success: boolean;
    data?: {
        tournamentInfo: any;
        summary: {
            totalPlayers: number;
            totalScore: number;
            averageScore: number;
            totalMatches: number;
            averageMatches: number;
            scoreRanges: {
                "0-100": number;
                "101-500": number;
                "501-1000": number;
                "101-2000": number;
                "2000+": number;
            };
        };
        top3: Array<any>;
    };
    error?: string;
}
```

## 🎮 实际应用场景

### 1. 锦标赛排行榜页面

```typescript
import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../_generated/api";

const TournamentLeaderboard = ({ tournamentId }: { tournamentId: string }) => {
    const leaderboard = useQuery(api.playerRankingAPI.getTournamentLeaderboard, {
        tournamentId,
        limit: 20,
        includePlayerInfo: true
    });

    if (!leaderboard?.success) {
        return <div>加载中...</div>;
    }

    return (
        <div className="leaderboard">
            <h2>锦标赛排行榜</h2>
            <div className="leaderboard-list">
                {leaderboard.data.leaderboard.map((player, index) => (
                    <div key={player.uid} className="leaderboard-item">
                        <div className="rank">#{player.rank}</div>
                        <div className="player-info">
                            <img src={player.playerInfo?.avatar} alt="avatar" />
                            <span>{player.playerInfo?.nickname}</span>
                        </div>
                        <div className="score">{player.score}分</div>
                        <div className="matches">{player.matchCount}场</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

### 2. 玩家个人统计页面

```typescript
const PlayerStats = ({ tournamentId, uid }: { tournamentId: string; uid: string }) => {
    const stats = useQuery(api.playerRankingAPI.getPlayerTournamentStats, {
        tournamentId,
        uid
    });

    const achievements = useQuery(api.playerRankingAPI.getPlayerAchievements, {
        tournamentId,
        uid
    });

    if (!stats?.success) {
        return <div>加载中...</div>;
    }

    return (
        <div className="player-stats">
            <div className="stats-overview">
                <div className="stat-item">
                    <label>当前排名</label>
                    <value>{stats.data.rank}/{stats.data.totalRank}</value>
                </div>
                <div className="stat-item">
                    <label>总点数</label>
                    <value>{stats.data.totalPoints}</value>
                </div>
                <div className="stat-item">
                    <label>比赛场数</label>
                    <value>{stats.data.matchCount}</value>
                </div>
                <div className="stat-item">
                    <label>最佳分数</label>
                    <value>{stats.data.bestScore}</value>
                </div>
            </div>

            <div className="achievements">
                <h3>成就 ({achievements?.data?.totalAchievements || 0})</h3>
                {achievements?.data?.achievements.map(achievement => (
                    <div key={achievement.type} className="achievement">
                        <span className="name">{achievement.name}</span>
                        <span className="description">{achievement.description}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

### 3. 实时排行更新

```typescript
const LiveRanking = ({ tournamentId, uid }: { tournamentId: string; uid: string }) => {
    const ranking = useQuery(api.playerRankingAPI.getPlayerSimpleRanking, {
        tournamentId,
        uid
    });

    const trend = useQuery(api.playerRankingAPI.getPlayerRankingTrend, {
        tournamentId,
        uid,
        timeRange: "day"
    });

    return (
        <div className="live-ranking">
            <div className="current-rank">
                <h3>当前排名</h3>
                <div className="rank-number">#{ranking?.data?.rank}</div>
                <div className="total-players">共 {ranking?.data?.totalRank} 人参与</div>
            </div>

            <div className="trend-chart">
                <h3>今日趋势</h3>
                {/* 这里可以使用图表库显示趋势数据 */}
                {trend?.data?.map((point, index) => (
                    <div key={index} className="trend-point">
                        <span>{point.rank}</span>
                        <span>{point.score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

## 🔧 错误处理

所有API接口都返回统一的错误格式：

```typescript
{
    success: false,
    error: "错误描述信息"
}
```

常见错误类型：
- `"锦标赛不存在"` - 指定的锦标赛ID无效
- `"玩家未参与该锦标赛"` - 玩家未参与指定锦标赛
- `"获取排行失败"` - 其他系统错误

## 📊 性能优化建议

1. **使用简要排行接口** - 对于只需要基本排行信息的场景，使用 `getPlayerSimpleRanking`
2. **合理使用分页** - 排行榜数据使用 `limit` 和 `offset` 进行分页
3. **缓存玩家信息** - 对于频繁访问的玩家信息进行客户端缓存
4. **按需加载详细信息** - 只在需要时设置 `includeDetails: true`

## 🎯 总结

玩家锦标赛排行API提供了完整的排行功能，包括：

- ✅ 个人排行查询
- ✅ 完整排行榜
- ✅ 详细统计信息
- ✅ 成就系统
- ✅ 表现趋势分析
- ✅ 多锦标赛对比
- ✅ 统计摘要

这些功能可以满足各种锦标赛场景的需求，为玩家提供丰富的排行体验。 