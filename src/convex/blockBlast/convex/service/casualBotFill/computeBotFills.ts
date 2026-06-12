/**
 * Block Blast casual v2 bot fills：静态 template quantiles + generateSoloBotScores（无 rollout pool）。
 */
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

import { fetchCasualMatchSubmitContext } from "../casualBridgeResolve";
import {
  attachRevealAtToBotFills,
  buildBotRevealPlanSeedKey,
} from "./botRevealSchedule";
import {
  computeFixedTopBotScoreSlots,
  deriveRankScoreFloorsFromQuantiles,
  generateSoloBotScores,
  hashSessionSeed,
  pickDurationFallbackMs,
  type ScoreQuantiles,
} from "./botDifficulty";
import { recommendSoloEffectiveRank } from "./soloRankRecommend";
import {
  parseTemplateIdFromSeedId,
  resolveTemplateQuantiles,
} from "../casualPlatform/casualTemplateQuantiles";

export type SlimCasualSeedBinding = {
  seedId: string;
  poolVersion: string;
  tier: "easy" | "medium" | "hard";
};

export type CasualSeedBinding = SlimCasualSeedBinding & {
  scoreQuantiles: ScoreQuantiles;
};

export type SoloRankPlanningInputs = {
  profile: import("./botStrategyTypes").BotStrategyPlayerContext;
  rankCounts: Record<number, number>;
  rankRates: import("./botStrategyTypes").CasualRankRateEntry[];
  maxPlayers: number;
};

export type ResolveSubmitContext = {
  ok: true;
  mode: "daily" | "solo" | "mixed";
  templateId: string;
  matchId: string;
  maxPlayers: number;
  humanPlayerCount: number;
  botCount: number;
  seedBinding?: SlimCasualSeedBinding;
  sessionExternalId: string;
  botsSeeded: boolean;
  humanScores: Array<{ uid: string; score: number }>;
  wasHumanReplay: boolean;
  humanReplayEpoch?: number;
  soloRankPlanning?: SoloRankPlanningInputs;
};

export type BotFillPayload = {
  rank: number;
  score: number;
  duration?: number;
  revealAt?: number;
};

export type CasualV2IngestPayload = {
  uid: string;
  matchGameId: string;
  score: number;
  botFills?: BotFillPayload[];
  replaceAllVirtual?: boolean;
};

const GAME_TYPE = "block_blast" as const;

function resolveSeedBindingWithQuantiles(slim: SlimCasualSeedBinding): CasualSeedBinding {
  const templateId = parseTemplateIdFromSeedId(slim.seedId);
  if (!templateId) {
    throw new Error("missing_seed_quantiles");
  }
  const quantiles = resolveTemplateQuantiles(templateId);
  if (!quantiles) {
    throw new Error("missing_seed_quantiles");
  }
  return { ...slim, scoreQuantiles: quantiles };
}

function localFillsFromSlots(
  slots: Array<{ rank: number; low: number; high: number }>,
  sessionSeed: number
): BotFillPayload[] {
  return slots.map((slot, i) => {
    const high = Number.isFinite(slot.high) ? slot.high : slot.low + 2000;
    return {
      rank: slot.rank,
      score: Math.floor(slot.low + (high - slot.low) * 0.5),
      duration: pickDurationFallbackMs(sessionSeed, i),
    };
  });
}

export async function computeSoloBotFills(args: {
  context: ResolveSubmitContext;
  humanScore: number;
}): Promise<{ botFills: BotFillPayload[]; effectiveRank: number }> {
  const { context, humanScore } = args;
  if (!context.seedBinding) {
    throw new Error("missing_seed_binding");
  }

  const seedBinding = resolveSeedBindingWithQuantiles(context.seedBinding);
  const sessionSeed = hashSessionSeed(`${context.templateId}|${context.sessionExternalId}`);

  const planning = context.soloRankPlanning;
  if (!planning?.profile) {
    throw new Error("missing_solo_rank_planning");
  }

  const recommended = recommendSoloEffectiveRank({
    humanScore,
    scoreQuantiles: seedBinding.scoreQuantiles,
    maxPlayers: context.maxPlayers,
    profile: planning.profile,
    rankCounts: planning.rankCounts,
    rankRates: planning.rankRates,
    sessionSeed,
  });

  const effectiveRank = recommended.effectiveRank;
  const rankFloors = deriveRankScoreFloorsFromQuantiles(
    seedBinding.scoreQuantiles,
    context.maxPlayers
  );

  const botFills = generateSoloBotScores({
    humanScore,
    effectiveRank,
    rankFloors,
    maxPlayers: context.maxPlayers,
    gameType: GAME_TYPE,
    sessionSeed,
  }).map((f, i) => ({
    ...f,
    duration: pickDurationFallbackMs(sessionSeed, f.rank + i),
  }));

  return { botFills, effectiveRank };
}

export async function computeMixedBotFillsDPrime(args: {
  context: ResolveSubmitContext;
  humanScore: number;
}): Promise<BotFillPayload[]> {
  const { context } = args;
  if (!context.seedBinding) {
    throw new Error("missing_seed_binding");
  }

  const seedBinding = resolveSeedBindingWithQuantiles(context.seedBinding);
  const rankFloors = deriveRankScoreFloorsFromQuantiles(
    seedBinding.scoreQuantiles,
    context.maxPlayers
  );
  const sessionSeed = hashSessionSeed(`${context.templateId}|${context.sessionExternalId}`);

  const slots = computeFixedTopBotScoreSlots({
    botCount: context.botCount,
    rankFloors,
    gameType: GAME_TYPE,
  });

  void args.humanScore;
  return localFillsFromSlots(slots, sessionSeed);
}

function withAsyncRevealSchedule(
  botFills: BotFillPayload[],
  context: ResolveSubmitContext,
  timing: { matchStartedAt: number; humanFinishedAt: number }
): BotFillPayload[] {
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

async function resolveHumanRevealWindow(
  ctx: ActionCtx,
  matchGameId: string,
  humanFinishedAt: number
): Promise<{ matchStartedAt: number; humanFinishedAt: number }> {
  const game = await ctx.runQuery(internal.service.gameManager.findGame, { gameId: matchGameId });
  const started =
    game?.lastUpdate != null && Number.isFinite(game.lastUpdate)
      ? Math.floor(game.lastUpdate)
      : humanFinishedAt;
  return {
    matchStartedAt: Math.min(started, humanFinishedAt),
    humanFinishedAt,
  };
}

export async function buildCasualV2IngestPayload(args: {
  ctx: ActionCtx;
  uid: string;
  matchGameId: string;
  score: number;
}): Promise<
  | { ok: true; payload: CasualV2IngestPayload }
  | { ok: false; error: string }
> {
  const resolved = await fetchCasualMatchSubmitContext({
    uid: args.uid,
    matchGameId: args.matchGameId,
    score: args.score,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const context = resolved.context;
  const humanFinishedAt = Date.now();
  const revealWindow = await resolveHumanRevealWindow(
    args.ctx,
    args.matchGameId,
    humanFinishedAt
  );

  let payload: CasualV2IngestPayload = {
    uid: args.uid,
    matchGameId: args.matchGameId,
    score: args.score,
  };

  if (context.mode === "solo" && !context.botsSeeded) {
    const { botFills } = await computeSoloBotFills({
      context,
      humanScore: args.score,
    });
    payload = {
      uid: args.uid,
      matchGameId: args.matchGameId,
      score: args.score,
      botFills: withAsyncRevealSchedule(botFills, context, revealWindow),
      replaceAllVirtual: true,
    };
  } else if (context.mode === "mixed" && !context.botsSeeded) {
    const botFills = await computeMixedBotFillsDPrime({
      context,
      humanScore: args.score,
    });
    payload = {
      uid: args.uid,
      matchGameId: args.matchGameId,
      score: args.score,
      botFills: withAsyncRevealSchedule(botFills, context, revealWindow),
      replaceAllVirtual: true,
    };
  }

  return { ok: true, payload };
}
