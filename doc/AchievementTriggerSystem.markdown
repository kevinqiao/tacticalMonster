# 成就系统触发调用说明

## 1. 概述

本文档详细说明多游戏平台（Ludo、Solitaire、Rummy 等）成就系统中 `assignAchievements` 和 `processAchievements` 方法的触发调用时机，结合玩家 `player123` 在 2025-06-23 15:56 EDT 的场景（`silver` 段位，`isSubscribed: true`，偏好 Solitaire 和 Ludo）。

### 1.1 背景
- **成就系统**：支持全局、游戏特定、社交、段位成就，激励玩家参与。
- **方法**：
  - `assignAchievements`：为玩家分配符合条件的成就，插入 `player_achievements`。
  - `processAchievements`：检查成就进度，更新 `player_achievements`，发放奖励。
- **目标**：明确触发场景、调用时机、系统集成和验证步骤。

### 1.2 玩家场景
- **玩家**：`player123`，2025-06-23 15:56 EDT。
- **状态**：`silver` 段位，`isSubscribed: true`，`gamePreferences: ["solitaire", "ludo"]`，高活跃。

## 2. `assignAchievements` 触发调用

### 2.1 功能
- **作用**：根据 `allocationRules`（如段位、游戏偏好）为玩家分配成就，插入 `player_achievements`（`isCompleted: false`, `progress: 0`）。
- **输入**：`uid`（如 `player123`）。
- **输出**：新 `player_achievements` 记录。

### 2.2 触发场景
1. **玩家注册或首次登录**：
   - **场景**：新玩家注册或首次登录。
   - **目的**：分配基础成就（如 `friend_inviter`）。
   - **触发点**：`players` 表插入新记录或登录逻辑。
   - **示例**：`player123` 注册，分配 `multi_game_master`（`minSegment: bronze`）。

2. **段位变更**：
   - **场景**：玩家段位提升（如 `silver` 至 `gold`）。
   - **目的**：分配高段位成就（如 `gold_promotion`）。
   - **触发点**：`resetSeason.ts` 更新 `players.segmentName`。
   - **示例**：`player123` 升至 `gold`，分配 `gold_promotion`。

3. **游戏偏好更新**：
   - **场景**：玩家更新 `gamePreferences`（如添加 Rummy）。
   - **目的**：分配新偏好相关成就（如 `rummy_master`）。
   - **触发点**：`players.gamePreferences` 更新。
   - **示例**：`player123` 添加 Rummy，分配 `rummy_master`。

4. **新成就上线**：
   - **场景**：系统添加新成就（如 `chess_master`）。
   - **目的**：为符合条件的玩家分配新成就。
   - **触发点**：`achievements` 表插入新记录。
   - **示例**：`chess_master` 上线，分配给 `player123`（偏好 Chess）。

5. **周期性检查**：
   - **场景**：每日或每周检查遗漏分配。
   - **目的**：确保玩家获得所有符合条件的成就。
   - **触发点**：定时任务（如 Convex 调度器）。
   - **示例**：每日 00:00 EDT 检查 `player123`。

### 2.3 集成代码
- **玩家注册（`registerPlayer.ts`）**：
  ```typescript
  import { mutation } from "./_generated/server";
  import { v } from "convex/values";
  import { api } from "./_generated/api";

  export const registerPlayer = mutation({
    args: { uid: v.string(), segmentName: v.string(), gamePreferences: v.array(v.string()) },
    handler: async (ctx, args) => {
      const now = new Date().toISOString();
      await ctx.db.insert("players", {
        uid: args.uid,
        segmentName: args.segmentName,
        gamePreferences: args.gamePreferences,
        lastActive: now,
        coins: 0,
        tickets: [],
        isSubscribed: false,
      });

      await ctx.runMutation(api.assignAchievements.assignAchievements, { uid: args.uid });

      return { success: true, message: `玩家 ${args.uid} 注册成功` };
    },
  });
  ```

- **段位变更（`resetSeason.ts` 修改）**：
  ```typescript
  if (player) {
    let newSegment = player.segmentName;
    if (ps.seasonPoints >= 1000) newSegment = "diamond";
    else if (ps.seasonPoints >= 500) newSegment = "gold";
    else if (ps.seasonPoints >= 200) newSegment = "silver";
    else newSegment = "bronze";
    await ctx.db.patch(player._id, { segmentName: newSegment, updatedAt: now });

    await ctx.runMutation(api.assignAchievements.assignAchievements, { uid: ps.uid });
  }
  ```

- **定时任务（`scheduleAchievements.ts`）**：
  ```typescript
  import { cronJobs } from "convex/server";
  import { api } from "./_generated/api";

  export const scheduleAchievements = cronJobs();
  scheduleAchievements.cron(
    "每日成就分配",
    "0 0 * * *", // 每日 00:00 UTC
    api.assignAchievements.assignAchievements,
    { uid: "*" } // 批量处理
  );
  ```

### 2.4 触发频率
- **高频**：注册、段位变更、偏好更新。
- **低频**：新成就上线、周期性检查。

## 3. `processAchievements` 触发调用

### 3.1 功能
- **作用**：检查成就进度，更新 `player_achievements`，发放奖励，调用 `convertPoints` 处理积分。
- **输入**：`uid`（如 `player123`）。
- **输出**：更新 `player_achievements.progress` 和 `isCompleted`，奖励存入 `player_inventory`，积分记录在 `player_seasons` 和 `conversion_logs`。

### 3.2 触发场景
1. **任务完成**：
   - **场景**：玩家完成任务（如 `new_segment_challenge`），获得 `gamePoints`。
   - **目的**：检查积分成就（如 `solitaire_master`）。
   - **触发点**：`processTaskEvents.ts` 任务完成逻辑。
   - **示例**：`player123` 完成任务，获得 `gamePoints.solitaire: 100`。

2. **锦标赛结束**：
   - **场景**：玩家参与锦标赛（如 Solitaire 每日锦标赛）。
   - **目的**：检查积分或排名成就。
   - **触发点**：`handleTournament.ts` 奖励发放。
   - **示例**：`player123` 排名 1st，获得 `gamePoints.general: 100`。

3. **玩家行为事件**：
   - **场景**：玩家执行行为（如 `invite_friend`）。
   - **目的**：检查行为计数成就（如 `friend_inviter`）。
   - **触发点**：`task_events` 插入事件。
   - **示例**：`player123` 邀请好友。

4. **段位变更**：
   - **场景**：玩家段位提升（如 `silver` 至 `gold`）。
   - **目的**：检查段位成就（如 `gold_promotion`）。
   - **触发点**：`resetSeason.ts` 或段位更新。
   - **示例**：`player123` 升至 `gold`。

5. **游戏结束**：
   - **场景**：玩家完成一局游戏（如 Ludo 比赛）。
   - **目的**：检查比赛次数或胜率成就。
   - **触发点**：游戏结果处理（如 `completeMatch.ts`）。
   - **示例**：`player123` 完成 Ludo 比赛。

6. **周期性检查**：
   - **场景**：每日或每周检查成就进度。
   - **目的**：同步所有成就。
   - **触发点**：定时任务。
   - **示例**：每日 00:00 EDT 检查 `player123`。

### 3.3 集成代码
- **任务完成（`processTaskEvents.ts` 修改）**：
  ```typescript
  if (task.isCompleted && !existingTask.isCompleted) {
    await ctx.runMutation(api.convertPoints.convertPoints, {
      uid: task.uid,
      source: "task",
      sourceId: task.taskId,
      gamePoints: task.rewards.gamePoints,
    });

    await ctx.runMutation(api.processAchievements.processAchievements, { uid: task.uid });
  }
  ```

- **锦标赛结束（`handleTournament.ts` 修改）**：
  ```typescript
  if (reward) {
    await ctx.runMutation(api.convertPoints.convertPoints, {
      uid: args.uid,
      source: "tournament",
      sourceId: args.tournamentId,
      gamePoints: reward.rewards.gamePoints,
    });

    await ctx.runMutation(api.processAchievements.processAchievements, { uid: args.uid });
  }
  ```

- **行为事件（`logEvent.ts`）**：
  ```typescript
  import { mutation } from "./_generated/server";
  import { v } from "convex/values";
  import { api } from "./_generated/api";

  export const logEvent = mutation({
    args: { uid: v.string(), action: v.string(), actionData: v.any() },
    handler: async (ctx, args) => {
      const now = new Date().toISOString();
      await ctx.db.insert("task_events", {
        uid: args.uid,
        action: args.action,
        actionData: args.actionData,
        processed: false,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.runMutation(api.processAchievements.processAchievements, { uid: args.uid });

      return { success: true, message: `事件记录成功 (${args.action})` };
    },
  });
  ```

- **定时任务（`scheduleAchievements.ts` 修改）**：
  ```typescript
  scheduleAchievements.cron(
    "每日成就检查",
    "0 0 * * *", // 每日 00:00 UTC
    api.processAchievements.processAchievements,
    { uid: "*" } // 批量处理
  );
  ```

### 3.4 触发频率
- **高频**：任务完成、锦标赛结束、行为事件、游戏结束。
- **中频**：段位变更。
- **低频**：周期性检查。

## 4. 触发时机总结

| 方法                   | 触发场景                     | 触发点                              | 频率   |
|------------------------|------------------------------|-------------------------------------|--------|
| `assignAchievements`   | 玩家注册/首次登录            | `registerPlayer.ts`                 | 高频   |
|                        | 段位变更                     | `resetSeason.ts`                    | 中频   |
|                        | 游戏偏好更新                 | `updatePreferences.ts`              | 中频   |
|                        | 新成就上线                   | `addAchievement.ts`                 | 低频   |
|                        | 周期性检查                   | 定时任务                            | 低频   |
| `processAchievements`  | 任务完成                     | `processTaskEvents.ts`              | 高频   |
|                        | 锦标赛结束                   | `handleTournament.ts`               | 高频   |
|                        | 玩家行为事件                 | `logEvent.ts`                       | 高频   |
|                        | 段位变更                     | `resetSeason.ts`                    | 中频   |
|                        | 游戏结束                     | `completeMatch.ts`                  | 高频   |
|                        | 周期性检查                   | 定时任务                            | 低频   |

## 5. 验证场景
- **玩家**：`player123`，2025-06-23 15:56 EDT。
- **场景**：
  1. 完成 `new_segment_challenge`，获得 `gamePoints: { general: 100, specific: { gameType: "solitaire", points: 100 } }`.
  2. 参与 Solitaire 锦标赛，排名 1st，获得 `gamePoints: { general: 100 }`.
  3. 邀请 5 名好友，触发 `invite_friend` 事件。
  4. 升至 `gold` 段位。
- **执行**：
  ```bash
  npx convex deploy
  npx convex run processTaskEvents:processTaskEvents --args '{"uid":"player123"}'
  npx convex run handleTournament:handleTournament --args '{"uid":"player123","tournamentId":"solitaire_daily","score":1000}'
  npx convex run logEvent:logEvent --args '{"uid":"player123","action":"invite_friend","actionData":{"friendId":"friend1"}}'
  npx convex run resetSeason:resetSeason
  ```
- **结果**：
  - `player_achievements`：
    - `multi_game_master`: `progress: 200`, `isCompleted: false`.
    - `solitaire_master`: `progress: 100`, `isCompleted: false`.
    - `friend_inviter`: `progress: 5`, `isCompleted: true`.
    - `gold_promotion`: `progress: 2`, `isCompleted: true`.
  - `player_seasons`: `{ seasonPoints: 391, gamePoints: { general: 270, solitaire: 100, ludo: 0, rummy: 0 } }`.
  - `player_inventory`: `{ coins: 2200, props: [deck_skin, avatar_frame], tickets: [ludo_weekly] }`.

## 6. 结论
- **`assignAchievements`**：触发于玩家状态初始化或变化，确保成就分配。
- **`processAchievements`**：触发于行为或积分变化，更新进度和奖励。
- **建议**：
  - 批量处理降低数据库负载。
  - 使用事件队列（如 Kafka）异步处理高频触发。
  - UI 展示触发日志。