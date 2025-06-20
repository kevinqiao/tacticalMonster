import { api, internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

// 定时处理未完成的任务事件
export const processPendingTaskEvents = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string }> => {
    try {
      // 获取未处理的任务事件，限制每次处理 500 条以优化性能
      const unprocessedEvents = await ctx.runQuery(api.service.task.processTaskEvents.getUnprocessedEvents);

      // 如果没有未处理事件，直接返回
      if (unprocessedEvents.length === 0) {
        return { success: true, message: "没有未处理的任务事件" };
      }

      // 按玩家 ID 分组事件
      const groupedByUid = unprocessedEvents.reduce((acc: Record<string, any[]>, event: any) => {
        acc[event.uid] = acc[event.uid] || [];
        acc[event.uid].push(event);
        return acc;
      }, {} as Record<string, any[]>);

      // 为每个玩家异步调度任务处理
      const schedulerPromises = Object.keys(groupedByUid).map((uid) =>
        ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid })
      );

      // 等待所有调度完成
      await Promise.all(schedulerPromises);

      return {
        success: true,
        message: `已为 ${Object.keys(groupedByUid).length} 个玩家调度任务事件处理`,
      };
    } catch (error: unknown) {
      const err = error as Error;

      // 延迟 5 分钟重新调度
      await ctx.scheduler.runAfter(5 * 60 * 1000, internal.service.task.scheduledTaskProcessor.processPendingTaskEvents, {});

      return { success: false, message: `处理任务事件失败: ${err.message}` };
    }
  },
});