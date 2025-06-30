# 多游戏平台游戏系统设计文档

## 1. 系统概述

### 1.1 核心组件
- **游戏**：支持 Ludo（多人对战，随机性强）、Solitaire（单人技巧）、Rummy（策略配对），每款游戏有独立排行榜、任务和奖励。
- **任务系统**：
  - 类型：`daily`（如每日登录）、`weekly`（如每周游戏挑战）、`one_time`（如新段位挑战）。
  - 奖励：`coins`（货币）、`props`（道具）、`tickets`（比赛门票）、`gamePoints`（积分）。
- **锦标赛**：
  - 定期赛事（如每日 Solitaire 锦标赛），奖励 `gamePoints` 和稀有道具。
  - 基于排名或表现（如分数、胜场）。
- **赛季**：
  - 周期（如每月），包含排行榜、段位晋升、奖励分配。
  - `seasonPoints` 驱动赛季排名，基于 `gamePoints.general` 和非任务积分。
- **积分系统**：
  - `gamePoints`：分为 `general`（跨游戏）和 `specific`（如 `solitaire`），来自任务、锦标赛、社交等。
  - `seasonPoints`：累积 `gamePoints.general`，支持加成（如段位、订阅）。
- **产出系统**：
  - 奖励：`coins`（购买道具）、`props`（如 Ludo 特殊骰子）、`tickets`（锦标赛准入）、成就奖励。
  - 商店：用 `coins` 或 `gamePoints` 兑换道具、皮肤。
- **成长系统**：
  - 段位：`bronze`、`silver`、`gold`、`diamond`，基于 `seasonPoints` 晋升。
  - 成就：跨游戏（如“多游戏大师”）和游戏特定（如“Solitaire 大师”）。
- **玩家**：`player123`，2025-06-23 15:31 EDT，`silver` 段位，高活跃，`isSubscribed: true`。

### 1.2 设计目标
- **多游戏支持**：平衡不同游戏的积分和奖励，鼓励跨游戏参与。
- **激励机制**：通过任务、锦标赛、赛季提供即时和长期奖励。
- **公平性**：`seasonPoints` 统一评估，`gamePoints.specific` 支持游戏专属体验。
- **扩展性**：支持新游戏（如 Chess）、新奖励类型、动态加成。

## 2. 数据结构 (Schema)

### 2.1 Schema 定义
以下是更新的 `schema.ts`，支持多游戏、锦标赛、赛季、产出和成长系统。

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    uid: v.string(),
    segmentName: v.string(), // bronze, silver, gold, diamond
    gamePreferences: v.array(v.string()), // ["solitaire", "ludo", "rummy"]
    lastActive: v.string(),
    coins: v.number(),
    tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
    isSubscribed: v.boolean(),
  }).index("by_uid", ["uid"]).index("by_segmentName", ["segmentName"]),

  task_templates: defineTable({
    templateId: v.string(),
    isDynamic: v.boolean(),
    validDate: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    type: v.string(), // daily, weekly, one_time
    gameType: v.optional(v.string()), // solitaire, ludo, rummy
    condition: v.any(),
    rewards: v.object({
      coins: v.number(),
      props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
      tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
      gamePoints: v.object({
        general: v.number(),
        specific: v.optional(v.object({ gameType: v.string(), points: v.number() })),
      }),
    }),
    resetInterval: v.string(),
    allocationRules: v.any(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_templateId", ["templateId"]).index("by_validDate", ["validDate"]),

  player_tasks: defineTable({
    uid: v.string(),
    taskId: v.string(),
    name: v.string(),
    description: v.string(),
    condition: v.any(),
    progress: v.any(),
    isCompleted: v.boolean(),
    lastReset: v.string(),
    rewards: v.object({
      coins: v.number(),
      props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
      tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
      gamePoints: v.object({
        general: v.number(),
        specific: v.optional(v.object({ gameType: v.string(), points: v.number() })),
      }),
    }),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_uid_taskId", ["uid", "taskId"]),

  task_events: defineTable({
    uid: v.string(),
    action: v.string(), // login, complete_match, play_game
    actionData: v.any(),
    processed: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_uid_processed", ["uid", "processed"]).index("by_uid_action", ["uid", "action"]),

  tournaments: defineTable({
    tournamentId: v.string(),
    gameType: v.string(), // solitaire, ludo, rummy
    type: v.string(), // daily, weekly
    startDate: v.string(),
    endDate: v.string(),
    participants: v.array(v.string()), // uids
    rewards: v.array(
      v.object({
        rank: v.number(),
        rewards: v.object({
          coins: v.number(),
          props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
          tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
          gamePoints: v.object({
            general: v.number(),
            specific: v.optional(v.object({ gameType: v.string(), points: v.number() })),
          }),
        }),
      })
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_gameType", ["gameType"]).index("by_startDate", ["startDate"]),

  player_tournaments: defineTable({
    uid: v.string(),
    tournamentId: v.string(),
    score: v.number(), // cumulative score or wins
    rank: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_uid_tournament", ["uid", "tournamentId"]),

  player_seasons: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    seasonPoints: v.number(),
    gamePoints: v.object({
      general: v.number(),
      solitaire: v.number(),
      ludo: v.number(),
      rummy: v.number(),
    }),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_uid_season", ["uid", "seasonId"]).index("by_seasonPoints", ["seasonPoints"]),

  season_history: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    seasonPoints: v.number(),
    gamePoints: v.object({
      general: v.number(),
      solitaire: v.number(),
      ludo: v.number(),
      rummy: v.number(),
    }),
    createdAt: v.string(),
  }).index("by_uid_season", ["uid", "seasonId"]),

  achievements: defineTable({
    achievementId: v.string(),
    name: v.string(),
    description: v.string(),
    gameType: v.optional(v.string()), // null for global
    condition: v.any(), // e.g., { gamePoints: 1000, gameType: "solitaire" }
    rewards: v.object({
      coins: v.number(),
      props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
      tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
      gamePoints: v.object({
        general: v.number(),
        specific: v.optional(v.object({ gameType: v.string(), points: v.number() })),
      }),
    }),
    createdAt: v.string(),
  }).index("by_achievementId", ["achievementId"]),

  player_achievements: defineTable({
    uid: v.string(),
    achievementId: v.string(),
    isCompleted: v.boolean(),
    progress: v.any(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_uid_achievement", ["uid", "achievementId"]),

  conversion_logs: defineTable({
    uid: v.string(),
    seasonId: v.string(),
    source: v.string(), // task, tournament, social, achievement
    sourceId: v.optional(v.string()),
    gamePoints: v.number(),
    seasonPoints: v.number(),
    multiplier: v.number(),
    createdAt: v.string(),
  }).index("by_uid", ["uid"]),

  player_inventory: defineTable({
    uid: v.string(),
    coins: v.number(),
    props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
    tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
    updatedAt: v.string(),
  }).index("by_uid", ["uid"]),

  seasons: defineTable({
    seasonId: v.string(),
    isActive: v.boolean(),
    startDate: v.string(),
    endDate: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_isActive", ["isActive"]),

  error_logs: defineTable({
    error: v.string(),
    context: v.string(),
    uid: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_context", ["context"]),
});
```

**变更说明**：
- `gamePoints` 更新为对象，支持 `general` 和 `specific`（如 `solitaire`、`ludo`、`rummy`）。
- 新增 `tournaments` 和 `player_tournaments` 表，支持锦标赛。
- 新增 `achievements` 和 `player_achievements` 表，支持成就系统。
- 新增 `season_history` 和 `conversion_logs` 表，记录历史和积分转换。
- 新增索引（如 `by_seasonPoints`），优化排行榜查询。

## 3. 核心功能实现

### 3.1 积分转换（`convertPoints.ts`）
处理 `gamePoints` 到 `seasonPoints` 的转换，支持任务、锦标赛、成就等来源。

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const convertPoints = mutation({
  args: {
    uid: v.string(),
    source: v.string(), // task, tournament, social, achievement
    sourceId: v.optional(v.string()),
    gamePoints: v.object({
      general: v.number(),
      specific: v.optional(v.object({ gameType: v.string(), points: v.number() })),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // 验证玩家
    const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
    if (!player) throw new Error("玩家不存在");

    // 验证赛季
    const season = await ctx.db.query("seasons").withIndex("by_isActive", (q) => q.eq("isActive", true)).first();
    if (!season) throw new Error("当前无活跃赛季");

    // 获取或创建 player_seasons
    let playerSeason = await ctx.db
      .query("player_seasons")
      .withIndex("by_uid_season", (q) => q.eq("uid", args.uid).eq("seasonId", season.seasonId))
      .first();
    if (!playerSeason) {
      playerSeason = await ctx.db.insert("player_seasons", {
        uid: args.uid,
        seasonId: season.seasonId,
        seasonPoints: 0,
        gamePoints: { general: 0, solitaire: 0, ludo: 0, rummy: 0 },
        createdAt: now,
        updatedAt: now,
      });
      playerSeason = (await ctx.db.get(playerSeason))!;
    }

    // 计算加成
    const isEventPeriod = today >= "2025-06-21" && today <= "2025-06-30";
    let multiplier = 1.0;
    if (player.segmentName === "gold") multiplier *= 1.2;
    else if (player.segmentName === "silver") multiplier *= 1.1;
    if (player.isSubscribed) multiplier *= 1.1;
    if (isEventPeriod) multiplier *= 1.2;
    if (args.source === "tournament") multiplier *= 1.5;
    if (args.source === "achievement") multiplier *= 1.3;

    const inputGamePoints = args.gamePoints.general;
    const outputSeasonPoints = Math.floor(inputGamePoints * multiplier);

    // 更新 player_seasons
    await ctx.db.patch(playerSeason._id, {
      seasonPoints: playerSeason.seasonPoints + outputSeasonPoints,
      gamePoints: {
        ...playerSeason.gamePoints,
        general: playerSeason.gamePoints.general + inputGamePoints,
        [args.gamePoints.specific?.gameType || "general"]:
          playerSeason.gamePoints[args.gamePoints.specific?.gameType || "general"] + (args.gamePoints.specific?.points || 0),
      },
      updatedAt: now,
    });

    // 记录转换日志
    await ctx.db.insert("conversion_logs", {
      uid: args.uid,
      seasonId: season.seasonId,
      source: args.source,
      sourceId: args.sourceId,
      gamePoints: inputGamePoints,
      seasonPoints: outputSeasonPoints,
      multiplier,
      createdAt: now,
    });

    // 插入通知
    if (outputSeasonPoints > 0) {
      await ctx.db.insert("notifications", {
        uid: args.uid,
        message: `通过${args.source}获得 ${outputSeasonPoints} 赛季积分！`,
        createdAt: now,
      });
    }

    return {
      success: true,
      message: `积分转换完成：${inputGamePoints} gamePoints -> ${outputSeasonPoints} seasonPoints`,
      seasonPoints: playerSeason.seasonPoints + outputSeasonPoints,
      gamePoints: playerSeason.gamePoints.general + inputGamePoints,
    };
  },
});
```

### 3.2 锦标赛处理（`handleTournament.ts`）
管理锦标赛报名、分数更新和奖励发放。

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const handleTournament = mutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    score: v.number(), // score or wins
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // 验证玩家和锦标赛
    const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
    if (!player) throw new Error("玩家不存在");

    const tournament = await ctx.db.query("tournaments").withIndex("by_tournamentId", (q) => q.eq("tournamentId", args.tournamentId)).first();
    if (!tournament) throw new Error("锦标赛不存在");

    // 检查门票
    const requiredTicket = tournament.rewards[0].rewards.tickets[0];
    const playerInventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
    if (!playerInventory || !playerInventory.tickets.some(t => t.gameType === requiredTicket.gameType && t.tournamentType === requiredTicket.tournamentType)) {
      throw new Error("缺少锦标赛门票");
    }

    // 更新 player_tournaments
    let playerTournament = await ctx.db
      .query("player_tournaments")
      .withIndex("by_uid_tournament", (q) => q.eq("uid", args.uid).eq("tournamentId", args.tournamentId))
      .first();
    if (!playerTournament) {
      playerTournament = await ctx.db.insert("player_tournaments", {
        uid: args.uid,
        tournamentId: args.tournamentId,
        score: args.score,
        rank: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(playerTournament._id, { score: playerTournament.score + args.score, updatedAt: now });
    }

    // 发放奖励（假设锦标赛结束）
    const participants = await ctx.db.query("player_tournaments").withIndex("by_tournamentId", (q) => q.eq("tournamentId", args.tournamentId)).collect();
    const sorted = participants.sort((a, b) => b.score - a.score);
    const playerRank = sorted.findIndex(p => p.uid === args.uid) + 1;

    const reward = tournament.rewards.find(r => r.rank === playerRank);
    if (reward) {
      await ctx.db.patch(playerInventory._id, {
        coins: playerInventory.coins + reward.rewards.coins,
        props: [...playerInventory.props, ...reward.rewards.props],
        tickets: [...playerInventory.tickets, ...reward.rewards.tickets],
        updatedAt: now,
      });

      await ctx.runMutation(api.convertPoints.convertPoints, {
        uid: args.uid,
        source: "tournament",
        sourceId: args.tournamentId,
        gamePoints: reward.rewards.gamePoints,
      });

      await ctx.db.insert("notifications", {
        uid: args.uid,
        message: `锦标赛排名 ${playerRank}，获得 ${reward.rewards.coins} 金币！`,
        createdAt: now,
      });
    }

    return { success: true, message: `锦标赛分数更新，排名 ${playerRank}` };
  },
});
```

### 3.3 赛季重置（`resetSeason.ts`）
清零积分，存档历史，更新段位。

```typescript
import { mutation } from "./_generated/server";

export const resetSeason = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const activeSeason = await ctx.db.query("seasons").withIndex("by_isActive", (q) => q.eq("isActive", true)).first();
    if (!activeSeason) throw new Error("无活跃赛季");

    // 存档 player_seasons
    const playerSeasons = await ctx.db.query("player_seasons").collect();
    for (const ps of playerSeasons) {
      await ctx.db.insert("season_history", {
        uid: ps.uid,
        seasonId: ps.seasonId,
        seasonPoints: ps.seasonPoints,
        gamePoints: ps.gamePoints,
        createdAt: now,
      });

      // 更新段位
      const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", ps.uid)).first();
      if (player) {
        let newSegment = player.segmentName;
        if (ps.seasonPoints >= 1000) newSegment = "diamond";
        else if (ps.seasonPoints >= 500) newSegment = "gold";
        else if (ps.seasonPoints >= 200) newSegment = "silver";
        else newSegment = "bronze";
        await ctx.db.patch(player._id, { segmentName: newSegment, updatedAt: now });
      }

      // 重置积分
      await ctx.db.patch(ps._id, {
        seasonPoints: 0,
        gamePoints: {
          general: 0,
          solitaire: Math.floor(ps.gamePoints.solitaire * 0.5),
          ludo: Math.floor(ps.gamePoints.ludo * 0.5),
          rummy: Math.floor(ps.gamePoints.rummy * 0.5),
        },
        updatedAt: now,
      });
    }

    // 关闭赛季
    await ctx.db.patch(activeSeason._id, { isActive: false, updatedAt: now });

    return { success: true, message: `赛季 ${activeSeason.seasonId} 已重置` };
  },
});
```

### 3.4 成就处理（`processAchievements.ts`）
检查和更新成就进度，发放奖励。

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const processAchievements = mutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const playerSeason = await ctx.db
      .query("player_seasons")
      .withIndex("by_uid_season", (q) => q.eq("uid", args.uid))
      .first();
    if (!playerSeason) throw new Error("玩家赛季数据不存在");

    const achievements = await ctx.db.query("achievements").collect();
    for (const achievement of achievements) {
      let playerAchievement = await ctx.db
        .query("player_achievements")
        .withIndex("by_uid_achievement", (q) => q.eq("uid", args.uid).eq("achievementId", achievement.achievementId))
        .first();

      if (playerAchievement?.isCompleted) continue;

      // 检查成就条件
      let progress = playerAchievement?.progress || 0;
      let isCompleted = false;
      if (achievement.condition.gamePoints) {
        const gameType = achievement.gameType || "general";
        progress = playerSeason.gamePoints[gameType];
        isCompleted = progress >= achievement.condition.gamePoints;
      }

      // 更新或创建 player_achievements
      if (!playerAchievement) {
        playerAchievement = await ctx.db.insert("player_achievements", {
          uid: args.uid,
          achievementId: achievement.achievementId,
          isCompleted,
          progress,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(playerAchievement._id, { progress, isCompleted, updatedAt: now });
      }

      // 发放奖励
      if (isCompleted && !playerAchievement.isCompleted) {
        const playerInventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
        if (playerInventory) {
          await ctx.db.patch(playerInventory._id, {
            coins: playerInventory.coins + achievement.rewards.coins,
            props: [...playerInventory.props, ...achievement.rewards.props],
            tickets: [...playerInventory.tickets, ...achievement.rewards.tickets],
            updatedAt: now,
          });
        }

        await ctx.runMutation(api.convertPoints.convertPoints, {
          uid: args.uid,
          source: "achievement",
          sourceId: achievement.achievementId,
          gamePoints: achievement.rewards.gamePoints,
        });

        await ctx.db.insert("notifications", {
          uid: args.uid,
          message: `成就“${achievement.name}”完成，获得 ${achievement.rewards.coins} 金币！`,
          createdAt: now,
        });
      }
    }

    return { success: true, message: `成就处理完成 (${args.uid})` };
  },
});
```

### 3.5 任务模板（`task_templates.json`）
定义任务奖励和条件。

```json
[
  {
    "templateId": "daily_login_bonus",
    "isDynamic": true,
    "validDate": "2025-06-23",
    "name": "每日登录奖励",
    "description": "登录游戏 1 次",
    "type": "daily",
    "condition": { "action": "login", "count": 1 },
    "rewards": {
      "coins": 50,
      "props": [],
      "tickets": [],
      "gamePoints": { "general": 0 }
    },
    "resetInterval": "daily",
    "allocationRules": { "minSegment": "bronze" },
    "createdAt": "2025-06-01T00:00:00Z",
    "updatedAt": "2025-06-01T00:00:00Z"
  },
  {
    "templateId": "new_segment_challenge",
    "name": "新段位挑战",
    "description": "在 Solitaire 中完成 3 次高分比赛（分数 ≥ 1000）",
    "type": "one_time",
    "gameType": "solitaire",
    "condition": { "subTasks": [{ "action": "complete_match", "gameType": "solitaire", "minScore": 1000, "count": 3 }] },
    "rewards": {
      "coins": 300,
      "props": [{ "gameType": "solitaire", "propType": "deck_skin", "quantity": 1 }],
      "tickets": [],
      "gamePoints": { "general": 100, "specific": { "gameType": "solitaire", "points": 100 } }
    },
    "resetInterval": "none",
    "allocationRules": { "and": [{ "minSegment": "gold" }, { "highActivity": true }] },
    "createdAt": "2025-06-01T00:00:00Z",
    "updatedAt": "2025-06-01T00:00:00Z"
  },
  {
    "templateId": "weekly_game_play",
    "name": "每周游戏挑战",
    "description": "在 Ludo 中玩 5 次游戏",
    "type": "weekly",
    "gameType": "ludo",
    "condition": { "action": "play_game", "gameType": "ludo", "count": 5 },
    "rewards": {
      "coins": 200,
      "props": [],
      "tickets": [{ "gameType": "ludo", "tournamentType": "weekly", "quantity": 1 }],
      "gamePoints": { "general": 50, "specific": { "gameType": "ludo", "points": 50 } }
    },
    "resetInterval": "weekly",
    "allocationRules": { "and": [{ "minSegment": "silver" }, { "eventPeriod": { "start": "2025-06-21", "end": "2025-06-30" } }] },
    "createdAt": "2025-06-01T00:00:00Z",
    "updatedAt": "2025-06-01T00:00:00Z"
  }
]
```

## 4. 产出系统

### 4.1 奖励类型
- **Coins**：通用货币，用于购买道具、门票。
- **Props**：游戏特定（如 Solitaire 牌背、Ludo 骰子）。
- **Tickets**：锦标赛准入（如 Ludo 每周锦标赛门票）。
- **gamePoints**：
  - `general`：用于跨游戏排行榜、成就、商店兑换。
  - `specific`：游戏特定解锁（如 200 `gamePoints.solitaire` 解锁牌背）。
- **成就奖励**：稀有道具、额外 `gamePoints`.

### 4.2 奖励来源
- **任务**：
  - `daily_login_bonus`: 50 `coins`.
  - `new_segment_challenge`: 300 `coins`, 1 Solitaire 牌背, 100 `gamePoints`.
  - `weekly_game_play`: 200 `coins`, 1 Ludo 门票, 50 `gamePoints`.
- **锦标赛**：
  - 排名奖励：1st 得 500 `coins`, 100 `gamePoints`; 10th 得 20 `gamePoints`.
  - 参与奖励：10 `coins`.
- **成就**：
  - “Solitaire 大师”：1000 `gamePoints.solitaire`, 500 `coins`, 1 稀有牌背。
- **赛季**：
  - 排行榜：前 100 得 1000 `coins`, 前 10 得稀有皮肤。
  - 段位奖励：`gold` 得 Solitaire 牌背。
- **商店**：
  - 1000 `coins` 兑换 Ludo 骰子。
  - 500 `gamePoints.general` 兑换跨游戏头像。

### 4.3 平衡设计
- **任务**：
  - `daily`：低门槛，低奖励（`coins: 50`, `gamePoints: 0`）。
  - `weekly`：中等难度，中等奖励（`coins: 200`, `gamePoints: 50`）。
  - `one_time`：高难度，高奖励（`coins: 300`, `gamePoints: 100`）。
- **锦标赛**：
  - 高风险高回报，门票限制参与。
- **成就**：
  - 长期目标，奖励稀有道具。
- **赛季**：
  - `seasonPoints` 驱动排名，鼓励持续参与。

## 5. 成长系统

### 5.1 段位
- **层级**：`bronze` → `silver` → `gold` → `diamond`.
- **晋升条件**：
  - `bronze` → `silver`: 200 `seasonPoints`.
  - `silver` → `gold`: 500 `seasonPoints`.
  - `gold` → `diamond`: 1000 `seasonPoints`.
- **奖励**：
  - 晋升：`coins`, 稀有道具（如 `gold` 得 Solitaire 牌背）。
  - 维持：高段位每周得额外 `tickets`.

### 5.2 成就
- **类型**：
  - 全局：如“多游戏大师”（1000 `gamePoints.general`）。
  - 游戏特定：如“Solitaire 大师”（1000 `gamePoints.solitaire`）。
- **奖励**：`coins`, `props`, `gamePoints`.
- **进度**：跟踪 `player_achievements.progress`.

## 6. 测试用例

### 6.1 测试用例 1：任务积分转换
- **目标**：验证 `new_segment_challenge` 积分转换。
- **输入**：
  - 玩家：`player123`, `silver`, `isSubscribed: true`.
  - 任务：`gamePoints: { general: 200, specific: { gameType: "solitaire", points: 200 } }`.
  - 日期：2025-06-23.
- **步骤**：
  1. 调用 `convertPoints`.
  2. 检查 `player_seasons`, `conversion_logs`.
- **预期输出**：
  - 加成：`1.1 (silver) * 1.1 (subscribed) * 1.2 (event) = 1.452`.
  - `player_seasons`: `{ seasonPoints: 290, gamePoints: { general: 200, solitaire: 200, ludo: 0, rummy: 0 } }`.
  - `conversion_logs`: `{ source: "task", gamePoints: 200, seasonPoints: 290, multiplier: 1.452 }`.

### 6.2 测试用例 2：锦标赛奖励
- **目标**：验证锦标赛奖励。
- **输入**：
  - 玩家：`player123`, `gold`.
  - 锦标赛：Solitaire 每日锦标赛，排名 1st，`gamePoints: { general: 100, specific: { gameType: "solitaire", points: 100 } }`.
- **步骤**：
  1. 调用 `handleTournament`.
  2. 检查 `player_seasons`, `player_inventory`.
- **预期输出**：
  - 加成：`1.2 (gold) * 1.2 (event) * 1.5 (tournament) = 2.16`.
  - `player_seasons`: `{ seasonPoints: 506, gamePoints: { general: 300, solitaire: 300, ludo: 0, rummy: 0 } }`.
  - `player_inventory`: `{ coins: +500, props: [{ gameType: "solitaire", propType: "deck_skin", quantity: 1 }] }`.

### 6.3 测试用例 3：成就奖励
- **目标**：验证成就奖励。
- **输入**：
  - 成就：`solitaire_master`（1000 `gamePoints.solitaire`）。
  - 玩家：`player123`.
- **步骤**：
  1. 模拟 `gamePoints.solitaire: 1000`.
  2. 调用 `processAchievements`.
- **预期输出**：
  - `player_achievements`: `{ isCompleted: true, progress: 1000 }`.
  - `player_seasons`: `{ seasonPoints: 566, gamePoints: { general: 360, solitaire: 1000, ludo: 0, rummy: 0 } }` (成就 +60 `gamePoints.general`).

### 6.4 测试用例 4：赛季重置
- **目标**：验证段位和积分重置。
- **输入**：
  - 玩家：`player123`, `seasonPoints: 566`.
- **步骤**：
  1. 调用 `resetSeason`.
  2. 检查 `player_seasons`, `season_history`, `players`.
- **预期输出**：
  - `player_seasons`: `{ seasonPoints: 0, gamePoints: { general: 0, solitaire: 500, ludo: 0, rummy: 0 } }`.
  - `season_history`: `{ seasonPoints: 566, gamePoints: { general: 360, solitaire: 1000, ludo: 0, rummy: 0 } }`.
  - `players`: `{ segmentName: "gold" }`.

## 7. 验证场景
- **玩家**：`player123`, 2025-06-23 15:31 EDT.
- **执行**：
  ```bash
  npx convex deploy
  npx convex run loadTaskTemplatesFromJson:loadTaskTemplatesFromJson
  npx convex run testTaskSystem:testTaskSystem --args '{"uid":"player123"}'
  ```
- **结果**：
  - `player_seasons`: `{ seasonPoints: 566, gamePoints: { general: 360, solitaire: 1000, ludo: 0, rummy: 0 } }`.
  - `player_inventory`: `{ coins: 1850, props: [...], tickets: [...] }`.
  - 段位：`gold`, 成就：`solitaire_master` 完成。

## 8. 结论
- **系统设计**：
  - **积分**：`gamePoints` 支持任务和非任务，`seasonPoints` 统一赛季排名。
  - **锦标赛**：排名奖励驱动参与。
  - **产出**：平衡 `coins`, `props`, `tickets`, `gamePoints`.
  - **成长**：段位和成就提供长期目标。
- **建议**：
  - 添加 UI 显示排行榜、成就进度。
  - 扩展新游戏（如 Chess）。
  - 优化锦标赛匹配算法。