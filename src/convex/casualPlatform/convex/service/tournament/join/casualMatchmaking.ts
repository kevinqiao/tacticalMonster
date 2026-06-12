/**
 * Async casual tournament matchmaking: queue + scheduler → openCasualTableActions
 */
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  CASUAL_MATCH_QUEUE_TIMEOUT_MS,
  CASUAL_SOLO_ASYNC_OPEN_DELAY_MS,
} from "../../../data/casualMatchmakingConfig";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { internalMutation, internalQuery, mutation, query } from "../../../_generated/server";
import {
  evaluateEffectiveHumans,
  logJoinMatchmakingProfileResult,
  resolvePlayerBotStrategyContext,
} from "./casualMatchmakingProfile";
import {
  assertJoinEntryEligible,
  requiresDailySoloPlayCostAck,
} from "./casualTournamentJoinCore";
import { findAnyGlobalOpenCasualMatch } from "./casualOpenTableGuard";
import {
  resolveQueueEffectiveHumans,
  resolveQueueExpireAction,
} from "./casualMatchmakingCore";
import {
  toCasualMatchQueueClientFlags,
  type JoinCasualRunQueuedResult,
  type JoinCasualRunResult,
} from "../shared/casualTournamentTypes";

export {
  computeMultiTableBatchSize,
  resolveQueueEffectiveHumans,
  resolveQueueExpireAction,
} from "./casualMatchmakingCore";

export const getQueueRowForOpen = internalQuery({
  args: { queueRowId: v.id("casual_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.db.get(queueRowId);
    if (!row || row.status !== "waiting") return null;
    if (resolveQueueEffectiveHumans(row) !== 1) return null;
    return { templateId: row.templateId };
  },
});

export const getQueueRowForExpire = internalQuery({
  args: { queueRowId: v.id("casual_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.db.get(queueRowId);
    if (!row || row.status !== "waiting") return null;
    if (resolveQueueEffectiveHumans(row) <= 1) return null;
    if (resolveQueueExpireAction(row) === "exit") {
      return { ok: true as const, action: "exit" as const };
    }
    return { ok: true as const, action: "solo" as const, templateId: row.templateId };
  },
});

export const deleteQueueRow = internalMutation({
  args: { queueRowId: v.id("casual_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.db.get(queueRowId);
    if (row) await ctx.db.delete(queueRowId);
    return { ok: true as const };
  },
});

function buildQueuedResponse(args: {
  templateId: string;
  effectiveHumans: number;
  expiresAt?: number;
}): JoinCasualRunQueuedResult {
  return {
    ok: true as const,
    queued: true as const,
    templateId: args.templateId,
    ...toCasualMatchQueueClientFlags({
      effectiveHumans: args.effectiveHumans,
      expiresAt: args.expiresAt,
    }),
  };
}

/** Play 异步场：入队 + scheduler 开桌 */
export const enqueueCasualMatchmakingAndTryMatch = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    dailySoloCostAck: v.optional(v.literal(true)),
  },
  handler: async (ctx, { uid, tournamentId, dailySoloCostAck }): Promise<JoinCasualRunResult> => {
    const def = getTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }

    const existingOpen = await findAnyGlobalOpenCasualMatch(ctx, uid);
    if (existingOpen) {
      const profile = await resolvePlayerBotStrategyContext(ctx, {
        uid,
        templateId: tournamentId,
        def,
      });
      const { effectiveHumans, matchedRuleId, queueExpireAction } = evaluateEffectiveHumans(profile, def);
      logJoinMatchmakingProfileResult({
        uid,
        templateId: tournamentId,
        profile,
        effectiveHumans,
        matchedRuleId,
        queueExpireAction,
        source: "existing_open",
      });
      return buildQueuedResponse({
        templateId: tournamentId,
        effectiveHumans,
      });
    }

    const now = Date.now();
    const preview = await assertJoinEntryEligible(ctx, uid, tournamentId, now);
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
    }
    if (requiresDailySoloPlayCostAck(tournamentId, preview.willChargeEntry) && dailySoloCostAck !== true) {
      return { ok: false as const, error: "needs_cost_ack" };
    }

    const profile = await resolvePlayerBotStrategyContext(ctx, {
      uid,
      templateId: tournamentId,
      def,
    });
    const { effectiveHumans, matchedRuleId, queueExpireAction } = evaluateEffectiveHumans(profile, def);
    logJoinMatchmakingProfileResult({
      uid,
      templateId: tournamentId,
      profile,
      effectiveHumans,
      matchedRuleId,
      queueExpireAction,
      source: "enqueue",
    });
    const expiresAt = effectiveHumans > 1 ? now + CASUAL_MATCH_QUEUE_TIMEOUT_MS : undefined;

    const dupWaiting = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_uid_template_status", (q) =>
        q.eq("uid", uid).eq("templateId", tournamentId).eq("status", "waiting")
      )
      .first();

    let queueRowId: Id<"casual_match_queue">;
    if (dupWaiting) {
      await ctx.db.patch(dupWaiting._id, {
        effectiveHumans,
        matchedRuleId: matchedRuleId ?? undefined,
        queueExpireAction: effectiveHumans > 1 ? queueExpireAction : undefined,
        expiresAt,
        skipEntryCharge: dupWaiting.skipEntryCharge,
        updatedAt: now,
      });
      queueRowId = dupWaiting._id;
    } else {
      queueRowId = await ctx.db.insert("casual_match_queue", {
        uid,
        templateId: tournamentId,
        effectiveHumans,
        matchedRuleId: matchedRuleId ?? undefined,
        queueExpireAction: effectiveHumans > 1 ? queueExpireAction : undefined,
        expiresAt,
        skipEntryCharge: undefined,
        status: "waiting",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (effectiveHumans === 1) {
      await ctx.scheduler.runAfter(
        CASUAL_SOLO_ASYNC_OPEN_DELAY_MS,
        internal.service.tournament.join.casualOpenTableActions.openSoloAsyncTableFromQueue,
        { queueRowId }
      );
    } else {
      if (expiresAt != null) {
        await ctx.scheduler.runAfter(
          CASUAL_MATCH_QUEUE_TIMEOUT_MS,
          internal.service.tournament.join.casualOpenTableActions.expireCasualMatchQueueEntryOpen,
          { queueRowId }
        );
      }
      await ctx.scheduler.runAfter(
        0,
        internal.service.tournament.join.casualOpenTableActions.processCasualMatchQueueForTemplate,
        { templateId: tournamentId }
      );
    }

    return buildQueuedResponse({
      templateId: tournamentId,
      effectiveHumans,
      expiresAt,
    });
  },
});

export const listCasualMatchQueueForUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const rows = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    return rows
      .filter((r) => r.status === "waiting" || r.status === "claiming")
      .map((r) => {
        const eff = resolveQueueEffectiveHumans(r);
        return {
          templateId: r.templateId,
          status: r.status as "waiting" | "claiming",
          createdAt: r.createdAt,
          ...toCasualMatchQueueClientFlags({
            effectiveHumans: eff,
            expiresAt: r.expiresAt,
          }),
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const leaveCasualMatchQueue = mutation({
  args: {
    uid: v.string(),
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, templateId }) => {
    const rows = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();

    const scopeTemplateId = templateId?.trim();
    const inScope = (rowTemplateId: string) =>
      !scopeTemplateId || rowTemplateId === scopeTemplateId;

    const claiming = rows.filter((r) => r.status === "claiming" && inScope(r.templateId));
    const waiting = rows.filter((r) => r.status === "waiting" && inScope(r.templateId));

    if (claiming.length > 0 && waiting.length === 0) {
      return { ok: false as const, error: "cannot_leave_claiming" as const };
    }
    if (waiting.length === 0) {
      return { ok: false as const, error: "not_in_queue" as const };
    }

    for (const row of waiting) {
      await ctx.db.delete(row._id);
    }
    return { ok: true as const, removed: waiting.length };
  },
});
