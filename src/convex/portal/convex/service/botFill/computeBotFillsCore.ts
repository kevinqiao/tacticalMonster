import type { BotStrategyPlayerContext } from "../../data/portalPlayerStrategyTypes";
import {
  getPortalTournamentDefinition,
  resolveSoloSeedSuccessThreshold,
  type CasualRankRateEntry,
  type PortalBotDifficultyProfileId,
  type PortalSeedQuantileSuccessConfig,
} from "../../data/portalTournamentConfigs";
import {
  deriveRankScoreFloorsFromQuantiles,
  type ScoreQuantiles,
} from "../../shared/scoreQuantiles";
import {
  attachRevealAtToBotFills,
  buildBotRevealPlanSeedKey,
} from "./botRevealSchedule";
import {
  computeFixedTopBotScoreSlots,
  computeSoloBotScoreSlots,
  hashSessionSeed,
  soloRolloutQueryBands,
  type BotScoreSlot,
} from "./botScoreSlots";
import { pickDurationFallbackMs } from "./durationFallback";
import { isBotFillGameType, type BotFillGameType } from "./gameTypeConfig";
import {
  botSlotsToScoreBands,
  pickScoresFromRolloutBands,
  pickSoloBotFillsFromTwoBands,
  type AsyncBotFillFromRollout,
} from "./rolloutPick";
import { recommendSoloEffectiveRank } from "./soloRankRecommend";
import { enforceSoloBotFillsForEffectiveRank } from "./soloRankEnforce";
import { createIngestTiming } from "../tournament/submit/casualIngestTiming";
import {
  bridgeFetchRolloutBands,
  bridgeFetchTriathlonLegRollouts,
  resolveSeedQuantiles,
  type SeedPoolRuntimeCtx,
  type SlimSeedBinding,
} from "./seedRolloutBridge";
import {
  computeLegProfileWeights,
  decomposeTotalToLegTargets,
  fallbackTriathlonLegRollouts,
  legScoreTolerance,
  pickTriathlonRolloutTriple,
  proposeBotTotalForSlot,
  sumLegScoreQuantiles,
} from "./triathlonBotFill";
import { scoreEpsilon } from "./gameTypeConfig";

export type PlatformSubmitContext = {
  mode: "daily" | "solo" | "mixed";
  templateId: string;
  matchId: string;
  maxPlayers: number;
  botCount: number;
  gameType: string;
  seedBinding?: SlimSeedBinding;
  sessionExternalId: string;
  botsSeeded: boolean;
  humanReplayEpoch?: number;
  isTriathlon: boolean;
  triathlonLegs?: Array<{
    gameIndex: number;
    gameType: string;
    seedBinding: SlimSeedBinding;
    /** 触发补位真人该局得分（用于 profile 权重） */
    humanScore?: number;
  }>;
  soloRankPlanning?: {
    profile: BotStrategyPlayerContext;
    rankCounts: Record<number, number>;
    rankRates: CasualRankRateEntry[];
    maxPlayers: number;
    botDifficultyProfile?: PortalBotDifficultyProfileId;
  };
  successThresholdQuantile?: "p25" | "p50" | "p75" | "p90";
  ritualOneLineClear?: boolean;
};

export type PlatformBotFillPayload = {
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
};

async function pickSoloGameBotFills(
  ctx: SeedPoolRuntimeCtx,
  args: {
    gameType: BotFillGameType;
    humanScore: number;
    effectiveRank: number;
    maxPlayers: number;
    scoreLow: number;
    seedBinding: SlimSeedBinding;
    sessionSeed: number;
  }
): Promise<PlatformBotFillPayload[]> {
  const bands = soloRolloutQueryBands({
    humanScore: args.humanScore,
    effectiveRank: args.effectiveRank,
    maxPlayers: args.maxPlayers,
    scoreLow: args.scoreLow,
    gameType: args.gameType,
  });
  const rolloutBands = await bridgeFetchRolloutBands(ctx, {
    gameType: args.gameType,
    seedBinding: args.seedBinding,
    bands,
  });
  const timing = createIngestTiming("pickSoloGameBotFills", args.seedBinding.seedId);
  timing.mark("bridgeFetchRolloutBands", {
    bandCount: rolloutBands.length,
    rolloutCount: rolloutBands.reduce((n, b) => n + (b.rollouts?.length ?? 0), 0),
  });

  const fills = pickSoloBotFillsFromTwoBands({
    humanScore: args.humanScore,
    effectiveRank: args.effectiveRank,
    maxPlayers: args.maxPlayers,
    scoreLow: args.scoreLow,
    bands: rolloutBands,
    sessionSeed: args.sessionSeed,
    gameType: args.gameType,
  });

  timing.finish("pickSoloBotFillsFromTwoBands", { botFillCount: fills.length });

  return fills.map((f) => ({
    rank: f.rank,
    score: f.score,
    duration: f.duration,
    ...(f.rolloutIndex != null ? { rolloutIndex: f.rolloutIndex } : {}),
  }));
}

async function pickSingleGameBotFills(
  ctx: SeedPoolRuntimeCtx,
  args: {
    gameType: BotFillGameType;
    slots: BotScoreSlot[];
    seedBinding: SlimSeedBinding;
    sessionSeed: number;
    localFills: Array<{ rank: number; score: number; duration?: number }>;
  }
): Promise<PlatformBotFillPayload[]> {
  const bands = botSlotsToScoreBands(args.slots);
  const rolloutBands = await bridgeFetchRolloutBands(ctx, {
    gameType: args.gameType,
    seedBinding: args.seedBinding,
    bands,
  });
  const timing = createIngestTiming("pickSingleGameBotFills", args.seedBinding.seedId);
  timing.mark("bridgeFetchRolloutBands", {
    bandCount: rolloutBands.length,
    rolloutCount: rolloutBands.reduce((n, b) => n + (b.rollouts?.length ?? 0), 0),
  });

  const fills: AsyncBotFillFromRollout[] = pickScoresFromRolloutBands({
    slots: args.slots,
    bands: rolloutBands,
    sessionSeed: args.sessionSeed,
    gameType: args.gameType,
    localFills: args.localFills,
  });

  timing.finish("pickScoresFromRolloutBands", { botFillCount: fills.length });

  return fills.map((f) => ({
    rank: f.rank,
    score: f.score,
    duration: f.duration,
    ...(f.rolloutIndex != null ? { rolloutIndex: f.rolloutIndex } : {}),
  }));
}

function applySoloEffectiveRankEnforcement(args: {
  humanScore: number;
  effectiveRank: number;
  maxPlayers: number;
  scoreLow: number;
  botFills: PlatformBotFillPayload[];
  gameType: BotFillGameType;
}): PlatformBotFillPayload[] {
  const origByRank = new Map(args.botFills.map((f) => [f.rank, f] as const));
  const enforced = enforceSoloBotFillsForEffectiveRank({
    humanScore: args.humanScore,
    effectiveRank: args.effectiveRank,
    maxPlayers: args.maxPlayers,
    scoreLow: args.scoreLow,
    fills: args.botFills.map((f) => ({
      rank: f.rank,
      score: f.score,
      duration: f.duration ?? 0,
      rolloutIndex: f.rolloutIndex,
      legs: f.legs,
    })),
    gameType: args.gameType,
  });
  return enforced.map((f) => {
    const orig = origByRank.get(f.rank);
    return {
      ...(orig ?? {}),
      rank: f.rank,
      score: f.score,
      duration: f.duration,
      ...(f.rolloutIndex != null
        ? { rolloutIndex: f.rolloutIndex }
        : orig?.rolloutIndex != null
          ? { rolloutIndex: orig.rolloutIndex }
          : {}),
    };
  });
}

async function pickTriathlonBotFills(
  ctx: SeedPoolRuntimeCtx,
  args: {
    context: PlatformSubmitContext;
    slots: BotScoreSlot[];
    sessionSeed: number;
  }
): Promise<PlatformBotFillPayload[]> {
  const legs = args.context.triathlonLegs ?? [];
  if (legs.length === 0) return [];

  const legQuantiles = await Promise.all(
    legs.map((leg) => resolveSeedQuantiles(ctx, leg.seedBinding, leg.gameType))
  );
  const humanLegScores = legs.map((leg) => leg.humanScore);
  const hasHumanLegScores =
    humanLegScores.length === legs.length &&
    humanLegScores.every((s) => s != null && Number.isFinite(s));
  const profileWeights = computeLegProfileWeights(
    hasHumanLegScores ? humanLegScores : undefined,
    legQuantiles
  );
  const tolerances = legQuantiles.map((q) => legScoreTolerance(q));

  const fills: PlatformBotFillPayload[] = [];
  let nextMaxScore = Number.POSITIVE_INFINITY;

  for (const slot of [...args.slots].sort((a, b) => a.rank - b.rank)) {
    const maxScoreExclusive = Number.isFinite(nextMaxScore) ? nextMaxScore : undefined;
    const botTotal = proposeBotTotalForSlot({
      slotLow: slot.low,
      slotHigh: slot.high,
      maxScoreExclusive,
      sessionSeed: args.sessionSeed,
      rank: slot.rank,
    });
    const legTargets = decomposeTotalToLegTargets(botTotal, profileWeights);

    let legPools = await fetchTriathlonLegPools(ctx, legs, legTargets, tolerances, 1);
    if (legPools.every((p) => p.rollouts.length === 0)) {
      legPools = await fetchTriathlonLegPools(ctx, legs, legTargets, tolerances, 4);
    }
    if (legPools.every((p) => p.rollouts.length === 0)) {
      legPools = await fetchTriathlonWideLegPools(ctx, legs);
    }

    const triple =
      pickTriathlonRolloutTriple({
        legPools,
        slotLow: slot.low,
        slotHigh: slot.high,
        maxScoreExclusive,
        legTargets,
        sessionSeed: args.sessionSeed,
      }) ??
      fallbackTriathlonLegRollouts({
        legPools,
        legTargets,
        botTotal,
        slotLow: slot.low,
        slotHigh: slot.high,
        maxScoreExclusive,
      });

    const score = triple.totalScore;
    const lastLeg = triple.legs[triple.legs.length - 1];
    const rolloutIndex = lastLeg?.rolloutIndex;
    const duration =
      lastLeg?.elapsedTime != null
        ? Math.round(lastLeg.elapsedTime * 1000)
        : pickDurationFallbackMs(args.sessionSeed, slot.rank);
    const legFills = triple.legs.map((leg) => ({
      gameIndex: leg.gameIndex,
      score: leg.finalScore,
      rolloutIndex: leg.rolloutIndex,
      duration:
        leg.elapsedTime != null ? Math.round(leg.elapsedTime * 1000) : undefined,
    }));

    fills.push({
      rank: slot.rank,
      score,
      duration,
      ...(rolloutIndex != null ? { rolloutIndex } : {}),
      legs: legFills,
    });
    nextMaxScore = score - scoreEpsilon("block_blast");
  }

  return fills;
}

async function fetchTriathlonLegPools(
  ctx: SeedPoolRuntimeCtx,
  legs: PlatformSubmitContext["triathlonLegs"],
  legTargets: number[],
  tolerances: number[],
  widen: number
) {
  const legBands = legTargets.map((target, i) => {
    const tol = tolerances[i]! * widen;
    return {
      min: Math.max(0, Math.floor(target - tol)),
      max: Math.ceil(target + tol),
      count: 16,
    };
  });
  return await bridgeFetchTriathlonLegRollouts(ctx, {
    legs: legs ?? [],
    legBands,
  });
}

async function fetchTriathlonWideLegPools(
  ctx: SeedPoolRuntimeCtx,
  legs: PlatformSubmitContext["triathlonLegs"]
) {
  const legBands = (legs ?? []).map(() => ({ min: 0, count: 32 }));
  return await bridgeFetchTriathlonLegRollouts(ctx, {
    legs: legs ?? [],
    legBands,
  });
}

export async function computeSoloPlatformBotFills(
  ctx: SeedPoolRuntimeCtx,
  args: {
    context: PlatformSubmitContext;
    humanScore: number;
    primaryGameType: BotFillGameType;
  }
): Promise<{ botFills: PlatformBotFillPayload[]; effectiveRank: number }> {
  const { context, humanScore, primaryGameType } = args;
  const timing = createIngestTiming("computeSoloPlatformBotFills", context.matchId);

  if (context.isTriathlon && context.triathlonLegs?.length) {
    const legQuantiles = await Promise.all(
      context.triathlonLegs.map((leg) =>
        resolveSeedQuantiles(ctx, leg.seedBinding, leg.gameType)
      )
    );
    const scoreQuantiles = sumLegScoreQuantiles(legQuantiles);
    const sessionSeed = hashSessionSeed(`${context.templateId}|${context.sessionExternalId}`);
    const planning = context.soloRankPlanning;
    if (!planning?.profile) throw new Error("missing_solo_rank_planning");

    const recommended = recommendSoloEffectiveRank({
      humanScore,
      scoreQuantiles,
      maxPlayers: context.maxPlayers,
      profile: planning.profile,
      rankCounts: planning.rankCounts,
      rankRates: planning.rankRates,
      sessionSeed,
      botDifficultyProfile: planning.botDifficultyProfile ?? "default",
    });

    const slots = computeSoloBotScoreSlots({
      humanScore,
      effectiveRank: recommended.effectiveRank,
      scoreLow: scoreQuantiles.p10,
      maxPlayers: context.maxPlayers,
      gameType: primaryGameType,
    });

    const rawBotFills = await pickTriathlonBotFills(ctx, {
      context,
      slots,
      sessionSeed,
    });
    const botFills = applySoloEffectiveRankEnforcement({
      humanScore,
      effectiveRank: recommended.effectiveRank,
      maxPlayers: context.maxPlayers,
      scoreLow: scoreQuantiles.p10,
      botFills: rawBotFills,
      gameType: primaryGameType,
    });

    return { botFills, effectiveRank: recommended.effectiveRank };
  }

  if (!context.seedBinding) throw new Error("missing_seed_binding");

  const scoreQuantiles = await resolveSeedQuantiles(ctx, context.seedBinding, primaryGameType);
  timing.mark("resolveSeedQuantiles");

  const sessionSeed = hashSessionSeed(`${context.templateId}|${context.sessionExternalId}`);
  const planning = context.soloRankPlanning;
  if (!planning?.profile) throw new Error("missing_solo_rank_planning");

  const recommended = recommendSoloEffectiveRank({
    humanScore,
    scoreQuantiles,
    maxPlayers: context.maxPlayers,
    profile: planning.profile,
    rankCounts: planning.rankCounts,
    rankRates: planning.rankRates,
    sessionSeed,
    botDifficultyProfile: planning.botDifficultyProfile ?? "default",
  });
  timing.mark("recommendSoloEffectiveRank", { effectiveRank: recommended.effectiveRank });

  timing.mark("before.pickSoloGameBotFills", {
    bandCount: soloRolloutQueryBands({
      humanScore,
      effectiveRank: recommended.effectiveRank,
      maxPlayers: context.maxPlayers,
      scoreLow: scoreQuantiles.p10,
      gameType: primaryGameType,
    }).length,
  });
  const botFills = await pickSoloGameBotFills(ctx, {
    gameType: primaryGameType,
    humanScore,
    effectiveRank: recommended.effectiveRank,
    maxPlayers: context.maxPlayers,
    scoreLow: scoreQuantiles.p10,
    seedBinding: context.seedBinding,
    sessionSeed,
  });
  timing.finish("pickSoloGameBotFills", { botFillCount: botFills.length });

  return { botFills, effectiveRank: recommended.effectiveRank };
}

export async function computeMixedPlatformBotFills(
  ctx: SeedPoolRuntimeCtx,
  args: {
    context: PlatformSubmitContext;
    humanScore: number;
    primaryGameType: BotFillGameType;
  }
): Promise<PlatformBotFillPayload[]> {
  const { context, primaryGameType } = args;
  void args.humanScore;

  let scoreQuantiles: ScoreQuantiles;
  if (context.isTriathlon && context.triathlonLegs?.length) {
    const legQuantiles = await Promise.all(
      context.triathlonLegs.map((leg) =>
        resolveSeedQuantiles(ctx, leg.seedBinding, leg.gameType)
      )
    );
    scoreQuantiles = sumLegScoreQuantiles(legQuantiles);
  } else {
    if (!context.seedBinding) throw new Error("missing_seed_binding");
    scoreQuantiles = await resolveSeedQuantiles(ctx, context.seedBinding, primaryGameType);
  }

  const rankFloors = deriveRankScoreFloorsFromQuantiles(
    scoreQuantiles,
    context.maxPlayers
  );
  const sessionSeed = hashSessionSeed(`${context.templateId}|${context.sessionExternalId}`);

  const slots = computeFixedTopBotScoreSlots({
    botCount: context.botCount,
    rankFloors,
    gameType: primaryGameType,
  });

  if (context.isTriathlon && context.triathlonLegs?.length) {
    return pickTriathlonBotFills(ctx, { context, slots, sessionSeed });
  }

  if (!context.seedBinding) throw new Error("missing_seed_binding");

  const localFills = slots.map((slot, i) => {
    const high = Number.isFinite(slot.high) ? slot.high : slot.low + 5000;
    return {
      rank: slot.rank,
      score: Math.floor(slot.low + (high - slot.low) * 0.5),
      duration: pickDurationFallbackMs(sessionSeed, i),
    };
  });

  return pickSingleGameBotFills(ctx, {
    gameType: primaryGameType,
    slots,
    seedBinding: context.seedBinding,
    sessionSeed,
    localFills,
  });
}

export function withPlatformRevealSchedule(
  botFills: PlatformBotFillPayload[],
  context: PlatformSubmitContext,
  timing: { matchStartedAt: number; humanFinishedAt: number }
): PlatformBotFillPayload[] {
  if (context.maxPlayers <= 1 || botFills.length === 0) return botFills;
  const planSeedKey = buildBotRevealPlanSeedKey({
    templateId: context.templateId,
    sessionExternalId: context.sessionExternalId,
    replayEpoch: context.humanReplayEpoch ?? 0,
    anchorAt: timing.humanFinishedAt,
  });
  const revealSessionSeed = hashSessionSeed(planSeedKey);
  return attachRevealAtToBotFills(botFills, {
    sessionSeed: revealSessionSeed,
    matchStartedAt: timing.matchStartedAt,
    humanFinishedAt: timing.humanFinishedAt,
  });
}

export async function computePlatformBotFillsIfNeeded(
  ctx: SeedPoolRuntimeCtx,
  args: {
    context: PlatformSubmitContext;
    humanScore: number;
    primaryGameType: string;
    matchStartedAt: number;
    humanFinishedAt: number;
  }
): Promise<{
  botFills?: PlatformBotFillPayload[];
  replaceAllVirtual?: boolean;
  seedScoreThreshold?: number;
}> {
  const { context, humanScore, primaryGameType, matchStartedAt, humanFinishedAt } = args;
  if (context.botsSeeded || context.maxPlayers <= 1) return {};
  if (context.mode !== "solo" && context.mode !== "mixed") return {};
  if (!isBotFillGameType(primaryGameType) && !context.isTriathlon) return {};

  const timing = createIngestTiming("computePlatformBotFillsIfNeeded", context.matchId);
  timing.mark("start", { mode: context.mode, maxPlayers: context.maxPlayers });

  const gameType: BotFillGameType = isBotFillGameType(primaryGameType)
    ? primaryGameType
    : "block_blast";

  let botFills: PlatformBotFillPayload[];
  if (context.mode === "solo") {
    const result = await computeSoloPlatformBotFills(ctx, {
      context,
      humanScore,
      primaryGameType: gameType,
    });
    botFills = result.botFills;
  } else {
    botFills = await computeMixedPlatformBotFills(ctx, {
      context,
      humanScore,
      primaryGameType: gameType,
    });
  }
  timing.mark("computeBotFills", { botFillCount: botFills.length });

  const withReveal = withPlatformRevealSchedule(botFills, context, {
    matchStartedAt,
    humanFinishedAt,
  });
  timing.mark("withPlatformRevealSchedule");

  let seedScoreThreshold: number | undefined;
  if (
    context.seedBinding &&
    (context.ritualOneLineClear ||
      context.seedBinding.ritualOneLineClear ||
      context.successThresholdQuantile)
  ) {
    seedScoreThreshold = await resolvePlatformSeedScoreThreshold(ctx, {
      successThresholdQuantile: context.successThresholdQuantile,
      seedBinding: context.seedBinding,
      gameType,
      ritualOneLineClear: context.ritualOneLineClear,
      templateId: context.templateId,
    });
    timing.mark("resolvePlatformSeedScoreThreshold", { seedScoreThreshold: seedScoreThreshold ?? null });
  }

  timing.finish("ok", { botFillCount: withReveal.length });
  return {
    botFills: withReveal,
    replaceAllVirtual: true,
    ...(seedScoreThreshold != null ? { seedScoreThreshold } : {}),
  };
}

/** 单人成功线：仪式一消或分位×模板系数（与 bot fill 无关，maxPlayers=1 时也需调用）。 */
export async function resolvePlatformSeedScoreThreshold(
  ctx: SeedPoolRuntimeCtx,
  args: {
    successThresholdQuantile?: "p25" | "p50" | "p75" | "p90";
    seedBinding?: SlimSeedBinding;
    gameType: string;
    ritualOneLineClear?: boolean;
    seedQuantileSuccess?: Pick<
      PortalSeedQuantileSuccessConfig,
      "scoreMultiplier" | "ritualScoreMultiplier"
    > | null;
    templateId?: string;
  }
): Promise<number | undefined> {
  const ritualOneLineClear =
    args.ritualOneLineClear === true || args.seedBinding?.ritualOneLineClear === true;
  if (ritualOneLineClear && args.gameType === "block_blast") {
    return resolveSoloSeedSuccessThreshold({
      gameType: args.gameType,
      ritualOneLineClear: true,
    });
  }
  if (!args.successThresholdQuantile || !args.seedBinding) return undefined;
  const quantiles = await resolveSeedQuantiles(ctx, args.seedBinding, args.gameType);
  const seedQuantileSuccess =
    args.seedQuantileSuccess ??
    (args.templateId
      ? getPortalTournamentDefinition(args.templateId)?.seedQuantileSuccess
      : undefined);
  return resolveSoloSeedSuccessThreshold({
    gameType: args.gameType,
    quantiles,
    successQuantile: args.successThresholdQuantile,
    seedQuantileSuccess,
  });
}
