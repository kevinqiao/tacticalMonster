import { mutation } from "../_generated/server";
import taskTemplatesData from "./json/task_templates.json";

// 定义任务模板的 TypeScript 类型
interface TaskTemplate {
  templateId: string;
  isDynamic?: boolean;
  validDate?: string;
  name: string;
  description: string;
  type: string;
  gameType?: string;
  condition: { action: string; count: number; gameType?: string; minScore?: number };
  rewards: {
    coins: number;
    props: { gameType: string; propType: string; quantity: number }[];
    tickets: { gameType: string; tournamentType: string; quantity: number }[];
    gamePoints: number;
  };
  resetInterval: string;
  allocationRules?: { minSegment?: string; maxSegment?: string };
}

// 验证任务模板数据
function validateTaskTemplate(template: any): template is TaskTemplate {
  if (!template || typeof template !== "object") {
    console.log("template", template);
    return false;
  }

  if (typeof template.templateId !== "string" || template.templateId.trim() === "") {
    console.log("template.templateId", template.templateId);
    return false;
  }
  if (typeof template.name !== "string" || typeof template.description !== "string") {
    console.log("template.name", template.name);
    console.log("template.description", template.description);
    return false;
  }
  if (typeof template.type !== "string" || !["one_time", "daily", "weekly", "season"].includes(template.type)) {
    console.log("template.type", template.type);
    return false;
  }
  if (template.gameType && typeof template.gameType !== "string") {
    console.log("template.gameType", template.gameType);
    return false;
  }
  if (typeof template.condition.action !== "string" || typeof template.condition.count !== "number") {
    console.log("template.condition.action", template.condition.action);
    console.log("template.condition.count", template.condition.count);
    return false;
  }
  if (template.condition.gameType && typeof template.condition.gameType !== "string") {
    console.log("template.condition.gameType", template.condition.gameType);
    return false;
  }
  if (template.condition.minScore && typeof template.condition.minScore !== "number") {
    console.log("template.condition.minScore", template.condition.minScore);
    return false;
  }
  if (!template.rewards || typeof template.rewards !== "object") {
    console.log("template.rewards", template.rewards);
    return false;
  }
  if (typeof template.rewards.coins !== "number") {
    console.log("template.rewards.coins", template.rewards.coins);
    return false;
  }
  if (!Array.isArray(template.rewards.props) || !Array.isArray(template.rewards.tickets)) {
    return false;
  }
  if (typeof template.rewards.gamePoints !== "number") {
    console.log("template.rewards.gamePoints", template.rewards.gamePoints);
    return false;
  }
  if (typeof template.resetInterval !== "string" || !["none", "daily", "weekly", "monthly", "season"].includes(template.resetInterval)) {
    console.log("template.resetInterval", template.resetInterval);
    return false;
  }
  if (template.allocationRules && typeof template.allocationRules !== "object") {
    console.log("template.allocationRules", template.allocationRules);
    return false;
  }
  return true;
}

// 加载本地 JSON 任务模板
export const loadTaskTemplatesFromJson = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    let successCount = 0;
    let skipCount = 0;
    let errorMessages: string[] = [];

    try {
      // 验证 JSON 数据
      const templates = taskTemplatesData as any[];
      if (!Array.isArray(templates) || templates.length === 0) {
        throw new Error("JSON 文件为空或格式不正确");
      }

      // 批量查询现有模板
      const templateIds = templates.map((t) => t.templateId).filter((id) => typeof id === "string");
      const existingTemplates = new Set<string>();
      for (const id of templateIds) {
        const template = await ctx.db
          .query("task_templates")
          .withIndex("by_templateId", (q) => q.eq("templateId", id))
          .first();
        if (template) {
          existingTemplates.add(id);
          skipCount++;
        }
      }

      // 插入新模板
      for (const template of templates) {
        if (existingTemplates.has(template.templateId)) {
          continue;
        }

        if (!validateTaskTemplate(template)) {
          errorMessages.push(`模板 ${template.templateId || "未知"} 格式无效`);
          continue;
        }

        await ctx.db.insert("task_templates", {
          templateId: template.templateId,
          isDynamic: template.isDynamic ?? false,
          validDate: template.isDynamic ? template.validDate : undefined,
          name: template.name,
          description: template.description,
          type: template.type,
          gameType: template.gameType,
          condition: template.condition,
          rewards: template.rewards,
          resetInterval: template.resetInterval,
          allocationRules: template.allocationRules ?? { minSegment: "bronze" },
          createdAt: now,
          updatedAt: now,
        });
        successCount++;
      }

      // 插入通知
      await ctx.db.insert("notifications", {
        uid: "system",
        message: `成功加载 ${successCount} 个任务模板，跳过 ${skipCount} 个，错误 ${errorMessages.length} 个`,
        createdAt: now,
      });

      // 触发任务分配
      // if (successCount > 0) {
      //   await ctx.scheduler.runAfter(0, internal.service.task.scheduleTaskAssignment.scheduleTaskAssignment);
      // }

      // 记录错误日志
      if (errorMessages.length > 0) {
        await ctx.db.insert("error_logs", {
          error: errorMessages.join("; "),
          context: "loadTaskTemplatesFromJson",
          createdAt: now,
        });
        return {
          success: false,
          message: `部分模板加载失败: ${errorMessages.join("; ")}`,
        };
      }

      return {
        success: true,
        message: `成功加载 ${successCount} 个任务模板，跳过 ${skipCount} 个`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await ctx.db.insert("error_logs", {
        error: errorMessage,
        context: "loadTaskTemplatesFromJson",
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        uid: "system",
        message: `加载任务模板失败: ${errorMessage}`,
        createdAt: now,
      });
      return { success: false, message: `加载任务模板失败: ${errorMessage}` };
    }
  },
});
