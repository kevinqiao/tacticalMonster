# 锦标赛处理器完整设计和配置处理说明

## 📋 概述

锦标赛处理器系统是一个模块化、可扩展的架构，支持多种锦标赛类型和游戏模式。系统采用处理器模式设计，每个处理器负责特定类型的锦标赛逻辑，通过统一的接口进行交互。

## 🏗️ 系统架构

### 1. 核心组件

```
tournament/
├── handler/
│   ├── base.ts                    # 基础处理器接口和通用逻辑
│   ├── dailySpecial.ts            # 每日特殊锦标赛处理器
│   ├── independentTournament.ts   # 独立锦标赛处理器
│   ├── multiPlayerTournament.ts   # 多人锦标赛处理器
│   ├── singlePlayerTournament.ts  # 单人锦标赛处理器
│   └── index.ts                   # 处理器注册和获取
├── matchManager.ts                # 比赛管理器
├── tournamentMatchingService.ts   # 锦标赛匹配服务
├── tournamentService.ts           # 统一锦标赛服务
├── ruleEngine.ts                  # 规则引擎
└── data/
    ├── tournamentConfigs.ts       # 锦标赛配置定义
    └── tournamentConfigUsage.ts   # 配置使用示例
```

### 2. 处理器接口设计

```typescript
export interface TournamentHandler {
  // 核心方法
  join(ctx: any, params: JoinParams): Promise<JoinResult>;
  submitScore(ctx: any, params: SubmitScoreParams): Promise<SubmitScoreResult>;
  settle(ctx: any, tournamentId: string): Promise<void>;
  
  // 验证方法
  validateJoin(ctx: any, params: ValidateJoinParams): Promise<void>;
  validateScore(ctx: any, params: ValidateScoreParams): Promise<void>;
  
  // 可选方法
  distributeRewards?: (ctx: any, params: DistributeRewardsParams) => Promise<void>;
}
```

## 🔧 处理器类型详解

### 1. 基础处理器 (`base.ts`)

**功能**：提供所有处理器的通用逻辑和默认实现

**核心特性**：
- 统一的验证逻辑
- 通用的限制检查
- 标准的错误处理
- 可扩展的接口设计

**主要方法**：
```typescript
// 基础加入逻辑
async join(ctx: any, params: JoinParams): Promise<JoinResult> {
  // 1. 验证加入条件
  await this.validateJoin(ctx, params);
  
  // 2. 扣除入场费
  await this.deductEntryFee(ctx, params);
  
  // 3. 创建或加入锦标赛
  const tournament = await this.findOrCreateTournament(ctx, params);
  
  // 4. 创建比赛
  const match = await this.createMatch(ctx, { tournament, ...params });
  
  return { tournamentId: tournament._id, matchId: match._id };
}

// 基础分数提交逻辑
async submitScore(ctx: any, params: SubmitScoreParams): Promise<SubmitScoreResult> {
  // 1. 验证分数
  await this.validateScore(ctx, params);
  
  // 2. 创建比赛记录
  const match = await this.createMatchRecord(ctx, params);
  
  // 3. 处理道具使用
  await this.handleProps(ctx, params);
  
  // 4. 更新锦标赛状态
  await this.updateTournamentStatus(ctx, params.tournamentId);
  
  // 5. 检查是否需要结算
  if (await this.shouldSettle(ctx, params.tournamentId)) {
    await this.settle(ctx, params.tournamentId);
  }
  
  return { success: true, matchId: match._id };
}
```

### 2. 每日特殊锦标赛处理器 (`dailySpecial.ts`)

**特点**：
- 每日重置的锦标赛
- 固定的奖励池
- 基于阈值的排名系统
- 支持多次尝试

**配置示例**：
```typescript
const dailySpecialConfig = {
  typeId: "daily_special",
  name: "每日特殊锦标赛",
  category: "daily",
  gameType: "solitaire",
  
  entryRequirements: {
    minSegment: "bronze",
    isSubscribedRequired: false,
    entryFee: {
      coins: 50,
      tickets: {
        gameType: "solitaire",
        tournamentType: "daily_special",
        quantity: 1
      }
    }
  },
  
  matchRules: {
    matchType: "single_match",
    minPlayers: 1,
    maxPlayers: 1,
    isSingleMatch: true,
    maxAttempts: 3,
    allowMultipleAttempts: true,
    rankingMethod: "highest_score",
    timeLimit: {
      perMatch: 300,
      total: 900
    }
  },
  
  rewards: {
    baseRewards: {
      coins: 100,
      gamePoints: 50,
      props: [
        {
          gameType: "solitaire",
          propType: "hint",
          quantity: 2,
          rarity: "common"
        }
      ]
    },
    rankRewards: [
      {
        rankRange: [1, 1],
        multiplier: 3.0,
        bonusProps: [
          {
            gameType: "solitaire",
            propType: "time_boost",
            quantity: 1,
            rarity: "rare"
          }
        ]
      }
    ]
  },
  
  limits: {
    daily: {
      maxParticipations: 3,
      maxTournaments: 1,
      maxAttempts: 3
    }
  }
};
```

**处理逻辑**：
```typescript
export const dailySpecialHandler: TournamentHandler = {
  ...baseHandler,
  
  // 重写验证逻辑
  async validateJoin(ctx: any, params: ValidateJoinParams): Promise<void> {
    // 检查是否在有效时间内
    const now = getTorontoDate();
    const today = now.localDate.toISOString().split("T")[0];
    
    // 检查今日是否已参与
    const todayParticipation = await ctx.db
      .query("player_tournament_limits")
      .withIndex("by_uid_tournament_date", (q: any) =>
        q.eq("uid", params.uid)
          .eq("tournamentType", "daily_special")
          .eq("date", today)
      )
      .first();
    
    if (todayParticipation && todayParticipation.participationCount >= 3) {
      throw new Error("今日参与次数已达上限");
    }
    
    // 调用基础验证
    await baseHandler.validateJoin(ctx, params);
  },
  
  // 重写结算逻辑
  async settle(ctx: any, tournamentId: string): Promise<void> {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) throw new Error("锦标赛不存在");
    
    // 获取所有玩家分数
    const playerScores = await this.getPlayerScores(ctx, tournamentId);
    
    // 基于阈值计算排名
    const threshold = tournament.config.rules.scoreThreshold || 1000;
    const rankings = playerScores.map(score => ({
      uid: score.uid,
      rank: score.highestScore >= threshold ? 1 : 2,
      score: score.highestScore
    }));
    
    // 分配奖励
    for (const ranking of rankings) {
      await this.distributeRewards(ctx, {
        uid: ranking.uid,
        rank: ranking.rank,
        score: ranking.score,
        tournament
      });
    }
    
    // 更新锦标赛状态
    await ctx.db.patch(tournamentId, {
      status: "completed",
      updatedAt: getTorontoDate().iso
    });
  }
};
```

### 3. 独立锦标赛处理器 (`independentTournament.ts`)

**特点**：
- 每次尝试创建独立锦标赛
- 固定的奖励结构
- 单次提交限制
- 适合练习和挑战模式

**配置示例**：
```typescript
const independentConfig = {
  typeId: "independent_tournament",
  name: "独立锦标赛",
  category: "casual",
  gameType: "solitaire",
  
  entryRequirements: {
    minSegment: "bronze",
    isSubscribedRequired: false,
    entryFee: {
      coins: 30
    }
  },
  
  matchRules: {
    matchType: "single_match",
    minPlayers: 1,
    maxPlayers: 1,
    isSingleMatch: true,
    maxAttempts: 3,
    allowMultipleAttempts: true,
    rankingMethod: "highest_score",
    timeLimit: {
      perMatch: 480
    }
  },
  
  rewards: {
    baseRewards: {
      coins: 60,
      gamePoints: 30,
      props: [
        {
          gameType: "solitaire",
          propType: "undo",
          quantity: 1,
          rarity: "common"
        }
      ]
    },
    rankRewards: [
      {
        rankRange: [1, 1],
        multiplier: 2.5
      }
    ]
  },
  
  limits: {
    daily: {
      maxParticipations: 5,
      maxTournaments: 3,
      maxAttempts: 5
    }
  }
};
```

**处理逻辑**：
```typescript
export const independentTournamentHandler: TournamentHandler = {
  ...baseHandler,
  
  // 完全重写加入逻辑
  async join(ctx: any, params: JoinParams): Promise<JoinResult> {
    const now = getTorontoDate();
    
    // 验证加入条件
    await this.validateJoin(ctx, params);
    
    // 扣除入场费
    await this.deductEntryFee(ctx, params);
    
    // 为每次尝试创建新的锦标赛
    const tournamentId = await ctx.db.insert("tournaments", {
      seasonId: params.season._id,
      gameType: params.gameType,
      segmentName: params.player.segmentName,
      status: "open",
      playerUids: [params.uid],
      tournamentType: "independent_tournament",
      isSubscribedRequired: false,
      isSingleMatch: true,
      prizePool: 0, // 独立锦标赛没有奖池
      config: params.config,
      createdAt: now.iso,
      updatedAt: now.iso,
      endTime: new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
    });
    
    // 创建单场比赛
    const matchId = await MatchManager.createMatch(ctx, {
      tournamentId,
      gameType: params.gameType,
      matchType: "single_match",
      maxPlayers: 1,
      minPlayers: 1,
      gameData: {
        player: {
          uid: params.uid,
          segmentName: params.player.segmentName,
          eloScore: params.player.totalPoints || 1000
        }
      }
    });
    
    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
      matchId,
      tournamentId,
      uid: params.uid,
      gameType: params.gameType
    });
    
    // 创建远程游戏
    const gameResult = await MatchManager.createRemoteGame(ctx, {
      matchId,
      tournamentId,
      uids: [params.uid],
      gameType: params.gameType,
      matchType: "single_match"
    });
    
    return {
      tournamentId,
      matchId,
      playerMatchId,
      gameId: gameResult.gameId,
      serverUrl: gameResult.serverUrl,
      attemptNumber: 1
    };
  },
  
  // 重写分数提交逻辑
  async submitScore(ctx: any, params: SubmitScoreParams): Promise<SubmitScoreResult> {
    const now = getTorontoDate();
    
    // 验证分数
    await this.validateScore(ctx, params);
    
    // 查找比赛记录
    const match = await this.findPlayerMatch(ctx, params);
    if (!match) {
      throw new Error("未找到对应的比赛记录");
    }
    
    // 提交分数
    const submitResult = await MatchManager.submitScore(ctx, {
      matchId: match.matchId,
      tournamentId: params.tournamentId,
      uid: params.uid,
      gameType: params.gameType,
      score: params.score,
      gameData: params.gameData,
      propsUsed: params.propsUsed,
      attemptNumber: match.attemptNumber
    });
    
    // 立即结算独立锦标赛
    await this.settle(ctx, params.tournamentId);
    
    return {
      success: true,
      matchId: match.matchId,
      score: params.score,
      settled: true
    };
  }
};
```

### 4. 单人锦标赛处理器 (`singlePlayerTournament.ts`)

**特点**：
- 复用锦标赛结构
- 支持多次尝试
- 动态排名和奖励
- 使用新的比赛表结构

**配置示例**：
```typescript
const singlePlayerConfig = {
  typeId: "single_player_tournament",
  name: "单人锦标赛",
  category: "casual",
  gameType: "solitaire",
  
  entryRequirements: {
    minSegment: "bronze",
    isSubscribedRequired: false,
    entryFee: {
      coins: 25
    }
  },
  
  matchRules: {
    matchType: "single_match",
    minPlayers: 1,
    maxPlayers: 1,
    isSingleMatch: true,
    maxAttempts: 5,
    allowMultipleAttempts: true,
    rankingMethod: "highest_score",
    timeLimit: {
      perMatch: 600
    }
  },
  
  rewards: {
    baseRewards: {
      coins: 50,
      gamePoints: 25,
      props: [],
      tickets: []
    },
    rankRewards: [
      {
        rankRange: [1, 1],
        multiplier: 2.0
      },
      {
        rankRange: [2, 5],
        multiplier: 1.5
      }
    ]
  },
  
  limits: {
    daily: {
      maxParticipations: 10,
      maxTournaments: 5,
      maxAttempts: 10
    }
  }
};
```

**处理逻辑**：
```typescript
export const singlePlayerTournamentHandler: TournamentHandler = {
  ...baseHandler,
  
  // 重写加入逻辑
  async join(ctx: any, params: JoinParams): Promise<JoinResult> {
    const now = getTorontoDate();
    
    // 验证加入条件
    await this.validateJoin(ctx, params);
    
    // 扣除入场费
    await this.deductEntryFee(ctx, params);
    
    // 查找或创建锦标赛
    let tournament = await this.findOrCreateTournament(ctx, params);
    
    // 创建单场比赛
    const matchId = await MatchManager.createMatch(ctx, {
      tournamentId: tournament._id,
      gameType: params.gameType,
      matchType: "single_match",
      maxPlayers: 1,
      minPlayers: 1,
      gameData: {
        player: {
          uid: params.uid,
          segmentName: params.player.segmentName,
          eloScore: params.player.totalPoints || 1000
        }
      }
    });
    
    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
      matchId,
      tournamentId: tournament._id,
      uid: params.uid,
      gameType: params.gameType
    });
    
    // 创建远程游戏
    const gameResult = await MatchManager.createRemoteGame(ctx, {
      matchId,
      tournamentId: tournament._id,
      uids: [params.uid],
      gameType: params.gameType,
      matchType: "single_match"
    });
    
    return {
      tournamentId: tournament._id,
      matchId,
      playerMatchId,
      gameId: gameResult.gameId,
      serverUrl: gameResult.serverUrl,
      attemptNumber: 1
    };
  },
  
  // 重写结算逻辑
  async settle(ctx: any, tournamentId: string): Promise<void> {
    const now = getTorontoDate();
    
    // 获取锦标赛信息
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) throw new Error("锦标赛不存在");
    
    // 获取所有比赛记录
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
      .collect();
    
    // 计算玩家总积分和排名
    const playerScores = new Map<string, { totalScore: number; matchCount: number; bestScore: number }>();
    
    for (const match of matches) {
      const playerMatches = await ctx.db
        .query("player_matches")
        .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
        .collect();
      
      for (const playerMatch of playerMatches) {
        if (!playerMatch.completed) continue;
        
        const current = playerScores.get(playerMatch.uid) || {
          totalScore: 0,
          matchCount: 0,
          bestScore: 0
        };
        
        playerScores.set(playerMatch.uid, {
          totalScore: current.totalScore + playerMatch.score,
          matchCount: current.matchCount + 1,
          bestScore: Math.max(current.bestScore, playerMatch.score)
        });
      }
    }
    
    // 计算最终排名
    const sortedPlayers = Array.from(playerScores.entries())
      .map(([uid, stats]) => ({
        uid,
        totalScore: stats.totalScore,
        matchCount: stats.matchCount,
        bestScore: stats.bestScore,
        averageScore: stats.totalScore / stats.matchCount
      }))
      .sort((a, b) => {
        if (b.bestScore !== a.bestScore) {
          return b.bestScore - a.bestScore;
        }
        return b.averageScore - a.averageScore;
      })
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));
    
    // 分配奖励
    for (const playerData of sortedPlayers) {
      await this.distributeRewards(ctx, {
        uid: playerData.uid,
        rank: playerData.rank,
        score: playerData.bestScore,
        tournament,
        matches: matches.filter((m: any) =>
          ctx.db.query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", m._id))
            .filter((q: any) => q.eq(q.field("uid"), playerData.uid))
            .first()
        )
      });
    }
    
    // 更新锦标赛状态
    await ctx.db.patch(tournamentId, {
      status: "completed",
      updatedAt: now.iso
    });
  }
};
```

### 5. 多人锦标赛处理器 (`multiPlayerTournament.ts`)

**特点**：
- 支持多人实时对战
- 技能匹配算法
- 动态比赛创建
- 复杂的排名系统

**配置示例**：
```typescript
const multiPlayerConfig = {
  typeId: "multi_player_tournament",
  name: "多人锦标赛",
  category: "tournament",
  gameType: "rummy",
  
  entryRequirements: {
    minSegment: "bronze",
    isSubscribedRequired: false,
    entryFee: {
      coins: 100,
      tickets: {
        gameType: "rummy",
        tournamentType: "multi_player_tournament",
        quantity: 1
      }
    }
  },
  
  matchRules: {
    matchType: "multi_match",
    minPlayers: 2,
    maxPlayers: 4,
    isSingleMatch: false,
    maxAttempts: 1,
    allowMultipleAttempts: false,
    rankingMethod: "total_score",
    timeLimit: {
      perMatch: 600,
      perTurn: 30
    }
  },
  
  rewards: {
    baseRewards: {
      coins: 200,
      gamePoints: 100,
      props: [
        {
          gameType: "rummy",
          propType: "wild_card",
          quantity: 1,
          rarity: "rare"
        }
      ]
    },
    rankRewards: [
      {
        rankRange: [1, 1],
        multiplier: 4.0,
        bonusProps: [
          {
            gameType: "rummy",
            propType: "joker",
            quantity: 1,
            rarity: "epic"
          }
        ]
      }
    ]
  },
  
  limits: {
    daily: {
      maxParticipations: 5,
      maxTournaments: 2,
      maxAttempts: 5
    }
  },
  
  advanced: {
    matching: {
      algorithm: "skill_based",
      skillRange: 150,
      maxWaitTime: 60,
      fallbackToAI: false
    },
    settlement: {
      autoSettle: true,
      settleDelay: 600,
      requireMinimumPlayers: true,
      minimumPlayers: 2
    }
  }
};
```

**处理逻辑**：
```typescript
export const multiPlayerTournamentHandler: TournamentHandler = {
  ...baseHandler,
  
  // 重写加入逻辑
  async join(ctx: any, params: JoinParams): Promise<JoinResult> {
    const now = getTorontoDate();
    
    // 验证加入条件
    await this.validateJoin(ctx, params);
    
    // 扣除入场费
    await this.deductEntryFee(ctx, params);
    
    // 查找或创建锦标赛
    let tournament = await this.findOrCreateTournament(ctx, params);
    
    // 根据锦标赛类型处理
    if (params.config.rules?.isSingleMatch) {
      // 单人比赛锦标赛
      return await this.handleSingleMatchTournament(ctx, {
        tournament,
        ...params
      });
    } else {
      // 多人比赛锦标赛
      return await this.handleMultiMatchTournament(ctx, {
        tournament,
        ...params
      });
    }
  },
  
  // 处理单人比赛锦标赛
  async handleSingleMatchTournament(ctx: any, params: any): Promise<JoinResult> {
    const { tournament, uid, gameType, player, config } = params;
    
    // 创建单场比赛
    const matchId = await MatchManager.createMatch(ctx, {
      tournamentId: tournament._id,
      gameType,
      matchType: "single_match",
      maxPlayers: 1,
      minPlayers: 1,
      gameData: {
        player: {
          uid,
          segmentName: player.segmentName,
          eloScore: player.eloScore || 1000
        }
      }
    });
    
    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
      matchId,
      tournamentId: tournament._id,
      uid,
      gameType
    });
    
    // 创建远程游戏
    const gameResult = await MatchManager.createRemoteGame(ctx, {
      matchId,
      tournamentId: tournament._id,
      uids: [uid],
      gameType,
      matchType: "single_match"
    });
    
    return {
      tournamentId: tournament._id,
      matchId,
      playerMatchId,
      gameId: gameResult.gameId,
      serverUrl: gameResult.serverUrl,
      attemptNumber: 1
    };
  },
  
  // 处理多人比赛锦标赛
  async handleMultiMatchTournament(ctx: any, params: any): Promise<JoinResult> {
    const { tournament, uid, gameType, player, config } = params;
    
    // 使用锦标赛匹配服务
    const matchResult = await TournamentMatchingService.joinTournamentMatch(ctx, {
      uid,
      tournamentId: tournament._id,
      gameType,
      player,
      config
    });
    
    return {
      tournamentId: tournament._id,
      matchId: matchResult.matchId,
      playerMatchId: matchResult.playerMatchId,
      gameId: matchResult.gameId,
      serverUrl: matchResult.serverUrl,
      attemptNumber: 1,
      matchStatus: matchResult.matchInfo
    };
  }
};
```

## ⚙️ 配置系统

### 1. 配置结构

```typescript
export interface TournamentConfig {
  // 基础信息
  typeId: string;
  name: string;
  description: string;
  category: TournamentCategory;
  
  // 游戏配置
  gameType: GameType;
  isActive: boolean;
  priority: number;
  
  // 参赛条件
  entryRequirements: EntryRequirements;
  
  // 比赛规则
  matchRules: MatchRules;
  
  // 奖励配置
  rewards: RewardConfig;
  
  // 时间配置
  schedule: ScheduleConfig;
  
  // 限制配置
  limits: LimitConfig;
  
  // 高级配置
  advanced: AdvancedConfig;
}
```

### 2. 配置管理

```typescript
export class TournamentConfigManager {
  // 获取特定配置
  static getConfig(typeId: string): TournamentConfig | undefined;
  
  // 获取所有活跃配置
  static getActiveConfigs(): TournamentConfig[];
  
  // 按游戏类型获取配置
  static getConfigsByGameType(gameType: GameType): TournamentConfig[];
  
  // 验证配置
  static validateConfig(config: TournamentConfig): { valid: boolean; errors: string[] };
  
  // 检查参赛资格
  static checkEligibility(config: TournamentConfig, player: any, inventory: any): { eligible: boolean; reasons: string[] };
  
  // 计算奖励
  static calculateRewards(config: TournamentConfig, rank: number, score: number, playerSegment: string, isSubscribed: boolean): any;
  
  // 检查参与限制
  static checkParticipationLimits(config: TournamentConfig, currentStats: any, isSubscribed: boolean): { canParticipate: boolean; reasons: string[] };
}
```

### 3. 配置使用示例

```typescript
// 获取配置
const config = TournamentConfigManager.getConfig("daily_special");

// 检查参赛资格
const eligibility = TournamentConfigManager.checkEligibility(
  config,
  {
    uid: "user123",
    segmentName: "gold",
    isSubscribed: true,
    level: 10,
    totalPoints: 500
  },
  {
    coins: 100,
    tickets: [
      {
        gameType: "solitaire",
        tournamentType: "daily_special",
        quantity: 2
      }
    ],
    props: []
  }
);

// 计算奖励
const rewards = TournamentConfigManager.calculateRewards(
  config,
  1, // 第一名
  1000, // 分数
  "gold", // 段位
  true // 订阅用户
);
```

## 🔄 处理器注册和获取

### 1. 处理器注册

```typescript
// handler/index.ts
const handlers = new Map<string, TournamentHandler>();

export function registerHandler(typeId: string, handler: TournamentHandler) {
  handlers.set(typeId, handler);
}

export function getHandler(typeId: string): TournamentHandler {
  const handler = handlers.get(typeId);
  if (!handler) {
    throw new Error(`未找到处理器: ${typeId}`);
  }
  return handler;
}

// 注册所有处理器
registerHandler("daily_special", dailySpecialHandler);
registerHandler("independent_tournament", independentTournamentHandler);
registerHandler("single_player_tournament", singlePlayerTournamentHandler);
registerHandler("multi_player_tournament", multiPlayerTournamentHandler);
```

### 2. 统一服务接口

```typescript
// tournamentService.ts
export class TournamentService {
  // 加入锦标赛
  static async joinTournament(ctx: any, params: any) {
    const handler = getHandler(params.tournamentType);
    return await handler.join(ctx, params);
  }
  
  // 提交分数
  static async submitScore(ctx: any, params: any) {
    const tournament = await ctx.db.get(params.tournamentId);
    const handler = getHandler(tournament.tournamentType);
    return await handler.submitScore(ctx, params);
  }
  
  // 结算锦标赛
  static async settleTournament(ctx: any, tournamentId: string) {
    const tournament = await ctx.db.get(tournamentId);
    const handler = getHandler(tournament.tournamentType);
    await handler.settle(ctx, tournamentId);
  }
}
```

## 🎯 设计优势

### 1. 模块化设计
- 每个处理器独立负责特定类型
- 易于维护和扩展
- 清晰的职责分离

### 2. 可配置性
- 完整的配置系统
- 支持运行时配置
- 灵活的规则定义

### 3. 可扩展性
- 统一的处理器接口
- 易于添加新类型
- 支持自定义逻辑

### 4. 类型安全
- 完整的TypeScript类型定义
- 编译时错误检查
- 更好的开发体验

### 5. 性能优化
- 按需加载处理器
- 缓存配置数据
- 优化数据库查询

## 🚀 扩展指南

### 1. 添加新处理器

```typescript
// 1. 创建处理器文件
export const newTournamentHandler: TournamentHandler = {
  ...baseHandler,
  
  async join(ctx: any, params: JoinParams): Promise<JoinResult> {
    // 自定义加入逻辑
  },
  
  async submitScore(ctx: any, params: SubmitScoreParams): Promise<SubmitScoreResult> {
    // 自定义分数提交逻辑
  },
  
  async settle(ctx: any, tournamentId: string): Promise<void> {
    // 自定义结算逻辑
  }
};

// 2. 注册处理器
registerHandler("new_tournament_type", newTournamentHandler);

// 3. 添加配置
const newConfig: TournamentConfig = {
  typeId: "new_tournament_type",
  name: "新锦标赛类型",
  // ... 其他配置
};
```

### 2. 自定义验证逻辑

```typescript
export const customHandler: TournamentHandler = {
  ...baseHandler,
  
  async validateJoin(ctx: any, params: ValidateJoinParams): Promise<void> {
    // 自定义验证逻辑
    if (params.player.level < 10) {
      throw new Error("需要至少10级才能参与");
    }
    
    // 调用基础验证
    await baseHandler.validateJoin(ctx, params);
  }
};
```

### 3. 自定义奖励逻辑

```typescript
export const customHandler: TournamentHandler = {
  ...baseHandler,
  
  async distributeRewards(ctx: any, params: DistributeRewardsParams): Promise<void> {
    // 自定义奖励分配逻辑
    const { uid, rank, score, tournament } = params;
    
    // 特殊奖励逻辑
    if (score > 10000) {
      await this.giveSpecialReward(ctx, uid);
    }
    
    // 调用基础奖励分配
    await baseHandler.distributeRewards(ctx, params);
  }
};
```

## 📊 监控和调试

### 1. 日志记录

```typescript
// 在处理器中添加日志
async join(ctx: any, params: JoinParams): Promise<JoinResult> {
  console.log(`玩家 ${params.uid} 尝试加入 ${params.tournamentType} 锦标赛`);
  
  try {
    const result = await this.performJoin(ctx, params);
    console.log(`玩家 ${params.uid} 成功加入锦标赛 ${result.tournamentId}`);
    return result;
  } catch (error) {
    console.error(`玩家 ${params.uid} 加入锦标赛失败:`, error);
    throw error;
  }
}
```

### 2. 性能监控

```typescript
// 添加性能监控
async submitScore(ctx: any, params: SubmitScoreParams): Promise<SubmitScoreResult> {
  const startTime = Date.now();
  
  try {
    const result = await this.performSubmitScore(ctx, params);
    const duration = Date.now() - startTime;
    console.log(`分数提交完成，耗时: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`分数提交失败，耗时: ${duration}ms`, error);
    throw error;
  }
}
```

### 3. 错误处理

```typescript
// 统一的错误处理
async settle(ctx: any, tournamentId: string): Promise<void> {
  try {
    await this.performSettle(ctx, tournamentId);
  } catch (error) {
    // 记录错误日志
    await ctx.db.insert("error_logs", {
      error: error.message,
      context: "tournament_settle",
      tournamentId,
      createdAt: getTorontoDate().iso
    });
    
    // 重新抛出错误
    throw error;
  }
}
```

## 📝 总结

锦标赛处理器系统提供了一个完整、灵活、可扩展的解决方案：

1. **模块化架构** - 每个处理器独立负责特定类型
2. **统一接口** - 标准化的处理器接口
3. **配置驱动** - 完整的配置系统
4. **类型安全** - 完整的TypeScript支持
5. **易于扩展** - 清晰的扩展指南
6. **性能优化** - 多种优化策略
7. **监控支持** - 完整的监控和调试功能

这个系统能够满足各种锦标赛类型的需求，同时保持良好的可维护性和扩展性。 