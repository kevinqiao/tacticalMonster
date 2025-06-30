基于你的要求，我将提供一个完整的工作流程测试代码，用于验证任务系统的生命周期（任务创建、分配、触发、处理、重置、展示），并实现分页查询以优化 `task_templates` 表的查询性能，替换之前的 `templateCache` 逻辑。测试代码将包括后端测试脚本（TypeScript，使用 Convex）和前端测试组件（React），确保系统在 Convex 环境下正常运行。分页查询将应用于 `assignTasks` 和 `loadTaskTemplatesFromJson`，以支持大规模任务模板。所有代码以中文注释说明，符合 artifact 要求。

---

### 1. 设计说明
#### 1.1 工作流程测试目标
- **验证生命周期**：
  - **任务创建**：通过 `loadTaskTemplatesFromJson` 加载 JSON 模板。
  - **任务分配**：通过 `assignTasks` 为玩家分配任务。
  - **任务触发**：模拟玩家行为（如登录、完成比赛）插入 `task_events`。
  - **任务处理**：通过 `processTaskEvents` 更新任务进度并发放奖励。
  - **任务重置**：通过 `resetTasks` 重置任务进度。
  - **定时分配**：通过 `scheduleTaskAssignment` 为活跃玩家分配任务。
  - **玩家更新**：通过 `updatePlayerProfile` 触发任务重新分配。
  - **前端展示**：通过 React 组件显示任务和进度。
- **测试场景**：
  - 玩家 `player123` 更新段位为“黄金”，偏好为 ["solitaire"]。
  - 分配“新段位挑战”任务（AND 条件：2 场比赛 + 1 场高分）。
  - 模拟完成 3 场比赛，验证进度更新和奖励发放。
  - 重置任务，验证进度清零。
  - 定时分配任务，验证批量分配。
- **测试工具**：使用 Convex 的 mutation 和 query，结合 Jest 或简单脚本验证结果。

#### 1.2 分页查询优化
- **目标**：在 `task_templates` 表数据量较大（如 >1000 条）时，优化查询性能。
- **实现**：
  - 在 `assignTasks` 中使用 `ctx.db.query("task_templates").paginate()` 分页加载模板。
  - 在 `loadTaskTemplatesFromJson` 中分页检查现有模板，减少查询开销。
  - 每页限制为 100 条记录，避免内存和延迟问题。
- **索引支持**：依赖 `by_templateId` 索引，确保快速查询。

---

### 2. 工作流程测试代码
以下是完整的测试代码，包括后端测试脚本（验证生命周期）和前端测试组件（验证展示）。分页查询集成到 `assignTasks` 和 `loadTaskTemplatesFromJson` 中。

#### 2.1 后端测试脚本
测试脚本模拟整个任务生命周期，使用 Convex mutation 和 query 验证功能。

```typescript
import { mutation } from "convex/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// 测试任务系统生命周期
export const testTaskSystem = mutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    try {
      // 1. 创建玩家
      const playerExists = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
      if (!playerExists) {
        await ctx.db.insert("players", {
          uid: args.uid,
          segmentName: "bronze",
          gamePreferences: ["solitaire"],
          lastActive: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 2. 加载任务模板
      const template = {
        templateId: "new_segment_challenge",
        name: "新段位挑战",
        description: "在新偏好游戏中完成比赛并获得高分",
        type: "daily",
        gameType: "dynamic",
        condition: {
          type: "and",
          subConditions: [
            { action: "complete_match", count: 2, gameType: "dynamic", minScore: 800 },
            { action: "complete_match", count: 1, gameType: "dynamic", minScore: 800 },
          ],
        },
        rewards: {
          coins: 200,
          props: [],
          tickets: [{ gameType: "dynamic", tournamentType: "daily_special", quantity: 1 }],
          gamePoints: 100,
        },
        resetInterval: "daily",
        allocationRules: { minSegment: "bronze", maxSegment: "diamond", gamePreferences: ["solitaire"] },
      };
      await ctx.scheduler.runAfter(0, api.loadTaskTemplatesFromJson.loadTaskTemplatesFromJson, {
        templates: [template],
      });

      // 3. 更新玩家资料（触发任务分配）
      await ctx.scheduler.runAfter(0, api.updatePlayerProfile.updatePlayerProfile, {
        uid: args.uid,
        segmentName: "gold",
        gamePreferences: ["solitaire"],
      });

      // 4. 验证任务分配
      const playerTasks = await ctx.db
        .query("player_tasks")
        .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
        .collect();
      if (playerTasks.length === 0) throw new Error("任务分配失败");

      const task = playerTasks.find((t) => t.taskId.includes("new_segment_challenge"));
      if (!task) throw new Error("未找到新段位挑战任务");

      // 5. 模拟完成比赛（触发任务事件）
      const matchEvents = [
        { action: "complete_match", actionData: { gameType: "solitaire", score: 1200, tournamentId: "t1" } },
        { action: "complete_match", actionData: { gameType: "solitaire", score: 1000, tournamentId: "t2" } },
        { action: "complete_match", actionData: { gameType: "solitaire", score: 900, tournamentId: "t3" } },
      ];
      for (const event of matchEvents) {
        await ctx.db.insert("task_events", {
          uid: args.uid,
          action: event.action,
          actionData: event.actionData,
          createdAt: now,
          processed: false,
          updatedAt: now,
        });
      }

      // 6. 处理任务事件
      await ctx.scheduler.runAfter(0, api.processTaskEvents.processTaskEvents, { uid: args.uid });

      // 7. 验证任务完成
      const updatedTask = await ctx.db
        .query("player_tasks")
        .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", task.taskId))
        .first();
      if (!updatedTask || !updatedTask.isCompleted) throw new Error("任务未完成");

      // 8. 验证奖励通知
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_uid", (q) => q.eq("uid", args.uid))
        .collect();
      if (!notifications.some((n) => n.message.includes("任务“新段位挑战”完成"))) throw new Error("奖励通知未生成");

      // 9. 重置任务
      await ctx.scheduler.runAfter(0, api.resetTasks.resetTasks, {});
      const resetTask = await ctx.db
        .query("player_tasks")
        .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", task.taskId))
        .first();
      if (!resetTask || resetTask.isCompleted || resetTask.progress["sub_0"] !== 0 || resetTask.progress["sub_1"] !== 0)
        throw new Error("任务重置失败");

      // 10. 定时分配任务
      await ctx.scheduler.runAfter(0, api.scheduleTaskAssignment.scheduleTaskAssignment, {});
      const reassignedTasks = await ctx.db
        .query("player_tasks")
        .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
        .collect();
      if (reassignedTasks.length === 0) throw new Error("定时任务分配失败");

      return { success: true, message: "任务系统生命周期测试通过" };
    } catch (error) {
      await ctx.db.insert("error_logs", {
        error: error.message,
        context: "testTaskSystem",
        uid: args.uid,
        createdAt: now,
      });
      return { success: false, message: `测试失败: ${error.message}` };
    }
  },
});
```

**说明**：
- **测试步骤**：
  1. 创建玩家 `player123`。
  2. 加载“新段位挑战”模板。
  3. 更新玩家资料，触发任务分配。
  4. 验证任务分配到 `player_tasks`。
  5. 模拟 3 场比赛，插入 `task_events`。
  6. 处理事件，验证任务完成和奖励通知。
  7. 重置任务，验证进度清零。
  8. 定时分配任务，验证重新分配。
- **运行方式**：
  ```bash
  npx convex run testTaskSystem:testTaskSystem --args '{"uid":"player123"}'
  ```
- **预期结果**：返回 `{ success: true, message: "任务系统生命周期测试通过" }`。

#### 2.2 前端测试组件
前端组件模拟玩家交互，验证任务展示和资料更新。

```jsx
import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// 测试任务系统前端交互
const TestTaskSystem = ({ uid }) => {
  const [segmentName, setSegmentName] = useState("bronze");
  const [gamePreferences, setGamePreferences] = useState(["solitaire"]);
  const [message, setMessage] = useState("");

  const player = useQuery(api.players.getPlayer, { uid });
  const tasks = useQuery(api.player_tasks.getPlayerTasks, { uid });
  const notifications = useQuery(api.notifications.getNotifications, { uid });
  const updateProfile = useMutation(api.updatePlayerProfile.updatePlayerProfile);
  const testTaskSystem = useMutation(api.testTaskSystem.testTaskSystem);
  const submitMatch = useMutation(api.submitMatchResult.submitMatchResult);

  const gameOptions = ["solitaire", "rummy", "uno", "ludo"];

  useEffect(() => {
    if (player) {
      setSegmentName(player.segmentName);
      setGamePreferences(player.gamePreferences || []);
    }
  }, [player]);

  const handlePreferenceChange = (game) => {
    setGamePreferences((prev) =>
      prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game]
    );
  };

  const handleUpdateProfile = async () => {
    try {
      const result = await updateProfile({
        uid,
        segmentName,
        gamePreferences: gamePreferences.length > 0 ? gamePreferences : undefined,
      });
      setMessage(result.message);
    } catch (error) {
      setMessage(`更新失败: ${error.message}`);
    }
  };

  const handleSubmitMatch = async () => {
    try {
      const result = await submitMatch({
        uid,
        gameType: "solitaire",
        score: 1200,
        tournamentId: `t${Date.now()}`,
      });
      setMessage(result.message);
    } catch (error) {
      setMessage(`提交比赛失败: ${error.message}`);
    }
  };

  const handleRunTest = async () => {
    try {
      const result = await testTaskSystem({ uid });
      setMessage(result.message);
    } catch (error) {
      setMessage(`测试失败: ${error.message}`);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">任务系统测试</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium">段位</label>
        <select
          value={segmentName}
          onChange={(e) => setSegmentName(e.target.value)}
          className="mt-1 block w-full border rounded p-2"
        >
          <option value="bronze">青铜</option>
          <option value="silver">白银</option>
          <option value="gold">黄金</option>
          <option value="platinum">铂金</option>
          <option value="diamond">钻石</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">游戏偏好</label>
        {gameOptions.map((game) => (
          <div key={game} className="flex items-center">
            <input
              type="checkbox"
              checked={gamePreferences.includes(game)}
              onChange={() => handlePreferenceChange(game)}
              className="mr-2"
            />
            <span>{game}</span>
          </div>
        ))}
      </div>
      <button
        onClick={handleUpdateProfile}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
      >
        更新资料
      </button>
      <button
        onClick={handleSubmitMatch}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
      >
        提交比赛
      </button>
      <button
        onClick={handleRunTest}
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
      >
        运行测试
      </button>
      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}

      <h3 className="mt-6 text-lg font-semibold">当前任务</h3>
      {tasks?.map((task) => (
        <div key={task.taskId} className="mt-2 p-2 border rounded">
          <p><strong>{task.name}</strong></p>
          <p>{task.description}</p>
          <p>进度: {JSON.stringify(task.progress)}</p>
          <p>是否完成: {task.isCompleted ? "是" : "否"}</p>
        </div>
      ))}

      <h3 className="mt-6 text-lg font-semibold">通知</h3>
      {notifications?.map((n) => (
        <p key={n._id} className="mt-2 text-sm">{n.message}</p>
      ))}
    </div>
  );
};

export default TestTaskSystem;
```

**说明**：
- **功能**：允许用户更新玩家资料、提交比赛结果、运行后端测试。
- **验证**：
  - 更新资料触发 `updatePlayerProfile`，分配任务。
  - 提交比赛触发 `submitMatchResult`，生成 `task_events`。
  - 运行测试调用 `testTaskSystem`，验证生命周期。
- **运行方式**：
  - 将组件集成到 React 应用，传入 `uid: "player123"`。
  - 确保 Convex 客户端配置正确（如 `convex/react`）。
- **预期结果**：显示任务分配、进度更新、完成通知。

#### 2.3 分页查询实现
以下是更新后的 `assignTasks.ts` 和 `loadTaskTemplatesFromJson.ts`，集成分页查询。

##### 2.3.1 更新 `assignTasks.ts`
使用 `paginate` 查询 `task_templates`，每页 100 条记录。

```typescript
import { mutation } from "convex/server";
import { v } from "convex/values";

// 初始化复杂条件进度
function initializeProgress(condition: any): any {
  if (condition.type === "and" || condition.type === "or") {
    return condition.subConditions.reduce((acc: any, sub: any, idx: number) => {
      acc[`sub_${idx}`] = initializeProgress(sub);
      return acc;
    }, {});
  }
  return 0;
}

// 检查段位是否符合
function isSegmentEligible(segment: string, minSegment: string, maxSegment: string): boolean {
  const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
  const playerIdx = segments.indexOf(segment);
  const minIdx = segments.indexOf(minSegment);
  const maxIdx = segments.indexOf(maxSegment);
  return playerIdx >= minIdx && playerIdx <= maxIdx;
}

// 动态分配任务（分页查询）
export const assignTasks = mutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    try {
      const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
      if (!player) throw new Error("玩家不存在");

      const now = new Date().toISOString();
      const today = now.split("T")[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartDate = weekStart.toISOString().split("T")[0];

      const existingTasks = await ctx.db
        .query("player_tasks")
        .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
        .collect();

      // 分页查询模板（每页 100 条）
      let cursor = null;
      const pageSize = 100;
      let templates = [];
      do {
        const result = await ctx.db.query("task_templates").paginate({ cursor, numItems: pageSize });
        templates = templates.concat(result.page);
        cursor = result.isDone ? null : result.cursor;
      } while (cursor);

      for (const template of templates) {
        const rules = template.allocationRules || {};
        if (rules.minSegment && !isSegmentEligible(player.segmentName, rules.minSegment, rules.maxSegment || "diamond")) continue;

        let gameType = template.gameType;
        if (template.gameType === "dynamic" && player.gamePreferences.length > 0) {
          gameType = player.gamePreferences[0];
        }
        if (rules.gamePreferences && gameType && !player.gamePreferences.includes(gameType)) continue;

        const taskId = `${template.templateId}_${args.uid}_${template.resetInterval === "daily" ? today : weekStartDate}`;
        if (existingTasks.some((t) => t.taskId === taskId)) continue;

        const condition = JSON.parse(JSON.stringify(template.condition));
        if (gameType && template.gameType === "dynamic") {
          if (condition.type === "and" || condition.type === "or") {
            condition.subConditions = condition.subConditions.map((sub: any) => ({
              ...sub,
              gameType: sub.gameType === "dynamic" ? gameType : sub.gameType,
              minScore: sub.minScore && player.segmentName === "diamond" ? sub.minScore + 200 : sub.minScore,
            }));
          } else if (condition.gameType === "dynamic") {
            condition.gameType = gameType;
            if (condition.minScore && player.segmentName === "diamond") {
              condition.minScore += 200;
            }
          }
        }

        const rewards = JSON.parse(JSON.stringify(template.rewards));
        if (player.segmentName === "diamond") {
          rewards.coins += 100;
          rewards.gamePoints += 50;
        }

        await ctx.db.insert("tasks", {
          taskId,
          name: template.name,
          description: template.description,
          type: template.type,
          gameType,
          condition,
          rewards,
          resetInterval: template.resetInterval,
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("player_tasks", {
          uid: args.uid,
          taskId,
          progress: initializeProgress(condition),
          isCompleted: false,
          lastReset: template.resetInterval === "daily" ? today : weekStartDate,
          updatedAt: now,
        });

        await ctx.db.insert("notifications", {
          uid: args.uid,
          message: `新任务“${template.name}”已分配！`,
          createdAt: now,
        });
      }

      return { success: true, message: "任务分配完成" };
    } catch (error) {
      await ctx.db.insert("error_logs", {
        error: error.message,
        context: "assignTasks",
        uid: args.uid,
        createdAt: now,
      });
      return { success: false, message: `任务分配失败: ${error.message}` };
    }
  },
});
```

**说明**：
- **分页查询**：使用 `ctx.db.query("task_templates").paginate({ cursor, numItems: 100 })` 加载模板，每页 100 条，循环直到 `isDone`。
- **性能**：减少单次查询的内存和延迟开销，适合大规模模板（>1000 条）。
- **一致性**：直接从数据库读取最新模板数据。

##### 2.3.2 更新 `loadTaskTemplatesFromJson.ts`
分页检查现有模板，优化大规模插入。

```typescript
import { mutation } from "convex/server";
import { v } from "convex/values";

// 加载 JSON 任务模板（分页查询）
export const loadTaskTemplatesFromJson = mutation({
  args: {
    templates: v.array(
      v.object({
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        gameType: v.optional(v.string()),
        condition: v.any(),
        rewards: v.object({
          coins: v.number(),
          props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
          tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
          gamePoints: v.number(),
        }),
        resetInterval: v.string(),
        allocationRules: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      const now = new Date().toISOString();
      let successCount = 0;
      let skipCount = 0;

      // 分页查询现有模板
      const templateIds = args.templates.map((t) => t.templateId);
      let existingTemplates = new Map<string, any>();
      let cursor = null;
      const pageSize = 100;
      do {
        const result = await ctx.db
          .query("task_templates")
          .withIndex("by_templateId", (q) => q.eq("templateId", templateIds))
          .paginate({ cursor, numItems: pageSize });
        for (const template of result.page) {
          existingTemplates.set(template.templateId, template);
        }
        cursor = result.isDone ? null : result.cursor;
      } while (cursor);

      for (const template of args.templates) {
        if (existingTemplates.has(template.templateId)) {
          skipCount++;
          continue;
        }

        await ctx.db.insert("task_templates", {
          templateId: template.templateId,
          name: template.name,
          description: template.description,
          type: template.type,
          gameType: template.gameType,
          condition: template.condition,
          rewards: template.rewards,
          resetInterval: template.resetInterval,
          allocationRules: template.allocationRules,
          createdAt: now,
          updatedAt: now,
        });
        successCount++;
      }

      return {
        success: true,
        message: `成功加载 ${successCount} 个任务模板，跳过 ${skipCount} 个已有模板`,
      };
    } catch (error) {
      await ctx.db.insert("error_logs", {
        error: error.message,
        context: "loadTaskTemplatesFromJson",
        createdAt: now,
      });
      return { success: false, message: `加载任务模板失败: ${error.message}` };
    }
  },
});
```

**说明**：
- **分页查询**：使用 `paginate` 检查现有模板，限制每页 100 条。
- **优化**：通过 `templateIds` 预过滤，减少查询范围。
- **一致性**：使用 `by_templateId` 索引快速检查重复模板。

#### 2.4 其他依赖文件
以下文件保持不变（参考前文 artifact_id），但为完整性列出调用关系：
- **schema.ts**（artifact_id: `d6e3c03c-6dff-41a4-a092-4fdeff48e149`）：定义数据库结构，包含 `by_templateId` 索引。
- **processTaskEvents.ts**（artifact_id: `a6018ad7-c64f-4967-9d2a-b4ea1b076f58`）：处理任务事件。
- **resetTasks.ts**（artifact_id: `a6018ad7-c64f-4967-9d2a-b4ea1b076f58`）：重置任务。
- **scheduleTaskAssignment.ts**（artifact_id: `a6018ad7-c64f-4967-9d2a-b4ea1b076f58`）：定时分配。
- **updatePlayerProfile.ts**（artifact_id: `e0a8866a-695d-4ed7-86d6-adb8459de07c`）：更新玩家资料。
- **submitMatchResult.ts**（新增，模拟比赛结果）：

```typescript
import { mutation } from "convex/server";
import { v } from "convex/values";

// 提交比赛结果
export const submitMatchResult = mutation({
  args: {
    uid: v.string(),
    gameType: v.string(),
    score: v.number(),
    tournamentId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const now = new Date().toISOString();
      await ctx.db.insert("task_events", {
        uid: args.uid,
        action: "complete_match",
        actionData: { gameType: args.gameType, score: args.score, tournamentId: args.tournamentId },
        createdAt: now,
        processed: false,
        updatedAt: now,
      });

      await ctx.scheduler.runAfter(0, api.processTaskEvents.processTaskEvents, { uid: args.uid });

      return { success: true, message: "比赛结果提交成功" };
    } catch (error) {
      await ctx.db.insert("error_logs", {
        error: error.message,
        context: "submitMatchResult",
        uid: args.uid,
        createdAt: now,
      });
      return { success: false, message: `提交比赛结果失败: ${error.message}` };
    }
  },
});
```

---

### 3. 测试运行指南
#### 3.1 环境准备
- **Convex 项目**：确保 Convex 项目已配置，包含上述 schema 和 mutations。
- **前端设置**：
  - 安装 `convex/react` 和 `react` 依赖。
  - 配置 Convex 客户端：
    ```javascript
    import { ConvexReactClient } from "convex/react";
    const convex = new ConvexReactClient("YOUR_CONVEX_URL");
    ```
- **测试数据**：清空 `task_templates`、`tasks`、`player_tasks` 等表以避免冲突。

#### 3.2 运行后端测试
1. 部署 Convex 项目：
   ```bash
   npx convex deploy
   ```
2. 运行测试：
   ```bash
   npx convex run testTaskSystem:testTaskSystem --args '{"uid":"player123"}'
   ```
3. 检查结果：
   - 验证 `player_tasks` 包含任务 `new_segment_challenge_player123_2025-06-20`。
   - 验证 `task_events` 包含 3 个 `complete_match` 事件。
   - 验证 `notifications` 包含任务完成通知。
   - 验证任务重置后进度为 `{ sub_0: 0, sub_1: 0 }`。

#### 3.3 运行前端测试
1. 将 `TestTaskSystem.jsx` 集成到 React 应用：
   ```jsx
   import TestTaskSystem from "./TestTaskSystem";
   function App() {
     return <TestTaskSystem uid="player123" />;
   }
   ```
2. 启动应用：
   ```bash
   npm start
   ```
3. 操作：
   - 选择段位“黄金”，勾选“solitaire”。
   - 点击“更新资料”，验证任务分配。
   - 点击“提交比赛”三次，验证任务完成。
   - 点击“运行测试”，验证整个生命周期。
4. 检查 UI：
   - 任务列表显示“新段位挑战”，进度从 `{ sub_0: 0, sub_1: 0 }` 更新到 `{ sub_0: 2, sub_1: 1 }`。
   - 通知显示“任务‘新段位挑战’完成”。

---

### 4. 分页查询性能分析
- **分页优势**：
  - 每页 100 条记录，减少单次查询的内存和延迟。
  - 假设 1000 条模板，分 10 次查询，总延迟仍低于全表查询。
- **索引支持**：
  - `by_templateId` 索引确保 `loadTaskTemplatesFromJson` 检查重复高效。
  - `paginate` 与索引结合，查询复杂度为 O(log N) + O(pageSize)。
- **瓶颈**：
  - 若模板数量极多（如 >10,000），可动态调整 `pageSize` 或缓存热门模板（需外部存储如 Redis）。
- **建议**：
  - 监控 `task_templates` 表大小，若超过 5000 条，考虑添加模板分类（如 `type` 索引）进一步过滤。

---

### 5. 总结
- **测试代码**：`testTaskSystem.ts` 验证后端生命周期，`TestTaskSystem.jsx` 验证前端交互。
- **分页查询**：
  - `assignTasks` 使用 `paginate` 加载模板，每页 100 条。
  - `loadTaskTemplatesFromJson` 分页检查重复模板。
- **性能**：分页查询替换 `templateCache`，适合大规模模板，保持数据一致性。
- **运行**：后端通过 Convex CLI 运行，前端通过 React 应用测试。

如果需要更详细的测试用例（特定场景）、Jest 集成、或部署指南，请告诉我，我可以进一步扩展代码！