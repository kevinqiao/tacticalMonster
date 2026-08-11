import type { BotStrategyPlayerContext } from "../../data/casualPlayerStrategyTypes";
import type { CasualRankRateEntry } from "../../data/casualTournamentConfigs";
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
  generateSoloBotScores,
  hashSessionSeed,
  type BotScoreSlot,
} from "./botScoreSlots";
import { pickDurationFallbackMs } from "./durationFallback";
import { isBotFillGameType, type BotFillGameType } from "./gameTypeConfig";
import {
  botSlotsToScoreBands,
  pickScoresFromRolloutBands,
  type AsyncBotFillFromRollout,
} from "./rolloutPick";
import { recommendSingleHumanEffectiveRank } from "./singleHumanRankRecommend";
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
  mode: "daily" | "single_human" | "mixed";
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
  };
  successThresholdQuantile?: "p75";
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

  const fills: AsyncBotFillFromRollout[] = pickScoresFromRolloutBands({
    slots: args.slots,
    bands: rolloutBands,
    sessionSeed: args.sessionSeed,
    gameType: args.gameType,
    localFills: args.localFills,
  });

  return fills.map((f) => ({
    rank: f.rank,
    score: f.score,
    duration: f.duration,
    ...(f.rolloutIndex != null ? { rolloutIndex: f.rolloutIndex } : {}),
  }));
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

export async function computeSingleHumanPlatformBotFills(
  ctx: SeedPoolRuntimeCtx,
  args: {
    context: PlatformSubmitContext;
    humanScore: number;
    primaryGameType: BotFillGameType;
  }
): Promise<{ botFills: PlatformBotFillPayload[]; effectiveRank: number }> {
  const { context, humanScore, primaryGameType } = args;

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

    const recommended = recommendSingleHumanEffectiveRank({
      humanScore,
      scoreQuantiles,
      maxPlayers: context.maxPlayers,
      profile: planning.profile,
      rankCounts: planning.rankCounts,
      rankRates: planning.rankRates,
      sessionSeed,
    });

    const slots = computeSoloBotScoreSlots({
      humanScore,
      effectiveRank: recommended.effectiveRank,
      scoreLow: scoreQuantiles.p10,
      maxPlayers: context.maxPlayers,
      gameType: primaryGameType,
    });

    const botFills = await pickTriathlonBotFills(ctx, {
      context,
      slots,
      sessionSeed,
    });

    return { botFills, effectiveRank: recommended.effectiveRank };
  }

  if (!context.seedBinding) throw new Error("missing_seed_binding");

  const scoreQuantiles = await resolveSeedQuantiles(ctx, context.seedBinding, primaryGameType);
  const sessionSeed = hashSessionSeed(`${context.templateId}|${context.sessionExternalId}`);
  const planning = context.soloRankPlanning;
  if (!planning?.profile) throw new Error("missing_solo_rank_planning");

  const recommended = recommendSingleHumanEffectiveRank({
    humanScore,
    scoreQuantiles,
    maxPlayers: context.maxPlayers,
    profile: planning.profile,
    rankCounts: planning.rankCounts,
    rankRates: planning.rankRates,
    sessionSeed,
  });

  const localFills = generateSoloBotScores({
    humanScore,
    effectiveRank: recommended.effectiveRank,
    scoreLow: scoreQuantiles.p10,
    maxPlayers: context.maxPlayers,
    gameType: primaryGameType,
    sessionSeed,
  }).map((f, i) => ({
    ...f,
    duration: pickDurationFallbackMs(sessionSeed, f.rank + i),
  }));

  const slots = computeSoloBotScoreSlots({
    humanScore,
    effectiveRank: recommended.effectiveRank,
    scoreLow: scoreQuantiles.p10,
    maxPlayers: context.maxPlayers,
    gameType: primaryGameType,
  });

  const botFills = await pickSingleGameBotFills(ctx, {
    gameType: primaryGameType,
    slots,
    seedBinding: context.seedBinding,
    sessionSeed,
    localFills,
  });

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
  if (context.mode !== "single_human" && context.mode !== "mixed") return {};
  if (!isBotFillGameType(primaryGameType) && !context.isTriathlon) return {};

  const gameType: BotFillGameType = isBotFillGameType(primaryGameType)
    ? primaryGameType
    : "block_blast";

  let botFills: PlatformBotFillPayload[];
  if (context.mode === "single_human") {
    const result = await computeSingleHumanPlatformBotFills(ctx, {
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

  const withReveal = withPlatformRevealSchedule(botFills, context, {
    matchStartedAt,
    humanFinishedAt,
  });

  let seedScoreThreshold: number | undefined;
  if (context.successThresholdQuantile && context.seedBinding) {
    seedScoreThreshold = await resolvePlatformSeedScoreThreshold(ctx, {
      successThresholdQuantile: context.successThresholdQuantile,
      seedBinding: context.seedBinding,
      gameType,
    });
  }

  return {
    botFills: withReveal,
    replaceAllVirtual: true,
    ...(seedScoreThreshold != null ? { seedScoreThreshold } : {}),
  };
}

/** 单人 p75 等：从 seed 分位解析成功阈值（与 bot fill 无关，maxPlayers=1 时也需调用）。 */
export async function resolvePlatformSeedScoreThreshold(
  ctx: SeedPoolRuntimeCtx,
  args: {
    successThresholdQuantile?: "p75";
    seedBinding?: SlimSeedBinding;
    gameType: string;
  }
): Promise<number | undefined> {
  if (!args.successThresholdQuantile || !args.seedBinding) return undefined;
  const quantiles = await resolveSeedQuantiles(ctx, args.seedBinding, args.gameType);
  const threshold = quantiles[args.successThresholdQuantile];
  if (typeof threshold === "number" && Number.isFinite(threshold)) {
    return threshold;
  }
  return undefined;
}
