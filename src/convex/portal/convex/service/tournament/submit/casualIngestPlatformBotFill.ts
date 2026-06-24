import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import type { SeedPoolRuntimeCtx } from "../../botFill/seedRolloutBridge";
import {
  computePlatformBotFillsIfNeeded,
  resolvePlatformSeedScoreThreshold,
} from "../../botFill/computeBotFillsCore";
import { createIngestTiming } from "./casualIngestTiming";
export type IngestBotFillPlan = {
  botFills?: Array<{
    rank: number;
    score: number;
    duration?: number;
    rolloutIndex?: number;
    revealAt?: number;
    legs?: Array<{
      gameIndex: number;
      score: number;
      rolloutIndex?: number;
      duration?: number;
    }>;
  }>;
  replaceAllVirtual?: boolean;
  seedScoreThreshold?: number;
};

/** Portal ingest：bot fill / p75 在 action 内读 Portal DB（mutation 仅 1s 上限，放不下 rollout 计算）。 */
export async function resolveIngestPlatformBotFillPlan(
  ctx: SeedPoolRuntimeCtx,
  args: {    uid: string;
    matchGameId: string;
    score: number;
    presetBotFills?: IngestBotFillPlan["botFills"];
    presetReplaceAllVirtual?: boolean;
    presetSeedScoreThreshold?: number;
  }
): Promise<IngestBotFillPlan> {
  const timing = createIngestTiming("resolveIngestPlatformBotFillPlan", args.matchGameId);
  let mergedBotFills = args.presetBotFills;
  let mergedReplaceAllVirtual = args.presetReplaceAllVirtual;
  let mergedSeedScoreThreshold = args.presetSeedScoreThreshold;

  const submitCtx = await ctx.runQuery(
    internal.service.tournament.submit.casualMatchSubmitContext.resolveMatchSubmitContext,
    { matchGameId: args.matchGameId, uid: args.uid, score: Math.floor(args.score) }
  );
  timing.mark("runQuery.resolveMatchSubmitContext", {
    ok: submitCtx.ok,
    ...(submitCtx.ok
      ? {
          templateId: submitCtx.templateId,
          maxPlayers: submitCtx.maxPlayers,
          botsSeeded: submitCtx.botsSeeded,
          mode: submitCtx.mode,
          botPolicy: submitCtx.botPolicy,
        }
      : { error: submitCtx.error }),
  });
  if (!submitCtx.ok) {
    timing.finish("abort.submitContext");
    return {
      botFills: mergedBotFills,
      replaceAllVirtual: mergedReplaceAllVirtual,
      seedScoreThreshold: mergedSeedScoreThreshold,
    };
  }

  const willSyncBotFill =
    submitCtx.botPolicy === "platform_ingest" &&
    submitCtx.isLastGame &&
    !submitCtx.botsSeeded &&
    submitCtx.maxPlayers > 1 &&
    (submitCtx.mode === "solo" || submitCtx.mode === "mixed") &&
    (!mergedBotFills || mergedBotFills.length === 0);

  if (willSyncBotFill) {
    const humanFinishedAt = Date.now();
    const matchStartedAt = Math.min(submitCtx.pgCreatedAt ?? humanFinishedAt, humanFinishedAt);
    const computed = await computePlatformBotFillsIfNeeded(ctx, {
      context: {
        mode: submitCtx.mode,
        templateId: submitCtx.templateId,
        matchId: submitCtx.matchId,
        maxPlayers: submitCtx.maxPlayers,
        botCount: submitCtx.botCount,
        gameType: submitCtx.gameType,
        seedBinding: submitCtx.seedBinding,
        sessionExternalId: submitCtx.sessionExternalId,
        botsSeeded: submitCtx.botsSeeded,
        humanReplayEpoch: submitCtx.humanReplayEpoch,
        isTriathlon: submitCtx.isTriathlon,
        triathlonLegs: submitCtx.triathlonLegs,
        soloRankPlanning: submitCtx.soloRankPlanning,
        successThresholdQuantile: submitCtx.successThresholdQuantile,
      },
      humanScore: Math.floor(args.score),
      primaryGameType: submitCtx.primaryGameType ?? submitCtx.gameType,
      matchStartedAt,
      humanFinishedAt,
    });
    timing.mark("computePlatformBotFillsIfNeeded", {
      botFillCount: computed.botFills?.length ?? 0,
    });
    if (computed.botFills?.length) {
      mergedBotFills = computed.botFills;
      mergedReplaceAllVirtual = computed.replaceAllVirtual ?? true;
      if (computed.seedScoreThreshold != null) {
        mergedSeedScoreThreshold = computed.seedScoreThreshold;
      }
    }
  } else {
    timing.mark("skip.computePlatformBotFillsIfNeeded", {
      willSyncBotFill: false,
      presetBotFills: mergedBotFills?.length ?? 0,
    });
  }

  if (mergedSeedScoreThreshold == null) {
    const computedThreshold = await resolvePlatformSeedScoreThreshold(ctx, {
      successThresholdQuantile: submitCtx.successThresholdQuantile,
      seedBinding: submitCtx.seedBinding,
      gameType: submitCtx.primaryGameType ?? submitCtx.gameType,
    });
    timing.mark("resolvePlatformSeedScoreThreshold", {
      threshold: computedThreshold ?? null,
    });
    if (computedThreshold != null) {
      mergedSeedScoreThreshold = computedThreshold;
    }
  }

  timing.finish("ok", { botFillCount: mergedBotFills?.length ?? 0 });
  return {
    ...(mergedBotFills?.length ? { botFills: mergedBotFills } : {}),
    ...(mergedReplaceAllVirtual ? { replaceAllVirtual: true } : {}),
    ...(mergedSeedScoreThreshold != null ? { seedScoreThreshold: mergedSeedScoreThreshold } : {}),
  };
}

const botFillLeg = v.object({
  gameIndex: v.number(),
  score: v.number(),
  rolloutIndex: v.optional(v.number()),
  duration: v.optional(v.number()),
});

const botFillEntry = v.object({
  rank: v.number(),
  score: v.number(),
  duration: v.optional(v.number()),
  rolloutIndex: v.optional(v.number()),
  revealAt: v.optional(v.number()),
  legs: v.optional(v.array(botFillLeg)),
});

/** HTTP ingest 调用：rollout 查询 + bot 分档在 action 超时预算内完成。 */
export const computeIngestPlatformBotFillPlan = internalAction({
  args: {
    uid: v.string(),
    matchGameId: v.string(),
    score: v.number(),
    botFills: v.optional(v.array(botFillEntry)),
    replaceAllVirtual: v.optional(v.boolean()),
    seedScoreThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return resolveIngestPlatformBotFillPlan(ctx, {
      uid: args.uid,
      matchGameId: args.matchGameId,
      score: args.score,
      presetBotFills: args.botFills,
      presetReplaceAllVirtual: args.replaceAllVirtual,
      presetSeedScoreThreshold: args.seedScoreThreshold,
    });
  },
});
