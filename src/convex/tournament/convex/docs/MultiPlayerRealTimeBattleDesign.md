# 多人实时对战锦标赛设计文档

## 📋 概述

多人实时对战锦标赛是一种创新的锦标赛模式，允许多个玩家参与多场实时对战，每场比赛根据排名获得相应点数，累积点数决定最终排名。这种设计结合了实时对战的紧张感和累积排名的策略性。

## 🎯 核心概念

### 1. 累积点数排名
- **每场比赛获得点数**：根据单场比赛排名获得基础点数
- **额外奖励点数**：连胜、完美分数、快速获胜等特殊表现获得额外点数
- **累积总分排名**：所有比赛的点数累加作为最终排名依据

### 2. 比赛流程
```
玩家加入锦标赛 → 参与多场实时对战 → 每场获得排名和点数
    ↓
累积点数 → 实时更新排名 → 锦标赛结束 → 最终排名和奖励
```

### 3. 点数分配机制
- **基础点数**：根据单场比赛排名分配
- **奖励点数**：特殊表现获得额外点数
- **累积计算**：所有点数累加得到总分

## 🏗️ 技术实现

### 1. 排名方法支持

#### 修改 ruleEngine.ts
```typescript
// 支持 total_score 排名方法
else if (config.matchRules.rankingMethod === "total_score") {
    // 计算累积总分排名
    const playerScores = new Map<string, number>();
    for (const match of matches) {
        const currentScore = playerScores.get(match.uid) || 0;
        playerScores.set(match.uid, currentScore + match.score);
    }
    // ... 排名计算逻辑
}
```

#### 修改 calculatePlayerRankings 函数
```typescript
export async function calculatePlayerRankings(ctx: any, tournamentId: string, rankingMethod: string = "highest_score") {
    // 根据排名方法计算分数
    if (rankingMethod === "total_score") {
        // 累积总分排名
        for (const match of matches) {
            playerScores[match.uid].totalScore += match.score;
        }
        // 按总分排序
    }
    // ... 其他排名方法
}
```

### 2. 点数计算器

#### PointCalculator 类
```typescript
export class PointCalculator {
    // 根据比赛排名计算基础点数
    static calculateBasePoints(matchRank: number, specialRules: any[]): number {
        const pointsRule = specialRules?.find((rule: any) => rule.type === "points_per_match");
        const pointsMap = pointsRule?.value || defaultPoints;
        return pointsMap[`${matchRank}${this.getOrdinalSuffix(matchRank)}`] || 5;
    }

    // 计算额外奖励点数
    static calculateBonusPoints(gameData: any, specialRules: any[]): number {
        // 连胜奖励、完美分数、快速获胜等
    }

    // 计算总点数
    static calculateTotalPoints(matchRank: number, gameData: any, specialRules: any[]): number {
        const basePoints = this.calculateBasePoints(matchRank, specialRules);
        const bonusPoints = this.calculateBonusPoints(gameData, specialRules);
        return basePoints + bonusPoints;
    }
}
```

### 3. 专用处理器

#### multiPlayerRealTimeBattleHandler
```typescript
export const multiPlayerRealTimeBattleHandler: TournamentHandler = {
    // 验证加入条件
    validateJoin: async (ctx: any, params: { uid: string; tournamentType: any }) => {
        // 检查尝试次数限制
        const maxAttempts = tournamentType.matchRules?.maxAttempts || 10;
        // ... 验证逻辑
    },

    // 提交分数
    submitScore: async (ctx: any, args: SubmitScoreArgs) => {
        // 更新比赛记录，包含单场排名和获得点数
        await ctx.db.patch(submissionData.playerMatchId, {
            score,
            completed: true,
            playerGameData: {
                ...gameData,
                matchRank: gameData.matchRank || 1, // 单场比赛排名
                pointsEarned: gameData.pointsEarned || score, // 本场获得点数
                totalMatches: gameData.totalMatches || 1
            }
        });
    },

    // 结算锦标赛
    settle: async (ctx: any, tournamentId: string) => {
        // 使用累积总分排名
        const rankingMethod = tournament.config?.matchRules?.rankingMethod || "total_score";
        const sortedPlayers = await calculatePlayerRankings(ctx, tournamentId, rankingMethod);
        // ... 结算逻辑
    }
};
```

## ⚙️ 配置示例

### 多人实时对战锦标赛配置
```typescript
{
    typeId: "multi_player_real_time_battle",
    name: "多人实时对战锦标赛",
    description: "多人实时对战，每场比赛获得点数，累积点数决定最终排名",
    gameType: "rummy",
    isActive: true,
    priority: 4,

    matchRules: {
        matchType: "multi_match",           // 多场比赛
        minPlayers: 2,
        maxPlayers: 4,
        isSingleMatch: false,               // 不是单场比赛
        maxAttempts: 10,                    // 允许参加10场比赛
        allowMultipleAttempts: true,        // 允许多次尝试
        rankingMethod: "total_score",       // 累积总分排名
        timeLimit: {
            perMatch: 600,                  // 每场10分钟
            perTurn: 30                     // 每回合30秒
        },
        specialRules: [
            {
                type: "points_per_match",
                value: {
                    "1st": 100,             // 第一名100分
                    "2nd": 60,              // 第二名60分
                    "3rd": 30,              // 第三名30分
                    "4th": 10               // 第四名10分
                },
                description: "每场比赛根据排名获得相应点数"
            },
            {
                type: "bonus_points",
                value: {
                    "winning_streak": 20,   // 连胜奖励20分
                    "perfect_score": 50,    // 完美分数奖励50分
                    "quick_win": 30         // 快速获胜奖励30分
                },
                description: "特殊表现获得额外点数"
            }
        ]
    },

    rewards: {
        baseRewards: {
            coins: 300,
            gamePoints: 150,
            props: [],
            tickets: []
        },
        rankRewards: [
            {
                rankRange: [1, 1],
                multiplier: 5.0
            },
            {
                rankRange: [2, 3],
                multiplier: 3.0
            },
            {
                rankRange: [4, 10],
                multiplier: 2.0
            }
        ],
        // ... 其他奖励配置
    },

    limits: {
        maxParticipations: 1,
        maxTournaments: 1,
        maxAttempts: 10,
        subscribed: {
            maxParticipations: 1,
            maxTournaments: 1,
            maxAttempts: 15
        }
    }
}
```

## 📊 数据库结构

### player_matches 表扩展
```typescript
{
    matchId: Id<"matches">,
    tournamentId: Id<"tournaments">,
    tournamentType: "multi_player_real_time_battle",
    uid: "player123",
    gameType: "rummy",
    score: 150,                    // 本场比赛分数
    rank: 2,                       // 本场比赛排名
    completed: true,
    attemptNumber: 1,
    propsUsed: ["wild_card"],
    playerGameData: {
        matchRank: 2,              // 单场比赛排名
        pointsEarned: 60,          // 本场获得点数
        totalMatches: 3,           // 总比赛场数
        winningStreak: 2,          // 连胜次数
        perfectScore: false,       // 是否完美分数
        quickWin: true,            // 是否快速获胜
        matchDuration: 240         // 比赛时长（秒）
    },
    joinTime: "2024-01-01T10:00:00Z",
    leaveTime: "2024-01-01T10:04:00Z",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:04:00Z"
}
```

## 🔄 使用流程

### 1. 玩家加入锦标赛
```typescript
const result = await multiPlayerRealTimeBattleHandler.join(ctx, {
    uid: "player123",
    gameType: "rummy",
    typeId: "multi_player_real_time_battle"
});
```

### 2. 提交单场比赛分数
```typescript
const result = await multiPlayerRealTimeBattleHandler.submitScore(ctx, {
    tournamentId: "tournament123",
    uid: "player123",
    gameType: "rummy",
    score: 150,
    gameData: {
        matchRank: 2,              // 本场排名第2
        pointsEarned: 60,          // 获得60点
        winningStreak: 2,          // 2连胜
        quickWin: true,            // 快速获胜
        matchDuration: 240         // 4分钟完成
    },
    propsUsed: ["wild_card"]
});
```

### 3. 计算累积点数
```typescript
const playerPoints = await calculatePlayerTournamentPoints(ctx, "tournament123", "player123");
console.log(`总点数: ${playerPoints.totalPoints}`);
console.log(`比赛场数: ${playerPoints.matchCount}`);
console.log(`平均点数: ${playerPoints.averageScore}`);
```

### 4. 锦标赛结算
```typescript
await multiPlayerRealTimeBattleHandler.settle(ctx, "tournament123");
// 自动计算累积总分排名并分配奖励
```

## 🎮 游戏体验

### 优势
1. **策略性**：玩家需要平衡参与场次和单场表现
2. **公平性**：累积点数确保长期表现的重要性
3. **刺激性**：每场比赛都有即时反馈
4. **社交性**：多人实时对战增加互动性

### 注意事项
1. **时间管理**：需要合理分配比赛时间
2. **策略选择**：是否追求连胜还是稳定表现
3. **资源消耗**：道具使用需要权衡成本效益

## 🔧 扩展功能

### 1. 实时排行榜
- 实时更新玩家累积点数
- 显示当前排名和与前后名的差距

### 2. 连胜系统
- 连胜奖励递增
- 连胜中断保护机制

### 3. 特殊事件
- 双倍点数时段
- 特殊奖励挑战

### 4. 团队模式
- 团队累积点数
- 团队排名奖励

这个设计为多人实时对战锦标赛提供了完整的解决方案，支持累积点数排名，为玩家提供丰富的游戏体验。 