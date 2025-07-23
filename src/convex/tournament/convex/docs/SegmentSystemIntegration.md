# 段位系统集成文档

## 概述

本文档描述了段位系统与锦标赛匹配和结算系统的完整集成方案。段位系统为多人在线游戏提供了公平、可扩展的排名机制，支持多种游戏类型和锦标赛模式。

## 核心特性

### 1. 段位等级系统
- **8个段位等级**：Bronze → Silver → Gold → Platinum → Diamond → Master → GrandMaster → Legend
- **分数范围**：0-9999+ 分，每个段位有明确的分数范围
- **颜色标识**：每个段位有独特的颜色标识
- **等级权重**：段位等级影响匹配优先级和权重

### 2. 锦标赛段位奖励
- **单场比赛**：4人比赛，冠军+20分，亚军+10分，季军+2分，第四名-3分
- **每日锦标赛**：16人比赛，前8名获得正分，后8名可能扣分
- **每周锦标赛**：32人比赛，前20名获得正分，后12名扣分
- **赛季锦标赛**：大规模比赛，基于排名百分比动态计算分数

### 3. 智能匹配系统
- **段位兼容性**：基于段位等级和分数的综合兼容性计算
- **优先级权重**：段位等级和分数影响匹配优先级
- **多算法支持**：skill_based、segment_based、elo_based、random

## 系统架构

### 核心组件

```
SegmentSystem (段位系统核心)
├── 段位初始化
├── 分数更新
├── 段位计算
├── 排行榜管理
└── 赛季重置

TournamentMatchingService (锦标赛匹配服务)
├── 段位兼容性计算
├── 优先级权重计算
├── 智能匹配算法
└── 队列管理

BaseHandler (基础处理器)
├── 段位资格验证
├── 锦标赛结算
├── 段位分数分配
└── 奖励发放
```

### 数据流

1. **玩家加入匹配队列**
   - 检查并初始化段位
   - 计算匹配优先级和权重
   - 加入匹配队列

2. **智能匹配**
   - 基于段位兼容性分组
   - 考虑段位等级和分数差异
   - 执行匹配算法

3. **锦标赛结算**
   - 计算玩家排名
   - 分配段位分数奖励
   - 更新段位等级
   - 发放晋升奖励

## 集成实现

### 1. TournamentMatchingService 集成

#### 段位初始化
```typescript
// 确保玩家段位已初始化
let playerSegment = await ctx.db
  .query("player_segments")
  .withIndex("by_uid_game", (q: any) => q.eq("uid", player.uid).eq("gameType", tournamentType.gameType))
  .first();

if (!playerSegment) {
  await SegmentSystem.initializePlayerSegment(ctx, player.uid, tournamentType.gameType);
  playerSegment = await ctx.db
    .query("player_segments")
    .withIndex("by_uid_game", (q: any) => q.eq("uid", player.uid).eq("gameType", tournamentType.gameType))
    .first();
}
```

#### 段位兼容性计算
```typescript
private static calculateSegmentCompatibility(player1: any, player2: any): number {
  // 使用新的段位系统计算兼容性
  const tier1 = player1.segmentTier || SegmentSystem.getSegmentTier(player1.segmentName || "Bronze");
  const tier2 = player2.segmentTier || SegmentSystem.getSegmentTier(player2.segmentName || "Bronze");
  
  // 计算段位差异
  const segmentDiff = Math.abs(tier1 - tier2);
  
  // 计算段位分数差异
  const points1 = player1.segmentPoints || 0;
  const points2 = player2.segmentPoints || 0;
  const pointsDiff = Math.abs(points1 - points2);
  
  // 段位差异权重（70%）
  const tierCompatibility = Math.max(0, 1 - segmentDiff / 8);
  
  // 分数差异权重（30%）
  const pointsCompatibility = Math.max(0, 1 - pointsDiff / 1000);
  
  // 综合兼容性分数
  return tierCompatibility * 0.7 + pointsCompatibility * 0.3;
}
```

#### 优先级和权重计算
```typescript
// 段位优先级（基于新的段位系统）
const segmentTier = playerSegment ? SegmentSystem.getSegmentTier(playerSegment.segmentName) : 1;
priority += segmentTier * 15; // 增加段位权重

// 段位分数优先级
const segmentPoints = playerSegment?.currentPoints || 0;
priority += Math.floor(segmentPoints / 50);

// 段位权重（基于新的段位系统）
const segmentTier = playerSegment ? SegmentSystem.getSegmentTier(playerSegment.segmentName) : 1;
weight *= (1 + segmentTier * 0.15); // 增加段位权重

// 段位分数权重
const segmentPoints = playerSegment?.currentPoints || 0;
weight *= (1 + (segmentPoints / 1000) * 0.1);
```

### 2. BaseHandler 集成

#### 段位资格验证
```typescript
// 检查段位要求
if (tournamentType.entryRequirements?.minSegment) {
  const playerSegment = await ctx.db
    .query("player_segments")
    .withIndex("by_uid_game", (q: any) => q.eq("uid", player.uid).eq("gameType", tournamentType.gameType))
    .first();

  if (!playerSegment) {
    // 初始化玩家段位
    await SegmentSystem.initializePlayerSegment(ctx, player.uid, tournamentType.gameType);
  } else {
    const playerSegmentTier = SegmentSystem.getSegmentTier(playerSegment.segmentName);
    const requiredSegmentTier = SegmentSystem.getSegmentTier(tournamentType.entryRequirements.minSegment);

    if (playerSegmentTier < requiredSegmentTier) {
      throw new Error(`段位不足，需要 ${tournamentType.entryRequirements.minSegment} 段位以上`);
    }
  }
}
```

#### 锦标赛结算和段位更新
```typescript
async function calculateTournamentRankingsAndSegmentRewards(ctx: any, tournamentId: string, tournamentType: string) {
  // 根据锦标赛类型确定排名方法
  let rankings: any[] = [];
  
  if (tournamentType === "single_match") {
    rankings = await calculateSingleMatchRankings(ctx, tournamentId);
  } else {
    rankings = await calculateMultiMatchRankings(ctx, tournamentId);
  }

  // 分配段位分数奖励
  const segmentRewards: SegmentRewardResult[] = [];
  const totalPlayers = rankings.length;

  for (const ranking of rankings) {
    const { uid, rank, gameType } = ranking;

    // 计算段位分数奖励
    const scoreChange = SegmentSystem.calculateTournamentSegmentReward(
      tournamentType,
      rank,
      totalPlayers
    );

    // 更新玩家段位分数
    const segmentResult = await SegmentSystem.updatePlayerSegmentScore(ctx, {
      uid,
      gameType,
      scoreChange,
      tournamentType,
      tournamentId,
      rank,
      totalPlayers
    });

    segmentRewards.push({
      uid,
      oldSegment: segmentResult.oldSegment,
      newSegment: segmentResult.newSegment,
      scoreChange,
      segmentChanged: segmentResult.segmentChanged,
      isPromotion: segmentResult.isPromotion
    });

    // 记录段位奖励日志
    await ctx.db.insert("segment_rewards", {
      uid,
      tournamentId,
      tournamentType,
      gameType,
      rank,
      scoreChange,
      oldSegment: segmentResult.oldSegment,
      newSegment: segmentResult.newSegment,
      segmentChanged: segmentResult.segmentChanged,
      isPromotion: segmentResult.isPromotion,
      createdAt: now.iso
    });
  }

  return { rankings, segmentRewards, totalPlayers };
}
```

## API 接口

### 段位系统 API

#### 初始化玩家段位
```typescript
export const initializePlayerSegment = mutation({
  args: {
    uid: v.string(),
    gameType: v.string(),
    seasonId: v.optional(v.string())
  },
  handler: async (ctx: any, args: any) => {
    return await SegmentSystem.initializePlayerSegment(ctx, args.uid, args.gameType, args.seasonId);
  }
});
```

#### 更新玩家段位分数
```typescript
export const updatePlayerSegmentScore = mutation({
  args: {
    uid: v.string(),
    gameType: v.string(),
    scoreChange: v.number(),
    tournamentType: v.optional(v.string()),
    tournamentId: v.optional(v.string()),
    matchId: v.optional(v.string()),
    rank: v.optional(v.number()),
    totalPlayers: v.optional(v.number())
  },
  handler: async (ctx: any, args: any) => {
    return await SegmentSystem.updatePlayerSegmentScore(ctx, args);
  }
});
```

#### 获取玩家段位信息
```typescript
export const getPlayerSegment = query({
  args: {
    uid: v.string(),
    gameType: v.string()
  },
  handler: async (ctx: any, args: any) => {
    return await SegmentSystem.getPlayerSegment(ctx, args.uid, args.gameType);
  }
});
```

#### 获取段位排行榜
```typescript
export const getSegmentLeaderboard = query({
  args: {
    gameType: v.string(),
    segmentName: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx: any, args: any) => {
    return await SegmentSystem.getSegmentLeaderboard(ctx, args.gameType, args.segmentName, args.limit);
  }
});
```

## 使用示例

### 1. 完整锦标赛流程示例

```typescript
// 示例：完整锦标赛流程（从匹配到结算）
export const exampleCompleteTournamentFlow = mutation({
  args: {
    gameType: v.string(),
    tournamentType: v.string(),
    players: v.array(v.object({
      uid: v.string(),
      totalPoints: v.number(),
      isSubscribed: v.boolean()
    }))
  },
  handler: async (ctx: any, args: any) => {
    const { gameType, tournamentType, players } = args;
    const results = [];
    
    // 1. 初始化所有玩家段位
    for (const player of players) {
      await SegmentSystem.initializePlayerSegment(ctx, player.uid, gameType);
    }
    
    // 2. 模拟锦标赛匹配
    const tournamentConfig = {
      gameType,
      typeId: tournamentType,
      config: {
        advanced: {
          matching: {
            algorithm: "segment_based",
            skillRange: 200,
            segmentRange: 1
          }
        }
      }
    };
    
    for (const player of players) {
      const joinResult = await TournamentMatchingService.joinMatchingQueue(ctx, {
        tournament: null,
        tournamentType: tournamentConfig,
        player
      });
      results.push({ step: "join_queue", player: player.uid, result: joinResult });
    }
    
    // 3. 模拟锦标赛结算
    const playerResults = players.map((player, index) => ({
      uid: player.uid,
      rank: index + 1,
      score: 1000 - index * 50
    }));
    
    const settlementResult = await exampleTournamentSettlement.action(ctx, {
      tournamentId: "example_tournament_id",
      tournamentType,
      gameType,
      playerResults
    });
    
    results.push({ step: "settlement", result: settlementResult });
    
    return { success: true, results };
  }
});
```

### 2. 段位兼容性测试示例

```typescript
// 示例：段位兼容性测试
export const exampleSegmentCompatibilityTest = query({
  args: {
    player1: v.object({
      uid: v.string(),
      segmentName: v.string(),
      segmentPoints: v.number()
    }),
    player2: v.object({
      uid: v.string(),
      segmentName: v.string(),
      segmentPoints: v.number()
    })
  },
  handler: async (ctx: any, args: any) => {
    const { player1, player2 } = args;
    
    // 计算段位兼容性
    const tier1 = SegmentSystem.getSegmentTier(player1.segmentName);
    const tier2 = SegmentSystem.getSegmentTier(player2.segmentName);
    const segmentDiff = Math.abs(tier1 - tier2);
    const pointsDiff = Math.abs(player1.segmentPoints - player2.segmentPoints);
    
    const tierCompatibility = Math.max(0, 1 - segmentDiff / 8);
    const pointsCompatibility = Math.max(0, 1 - pointsDiff / 1000);
    const overallCompatibility = tierCompatibility * 0.7 + pointsCompatibility * 0.3;
    
    return {
      success: true,
      result: {
        player1: { uid: player1.uid, segmentName: player1.segmentName, tier: tier1, points: player1.segmentPoints },
        player2: { uid: player2.uid, segmentName: player2.segmentName, tier: tier2, points: player2.segmentPoints },
        compatibility: {
          tierCompatibility,
          pointsCompatibility,
          overallCompatibility,
          segmentDiff,
          pointsDiff,
          isCompatible: overallCompatibility >= 0.5
        }
      }
    };
  }
});
```

## 配置说明

### 段位等级配置

```typescript
static readonly SEGMENT_LEVELS = {
  Bronze: { minScore: 0, maxScore: 999, color: "#CD7F32", tier: 1 },
  Silver: { minScore: 1000, maxScore: 1999, color: "#C0C0C0", tier: 2 },
  Gold: { minScore: 2000, maxScore: 2999, color: "#FFD700", tier: 3 },
  Platinum: { minScore: 3000, maxScore: 3999, color: "#E5E4E2", tier: 4 },
  Diamond: { minScore: 4000, maxScore: 4999, color: "#B9F2FF", tier: 5 },
  Master: { minScore: 5000, maxScore: 6999, color: "#FF6B6B", tier: 6 },
  GrandMaster: { minScore: 7000, maxScore: 9999, color: "#4ECDC4", tier: 7 },
  Legend: { minScore: 10000, maxScore: Infinity, color: "#FFE66D", tier: 8 }
};
```

### 锦标赛奖励配置

```typescript
static readonly TOURNAMENT_SEGMENT_REWARDS = {
  // 单场比赛（4人）
  single_match: {
    1: { score: 20, description: "冠军" },
    2: { score: 10, description: "亚军" },
    3: { score: 2, description: "季军" },
    4: { score: -3, description: "第四名" }
  },
  
  // 每日锦标赛（16人）
  daily: {
    1: { score: 50, description: "日冠军" },
    2: { score: 35, description: "日亚军" },
    // ... 更多排名
  },
  
  // 每周锦标赛（32人）
  weekly: {
    1: { score: 150, description: "周冠军" },
    2: { score: 100, description: "周亚军" },
    // ... 更多排名
  },
  
  // 赛季锦标赛（大规模）
  seasonal: {
    calculateByRank: (rank: number, totalPlayers: number) => {
      const percentage = (rank / totalPlayers) * 100;
      if (percentage <= 10) {
        return Math.max(200, 500 - (rank - 1) * 0.3);
      } else if (percentage <= 25) {
        return Math.max(50, 150 - (rank - 1001) * 0.067);
      }
      // ... 更多百分比区间
    }
  }
};
```

## 性能优化

### 1. 数据库索引优化

```typescript
// 段位相关索引
player_segments: defineTable({
  // ... 字段定义
}).index("by_uid_game", ["uid", "gameType"])
  .index("by_segment", ["segmentName"])
  .index("by_points", ["currentPoints"]);

// 匹配队列索引
matchingQueue: defineTable({
  // ... 字段定义
}).index("by_uid", ["uid"])
  .index("by_status_priority", ["status", "priority"])
  .index("by_joined_at", ["joinedAt"]);
```

### 2. 批量操作优化

```typescript
// 批量段位更新
export const exampleBatchSegmentUpdate = mutation({
  args: {
    updates: v.array(v.object({
      uid: v.string(),
      gameType: v.string(),
      scoreChange: v.number(),
      reason: v.string()
    }))
  },
  handler: async (ctx: any, args: any) => {
    const { updates } = args;
    const results = [];
    
    for (const update of updates) {
      try {
        const segmentResult = await SegmentSystem.updatePlayerSegmentScore(ctx, {
          uid: update.uid,
          gameType: update.gameType,
          scoreChange: update.scoreChange,
          tournamentType: "batch_update",
          matchId: "batch_update",
          rank: 0,
          totalPlayers: 1
        });
        
        results.push({ uid: update.uid, success: true, segmentResult });
      } catch (error) {
        results.push({ uid: update.uid, success: false, error: error.message });
      }
    }
    
    return { success: true, results };
  }
});
```

## 监控和日志

### 1. 段位变更日志

```typescript
// 记录段位奖励日志
await ctx.db.insert("segment_rewards", {
  uid,
  tournamentId,
  tournamentType,
  gameType,
  rank,
  scoreChange,
  oldSegment: segmentResult.oldSegment,
  newSegment: segmentResult.newSegment,
  segmentChanged: segmentResult.segmentChanged,
  isPromotion: segmentResult.isPromotion,
  createdAt: now.iso
});
```

### 2. 匹配事件日志

```typescript
// 记录匹配事件
await ctx.db.insert("match_events", {
  matchId: undefined,
  tournamentId: tournament._id || undefined,
  uid: params.player.uid,
  eventType: "player_joined_queue",
  eventData: {
    algorithm: matchingConfig.algorithm,
    priority,
    weight,
    queueId,
    segmentInfo: {
      name: playerSegment?.segmentName,
      tier: SegmentSystem.getSegmentTier(playerSegment?.segmentName || "Bronze"),
      points: playerSegment?.currentPoints || 0
    }
  },
  timestamp: now.iso,
  createdAt: now.iso
});
```

## 最佳实践

### 1. 段位初始化
- 在玩家首次参与锦标赛时自动初始化段位
- 确保段位数据的一致性

### 2. 匹配算法选择
- 小规模比赛：使用 `segment_based` 算法
- 大规模比赛：使用 `skill_based` 算法
- 快速匹配：使用 `random` 算法

### 3. 分数平衡
- 定期调整段位分数奖励配置
- 监控段位分布，避免段位集中

### 4. 错误处理
- 完善的错误处理和回滚机制
- 详细的日志记录和监控

## 总结

段位系统集成为多人在线游戏提供了完整的排名和匹配解决方案。通过智能的段位兼容性计算、灵活的奖励配置和高效的批量操作，系统能够支持大规模玩家参与的各种锦标赛模式。

关键特性：
- ✅ 8级段位系统，支持分数范围0-9999+
- ✅ 智能段位兼容性匹配算法
- ✅ 多种锦标赛类型的段位奖励配置
- ✅ 完整的API接口和示例代码
- ✅ 性能优化的数据库设计
- ✅ 详细的监控和日志系统

该集成方案为游戏提供了公平、可扩展的竞技环境，支持玩家的长期参与和成长。 