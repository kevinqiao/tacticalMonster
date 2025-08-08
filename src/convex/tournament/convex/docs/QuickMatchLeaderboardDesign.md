# 快速对局排行榜系统设计文档

## 概述

基于`tournamentConfig.ts`配置的快速对局系统，通过积分累积实现每日和每周排行榜，并在排行榜结算时发放rankPoints和seasonPoints奖励给玩家。

## 系统架构

### 核心组件

1. **快速对局配置** (`tournamentConfigs.ts`)
   - `quick_match_solitaire_free`: 免费快速对局
   - `quick_match_solitaire_ticket`: 门票快速对局

2. **排行榜系统** (`leaderboardSystem.ts`)
   - 积分累积逻辑
   - 排行榜查询功能
   - 奖励发放机制

3. **数据库Schema** (`leaderboardSchema.ts`)
   - 积分累积表
   - 排行榜结算表
   - 玩家统计表

4. **API接口** (`leaderboards.ts`)
   - 积分累积接口
   - 排行榜查询接口
   - 奖励领取接口

## 快速对局配置

### 免费快速对局

```typescript
{
    typeId: "quick_match_solitaire_free",
    name: "Solitaire快速对局(免费)",
    description: "2-4人Solitaire快速对局，免费模式，积分累积用于排行榜",
    gameType: "solitaire",
    isActive: true,
    priority: 1,
    timeRange: "continuous",

    entryRequirements: {
        isSubscribedRequired: false,
        entryFee: { coins: 0 } // 免费参与
    },

    matchRules: {
        matchType: "single_match",
        minPlayers: 2,
        maxPlayers: 4,
        rankingMethod: "highest_score",
        matchPoints: {
            "1": 3, // 第1名获得3分
            "2": 2, // 第2名获得2分
            "3": 1, // 第3名获得1分
            "4": 0  // 第4名获得0分
        },
        timeLimit: {
            perMatch: 300, // 5分钟
            total: 300
        }
    },

    rewards: {
        baseRewards: {
            coins: 5, // 参与奖励
            seasonPoints: 0 // 不直接给seasonPoints，通过排行榜获得
        },
        rankRewards: [
            { rankRange: [1, 1], multiplier: 1.0 },
            { rankRange: [2, 2], multiplier: 0.5 },
            { rankRange: [3, 4], multiplier: 0.0 }
        ],
        participationReward: {
            coins: 5,
            gamePoints: 0
        }
    },

    limits: {
        maxParticipations: 10, // 每日10局免费
        maxTournaments: 1,
        maxAttempts: 10,
        subscribed: {
            maxParticipations: 15,
            maxTournaments: 1,
            maxAttempts: 15
        }
    }
}
```

### 门票快速对局

```typescript
{
    typeId: "quick_match_solitaire_ticket",
    name: "Solitaire快速对局(门票)",
    description: "2-4人Solitaire快速对局，门票模式，积分累积用于排行榜",
    gameType: "solitaire",
    isActive: true,
    priority: 2,
    timeRange: "continuous",

    entryRequirements: {
        isSubscribedRequired: false,
        entryFee: {
            coins: 10, // 门票费用
            tickets: {
                type: "bronze",
                quantity: 1
            }
        }
    },

    matchRules: {
        matchType: "single_match",
        minPlayers: 2,
        maxPlayers: 4,
        rankingMethod: "highest_score",
        matchPoints: {
            "1": 3, // 第1名获得3分
            "2": 2, // 第2名获得2分
            "3": 1, // 第3名获得1分
            "4": 0  // 第4名获得0分
        },
        timeLimit: {
            perMatch: 300, // 5分钟
            total: 300
        }
    },

    rewards: {
        baseRewards: {
            coins: 10, // 参与奖励
            seasonPoints: 0 // 不直接给seasonPoints，通过排行榜获得
        },
        rankRewards: [
            { rankRange: [1, 1], multiplier: 1.0 },
            { rankRange: [2, 2], multiplier: 0.5 },
            { rankRange: [3, 4], multiplier: 0.0 }
        ],
        participationReward: {
            coins: 10,
            gamePoints: 0
        }
    },

    limits: {
        maxParticipations: 5, // 每日5局门票
        maxTournaments: 1,
        maxAttempts: 5,
        subscribed: {
            maxParticipations: 8,
            maxTournaments: 1,
            maxAttempts: 8
        }
    }
}
```

## 积分累积机制

### matchPoints积分系统

每局快速对局完成后，根据玩家在局内的排名获得对应的积分：

| 排名 | 获得积分 | 说明 |
|------|----------|------|
| 第1名 | 3分 | 胜利者获得最高积分 |
| 第2名 | 2分 | 亚军获得中等积分 |
| 第3名 | 1分 | 季军获得基础积分 |
| 第4名 | 0分 | 最后一名无积分 |

### 每日积分累积

1. **触发时机**: 快速对局完成后
2. **累积内容**: 
   - `totalScore`: 累积的总积分（基于matchPoints）
   - `matchesPlayed`: 参与的对局数
   - `matchesWon`: 胜利的对局数（第1名算胜利）
   - `winRate`: 胜率

3. **数据表**: `daily_leaderboard_points`

### 每周积分累积

1. **触发时机**: 快速对局完成后
2. **累积内容**: 
   - `totalScore`: 累积的总积分（基于matchPoints）
   - `matchesPlayed`: 参与的对局数
   - `matchesWon`: 胜利的对局数（第1名算胜利）
   - `winRate`: 胜率

3. **数据表**: `weekly_leaderboard_points`

### LeaderboardEntry结构

```typescript
interface LeaderboardEntry {
    uid: string;
    username: string;
    totalScore: number; // 累积的总积分
    matchesPlayed: number; // 参与的对局数
    rank: number; // 当前排名
}
```

### 积分计算示例

```typescript
// 玩家A参与3局快速对局
// 第1局：排名第1，获得3积分
// 第2局：排名第2，获得2积分  
// 第3局：排名第1，获得3积分
// 累积总积分：3 + 2 + 3 = 8积分

// 玩家B参与2局快速对局
// 第1局：排名第3，获得1积分
// 第2局：排名第4，获得0积分
// 累积总积分：1 + 0 = 1积分

// 排行榜按累积总积分排序：玩家A(8积分) > 玩家B(1积分)
```

## 排行榜奖励机制

### 每日排行榜奖励

| 排名范围 | rankPoints | seasonPoints | coins |
|----------|------------|--------------|-------|
| 第1名 | 100 | 200 | 200 |
| 第2名 | 50 | 100 | 100 |
| 第3名 | 25 | 50 | 50 |
| 第4名 | 10 | 20 | 20 |
| 第5-10名 | 5 | 10 | 10 |

### 每周排行榜奖励

| 排名范围 | rankPoints | seasonPoints | coins |
|----------|------------|--------------|-------|
| 第1名 | 500 | 1000 | 1000 |
| 第2名 | 250 | 500 | 500 |
| 第3名 | 100 | 250 | 250 |
| 第4名 | 50 | 100 | 100 |
| 第5-10名 | 25 | 50 | 50 |
| 第11-20名 | 10 | 20 | 20 |

### 奖励配置结构

```typescript
interface LeaderboardReward {
    rankRange: number[]; // [minRank, maxRank] 排名范围
    rankPoints: number;
    seasonPoints: number;
    coins: number;
}

interface LeaderboardConfig {
    leaderboardType: "daily" | "weekly";
    gameType: string;
    isActive: boolean;
    resetTime: string;
    resetDay?: number;
    rewards: LeaderboardReward[]; // 直接使用奖励数组，按rankRange排序
}
```

### 奖励匹配逻辑

```typescript
// 根据排名查找匹配的奖励配置
for (const rewardItem of config.rewards) {
    if (rewardItem && rank >= rewardItem.rankRange[0] && rank <= rewardItem.rankRange[1]) {
        reward = rewardItem;
        break;
    }
}
```

### 设计优势

1. **统一排名**: 所有玩家按积分统一排名，不分免费和门票用户
2. **灵活范围**: 使用`rankRange`定义排名范围，支持如`[5, 10]`这样的范围奖励
3. **简化配置**: 直接使用数组配置，避免复杂的嵌套结构
4. **扩展性**: 可以轻松添加新的排名范围和奖励配置
5. **公平竞争**: 所有玩家在同一个排行榜中公平竞争

### 积分累积参数

```typescript
// 积分累积方法参数
interface AccumulatePointsParams {
    uid: string;           // 玩家ID
    gameType: string;      // 游戏类型
    tournamentType: string; // 锦标赛类型
    score: number;         // 要累积的积分
}
```

### 积分累积流程

1. **快速对局完成** → 获取玩家在局内的排名
2. **计算积分** → 根据排名从`tournamentConfig.matchRules.matchPoints`获取对应积分
3. **累积积分** → 更新`totalScore`和`matchesPlayed`
4. **数据库记录** → 保存到`daily_leaderboard_points`或`weekly_leaderboard_points`

### API接口

```typescript
// 累积每日积分
accumulateDailyPoints(params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    score: number;
})

// 累积每周积分
accumulateWeeklyPoints(params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    score: number;
})

// 快速对局完成后累积积分
accumulatePointsAfterQuickMatch(params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    score: number;
})
```

### 排行榜查询接口

1. **获取每日排行榜**
   ```typescript
   getDailyLeaderboard({
       date?: string,
       gameType: string,
       limit?: number,
       offset?: number
   })
   ```

2. **获取每周排行榜**
   ```typescript
   getWeeklyLeaderboard({
       weekStart?: string,
       gameType: string,
       limit?: number,
       offset?: number
   })
   ```

### 奖励领取接口

1. **领取排行榜奖励**
   ```typescript
   claimLeaderboardReward({
       uid: string,
       leaderboardType: "daily" | "weekly",
       date: string,
       gameType: string
   })
   ```

2. **批量领取排行榜奖励**
   ```typescript
   batchClaimLeaderboardRewards({
       uid: string,
       gameType: string
   })
   ```

### 管理接口

1. **结算每日排行榜**
   ```typescript
   settleDailyLeaderboard({
       date: string,
       gameType: string
   })
   ```

2. **结算每周排行榜**
   ```typescript
   settleWeeklyLeaderboard({
       weekStart: string,
       gameType: string
   })
   ```

## 数据库设计

### 积分累积表

1. **daily_leaderboard_points**: 每日积分累积
   - `date`: 日期
   - `uid`: 玩家ID
   - `gameType`: 游戏类型
   - `tournamentType`: 锦标赛类型
   - `totalScore`: 总分
   - `matchesPlayed`: 对局数
   - `matchesWon`: 胜利数
   - `winRate`: 胜率
   - `bestScore`: 最佳分数
   - `averageScore`: 平均分数
   - `isTicketPlayer`: 是否门票玩家

2. **weekly_leaderboard_points**: 每周积分累积
   - `weekStart`: 周开始日期
   - `weekEnd`: 周结束日期
   - 其他字段与每日表相同

### 排行榜结算表

1. **leaderboard_settlements**: 排行榜结算记录
   - `leaderboardType`: 排行榜类型
   - `date`: 日期
   - `uid`: 玩家ID
   - `rank`: 排名
   - `totalScore`: 总分
   - `rankPointsReward`: rankPoints奖励
   - `seasonPointsReward`: seasonPoints奖励
   - `coinsReward`: 金币奖励
   - `isTicketPlayer`: 是否门票玩家
   - `claimed`: 是否已领取

### 玩家统计表

1. **player_leaderboard_stats**: 玩家排行榜统计
   - `uid`: 玩家ID
   - `gameType`: 游戏类型
   - `totalRankPoints`: 总rankPoints
   - `totalSeasonPoints`: 总seasonPoints
   - `dailyBestRank`: 每日最佳排名
   - `weeklyBestRank`: 每周最佳排名
   - `totalDailyRewards`: 总每日奖励次数
   - `totalWeeklyRewards`: 总每周奖励次数

## 系统优势

### 1. 统一排名系统

- **公平竞争**: 所有玩家按积分统一排名，不分免费和门票用户
- **简化逻辑**: 移除复杂的用户类型判断，统一奖励发放逻辑
- **清晰规则**: 玩家只需关注积分累积，无需考虑用户类型差异

### 2. 灵活的排名范围

- **范围奖励**: 支持如`[5, 10]`这样的范围奖励，覆盖更多玩家
- **精确控制**: 每个排名范围都有独立的奖励配置
- **扩展性**: 可以轻松添加新的排名范围和奖励配置

### 3. 简化的配置结构

```typescript
// 旧设计：复杂的嵌套结构
rewards: {
    free: { first: {...}, second: {...} },
    ticket: { first: {...}, second: {...} }
}

// 新设计：简洁的数组结构
rewards: [
    { rankRange: [1, 1], rankPoints: 100, seasonPoints: 200, coins: 200 },
    { rankRange: [2, 2], rankPoints: 50, seasonPoints: 100, coins: 100 },
    { rankRange: [3, 10], rankPoints: 10, seasonPoints: 20, coins: 20 }
]
```

### 4. 公平的竞争环境

- **统一标准**: 所有玩家使用相同的积分累积机制
- **透明规则**: 排行榜规则对所有玩家透明
- **激励参与**: 通过范围奖励激励更多玩家参与

### 5. 易于维护和扩展

- **配置驱动**: 通过配置文件轻松调整奖励策略
- **类型安全**: 完整的TypeScript类型定义
- **模块化**: 排行榜系统与其他系统解耦

## 使用示例

### 1. 玩家参与快速对局

```typescript
// 玩家参与免费快速对局
const tournament = {
    tournamentType: "quick_match_solitaire_free",
    entryFee: { coins: 0 }
};

// 对局完成后自动累积积分
// 在settleTournament中自动调用，根据排名获得matchPoints
// 第1名获得3分，第2名获得2分，第3名获得1分，第4名获得0分
```

### 2. 查看排行榜

```typescript
// 获取每日排行榜
const dailyLeaderboard = await getDailyLeaderboard({
    gameType: "solitaire",
    limit: 100
});

// 获取每周排行榜
const weeklyLeaderboard = await getWeeklyLeaderboard({
    gameType: "solitaire",
    limit: 100
});
```

### 3. 领取奖励

```typescript
// 领取每日排行榜奖励
const claimResult = await claimLeaderboardReward({
    uid: "player123",
    leaderboardType: "daily",
    date: "2025-08-01",
    gameType: "solitaire"
});

// 批量领取所有奖励
const batchResult = await batchClaimLeaderboardRewards({
    uid: "player123",
    gameType: "solitaire"
});
```

### 4. 管理排行榜

```typescript
// 结算每日排行榜
await settleDailyLeaderboard({
    date: "2025-08-01",
    gameType: "solitaire"
});

// 结算每周排行榜
await settleWeeklyLeaderboard({
    weekStart: "2025-08-01",
    gameType: "solitaire"
});
```

### 5. 积分计算示例

```typescript
// 玩家A参与3局快速对局
// 第1局：排名第1，获得3积分
// 第2局：排名第2，获得2积分  
// 第3局：排名第1，获得3积分
// 累积总积分：3 + 2 + 3 = 8积分
// 平均每局积分：8 / 3 = 2.67积分

// 玩家B参与2局快速对局
// 第1局：排名第3，获得1积分
// 第2局：排名第4，获得0积分
// 累积总积分：1 + 0 = 1积分
// 平均每局积分：1 / 2 = 0.5积分

// 排行榜按累积总积分排序：玩家A(8积分) > 玩家B(1积分)
```

## Tournament系统集成

### 在Tournament系统中调用积分更新

#### 1. 在settleTournament中自动调用

```typescript
// 在common.ts的settleTournament函数中
export async function settleTournament(ctx: any, tournament: any) {
    // ... 其他逻辑 ...
    
    let rank = 0;
    for (const playerTournament of playerTournaments) {
        rank++;
        playerTournament.rank = rank;
        
        // 如果是快速对局锦标赛（single_match类型），自动更新积分
        if (tournamentType.matchRules.matchType === "single_match") {
            await accumulateLeaderboardPoints(ctx, {
                uid: playerTournament.uid,
                gameType: tournamentType.gameType,
                tournamentType: tournamentType.typeId,
                rank: rank, // 传递实际排名
            });
        }
    }
}
```

#### 2. 直接调用API接口

```typescript
// 在tournament处理逻辑中直接调用
import { updatePointsFromTournament } from "../leaderboards";

// 快速对局完成后
await updatePointsFromTournament({
    uid: "player123",
    gameType: "solitaire",
    tournamentType: "quick_match_solitaire_free",
    rank: 1 // 第1名
});
```

#### 3. 使用便捷方法

```typescript
// 在tournament系统中使用便捷方法
import { LeaderboardSystem } from "../leaderboard/leaderboardSystem";

// 快速对局完成后
const result = await LeaderboardSystem.updatePointsFromTournament(ctx, {
    uid: "player123",
    gameType: "solitaire", 
    tournamentType: "quick_match_solitaire_free",
    rank: 1
});

if (result.success) {
    console.log("积分更新成功:", result.message);
} else {
    console.error("积分更新失败:", result.message);
}
```

#### 4. 直接传递积分值

```typescript
// 如果已经知道积分值，可以直接调用
await LeaderboardSystem.accumulateDailyPoints(ctx, {
    uid: "player123",
    gameType: "solitaire",
    tournamentType: "quick_match_solitaire_free",
    score: 3 // 直接传递积分值
});

await LeaderboardSystem.accumulateWeeklyPoints(ctx, {
    uid: "player123", 
    gameType: "solitaire",
    tournamentType: "quick_match_solitaire_free",
    score: 3 // 直接传递积分值
});
```

### 调用时机

1. **快速对局完成时** - 在`settleTournament`中自动调用
2. **手动触发** - 通过API接口手动调用
3. **批量处理** - 可以批量处理多个玩家的积分更新

### 返回结果

```typescript
{
    success: boolean,
    message: string,
    results: [
        {
            type: "daily",
            success: boolean,
            message: string,
            newTotalScore: number,
            matchPoints: number
        },
        {
            type: "weekly", 
            success: boolean,
            message: string,
            newTotalScore: number,
            matchPoints: number
        }
    ]
}
```

## 总结

这个系统通过以下方式实现了您的需求：

1. **使用tournamentConfig.ts配置快速对局**: 在现有配置中添加了`quick_match_solitaire_free`和`quick_match_solitaire_ticket`两种快速对局类型

2. **积分累积实现排行榜**: 通过`daily_leaderboard_points`和`weekly_leaderboard_points`表累积玩家积分

3. **排行榜结算发放奖励**: 通过`leaderboard_settlements`表记录和发放rankPoints和seasonPoints奖励

4. **自动集成**: 在`settleTournament`中自动检测快速对局并累积积分

5. **完整的API接口**: 提供了积分累积、排行榜查询、奖励领取等完整的API接口

这个设计确保了系统的灵活性、可扩展性和易用性，同时与现有的锦标赛系统完美集成。 