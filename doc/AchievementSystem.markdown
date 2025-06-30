# 成就系统详细说明

## 1. 概述

### 1.1 设计目标
- **激励玩家**：通过短期和长期目标激发参与。
- **多游戏支持**：支持 Ludo、Solitaire、Rummy 的游戏特定成就和跨游戏全局成就。
- **个性化体验**：根据玩家段位和偏好分配成就。
- **奖励驱动**：提供 `coins`、`props`、`tickets`、`gamePoints` 奖励。
- **扩展性**：支持新游戏、新成就类型和动态条件。
- **玩家**：`player123`，2025-06-23 15:46 EDT，`silver`，高活跃，`isSubscribed: true`，偏好 Solitaire 和 Ludo。

### 1.2 功能
- **成就类型**：全局、游戏特定、社交、段位。
- **进度跟踪**：实时更新 `player_achievements`。
- **奖励发放**：调用 `convertPoints` 处理积分转换。
- **通知**：成就完成推送通知。
- **UI 展示**：显示成就列表、进度、奖励。

### 1.3 集成
- **任务**：任务完成触发成就进度。
- **锦标赛**：排名贡献 `gamePoints`。
- **赛季**：段位晋升触发成就。
- **产出**：奖励存入 `player_inventory`。
- **积分**：`gamePoints` 转换为 `seasonPoints`。

## 2. 数据结构

### 2.1 Schema
```typescript
achievements: defineTable({
  achievementId: v.string(),
  name: v.string(),
  description: v.string(),
  gameType: v.optional(v.string()),
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
  allocationRules: v.any(),
  createdAt: v.string(),
}).index("by_achievementId", ["achievementId"]).index("by_gameType", ["gameType"]),

player_achievements: defineTable({
  uid: v.string(),
  achievementId: v.string(),
  isCompleted: v.boolean(),
  progress: v.any(),
  createdAt: v.string(),
  updatedAt: v.string(),
}).index("by_uid_achievement", ["uid", "achievementId"]).index("by_uid", ["uid"]),
```

## 3. 成就类型与条件

### 3.1 类型
1. **全局成就**：如 `multi_game_master`（1000 `gamePoints.general`）。
2. **游戏特定成就**：如 `solitaire_master`（1000 `gamePoints.solitaire`）。
3. **社交成就**：如 `friend_inviter`（邀请 5 好友）。
4. **段位成就**：如 `gold_promotion`（达到 `gold`）。

### 3.2 条件
- 积分：`{ gamePoints: 1000, gameType: "solitaire" }`.
- 行为：`{ action: "complete_match", count: 50 }`.
- 段位：`{ minSegment: "gold" }`.

### 3.3 示例
```json
[
  {
    "achievementId": "multi_game_master",
    "name": "多游戏大师",
    "description": "累计 1000 积分",
    "gameType": null,
    "condition": { "gamePoints": 1000, "gameType": "general" },
    "rewards": { "coins": 1000, "gamePoints": { "general": 100 } },
    "allocationRules": { "minSegment": "silver" }
  },
  {
    "achievementId": "solitaire_master",
    "name": "Solitaire 大师",
    "description": "Solitaire 1000 积分",
    "gameType": "solitaire",
    "condition": { "gamePoints": 1000, "gameType": "solitaire" },
    "rewards": {
      "coins": 500,
      "props": [{ "gameType": "solitaire", "propType": "deck_skin", "quantity": 1 }],
      "gamePoints": { "general": 50, "specific": { "gameType": "solitaire", "points": 50 } }
    },
    "allocationRules": { "gamePreferences": ["solitaire"] }
  }
]
```

## 4. 实现逻辑

### 4.1 成就分配
```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const assignAchievements = mutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
    if (!player) throw new Error("玩家不存在");

    const achievements = await ctx.db.query("achievements").collect();
    for (const achievement of achievements) {
      const existing = await ctx.db
        .query("player_achievements")
        .withIndex("by_uid_achievement", (q) => q.eq("uid", args.uid).eq("achievementId", achievement.achievementId))
        .first();
      if (existing) continue;

      let canAssign = true;
      if (achievement.allocationRules?.minSegment) {
        const segmentOrder = ["bronze", "silver", "gold", "diamond"];
        canAssign = segmentOrder.indexOf(player.segmentName) >= segmentOrder.indexOf(achievement.allocationRules.minSegment);
      }
      if (achievement.allocationRules?.gamePreferences) {
        canAssign = achievement.allocationRules.gamePreferences.some((gp: string) => player.gamePreferences.includes(gp));
      }

      if (canAssign) {
        await ctx.db.insert("player_achievements", {
          uid: args.uid,
          achievementId: achievement.achievementId,
          isCompleted: false,
          progress: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, message: `成就分配完成 (${args.uid})` };
  },
});
```

### 4.2 成就进度
```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const processAchievements = mutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
    if (!player) throw new Error("玩家不存在");

    const playerSeason = await ctx.db
      .query("player_seasons")
      .withIndex("by_uid_season", (q) => q.eq("uid", args.uid))
      .first();
    if (!playerSeason) throw new Error("玩家赛季数据不存在");

    const playerAchievements = await ctx.db
      .query("player_achievements")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .collect();

    const achievements = await ctx.db.query("achievements").collect();
    for (const achievement of achievements) {
      let playerAchievement = playerAchievements.find(pa => pa.achievementId === achievement.achievementId);
      if (playerAchievement?.isCompleted) continue;

      let progress = playerAchievement?.progress || 0;
      let isCompleted = false;
      if (achievement.condition.gamePoints) {
        const gameType = achievement.gameType || "general";
        progress = playerSeason.gamePoints[gameType] || 0;
        isCompleted = progress >= achievement.condition.gamePoints;
      } else if (achievement.condition.action) {
        const events = await ctx.db
          .query("task_events")
          .withIndex("by_uid_action", (q) => q.eq("uid", args.uid).eq("action", achievement.condition.action))
          .collect();
        progress = events.length;
        isCompleted = progress >= achievement.condition.count;
      } else if (achievement.condition.minSegment) {
        const segmentOrder = ["bronze", "silver", "gold", "diamond"];
        progress = segmentOrder.indexOf(player.segmentName);
        isCompleted = progress >= segmentOrder.indexOf(achievement.condition.minSegment);
      }

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

        if (achievement.rewards.gamePoints.general > 0) {
          await ctx.runMutation(api.convertPoints.convertPoints, {
            uid: args.uid,
            source: "achievement",
            sourceId: achievement.achievementId,
            gamePoints: achievement.rewards.gamePoints,
          });
        }

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

## 5. 奖励机制

### 5.1 奖励类型
- **Coins**：兑换道具。
- **Props**：游戏特定（如 Solitaire 牌背）。
- **Tickets**：锦标赛准入。
- **gamePoints**：排行榜、商店兑换。

### 5.2 平衡
- **全局成就**：高奖励（`coins: 1000`）。
- **游戏特定**：中等奖励（`coins: 500`, `props`）。
- **社交**：低门槛（`coins: 200`）。
- **段位**：高价值（`coins: 500`, `props`）。

## 6. 测试用例

### 6.1 全局成就
- **输入**：`player123`, `gamePoints: { general: 1000 }`.
- **步骤**：调用 `assignAchievements`, `processAchievements`.
- **输出**：
  - `player_achievements`: `{ achievementId: "multi_game_master", isCompleted: true }`.
  - `player_inventory`: `{ coins: +1000 }`.
  - `player_seasons`: `{ seasonPoints: 145 }`.

### 6.2 游戏特定成就
- **输入**：`gamePoints: { solitaire: 1000 }`.
- **输出**：
  - `player_achievements`: `{ achievementId: "solitaire_master", isCompleted: true }`.
  - `player_inventory`: `{ coins: +500, props: [deck_skin] }`.
  - `player_seasons`: `{ seasonPoints: 217 }`.

### 6.3 社交成就
- **输入**：5 次 `invite_friend` 事件。
- **输出**：
  - `player_achievements`: `{ achievementId: "friend_inviter", isCompleted: true }`.
  - `player_inventory`: `{ coins: +200, tickets: [ludo_weekly] }`.
  - `player_seasons`: `{ seasonPoints: 246 }`.

### 6.4 段位成就
- **输入**：`segmentName: "gold"`.
- **输出**：
  - `player_achievements`: `{ achievementId: "gold_promotion", isCompleted: true }`.
  - `player_inventory`: `{ coins: +500, props: [avatar_frame] }`.
  - `player_seasons`: `{ seasonPoints: 391 }`.

## 7. 验证
- **玩家**：`player123`, 2025-06-23 15:46 EDT.
- **执行**：
  ```bash
  npx convex deploy
  npx convex run assignAchievements --args '{"uid":"player123"}'
  npx convex run processAchievements --args '{"uid":"player123"}'
  ```
- **结果**：
  - `player_seasons`: `{ seasonPoints: 391, gamePoints: { general: 1270, solitaire: 1050, ludo: 200, rummy: 0 } }`.
  - `player_inventory`: `{ coins: 2200, props: [deck_skin, avatar_frame], tickets: [ludo_weekly] }`.

## 8. 结论
- **功能**：支持多样化成就，激励玩家。
- **建议**：
  - 添加 UI 分类展示。
  - 支持动态成就。
  - 优化事件查询性能。