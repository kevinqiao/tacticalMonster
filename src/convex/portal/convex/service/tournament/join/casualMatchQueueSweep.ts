/**
 * 匹配队列兜底：扫卡住的 waiting 行并重新触发开桌。
 */
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { listPlayCasualTournaments } from "../../../data/portalTournamentConfigs";
import { resolveQueueEffectiveHumans } from "./casualMatchmakingCore";

const STUCK_WAITING_MS = 8_000;
const SWEEP_BATCH = 40;

/** 每分钟：对卡住的排队行补调度开桌（eff=1 solo / 多人 process） */
export const sweepStuckCasualMatchQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const templates = listPlayCasualTournaments()
      .filter((d) => d.maxPlayers > 1)
      .map((d) => d.tournamentId);

    let scheduledSolo = 0;
    let scheduledProcess = 0;
    const processTemplates = new Set<string>();

    for (const templateId of templates) {
      const waiting = await ctx.db
        .query("portal_match_queue")
        .withIndex("by_template_status", (q) =>
          q.eq("templateId", templateId).eq("status", "waiting")
        )
        .take(SWEEP_BATCH);

      const stuck = waiting.filter((r) => now - r.updatedAt >= STUCK_WAITING_MS);
      if (stuck.length === 0) continue;

      processTemplates.add(templateId);
      for (const row of stuck) {
        if (resolveQueueEffectiveHumans(row) === 1) {
          await ctx.scheduler.runAfter(
            0,
            internal.service.tournament.join.casualOpenTableActions.openSoloAsyncTableFromQueue,
            { queueRowId: row._id }
          );
          scheduledSolo += 1;
        }
      }
    }

    for (const templateId of processTemplates) {
      await ctx.scheduler.runAfter(
        0,
        internal.service.tournament.join.casualOpenTableActions.processCasualMatchQueueForTemplate,
        { templateId }
      );
      scheduledProcess += 1;
    }

    return {
      ok: true as const,
      scheduledSolo,
      scheduledProcess,
      templates: [...processTemplates],
    };
  },
});
