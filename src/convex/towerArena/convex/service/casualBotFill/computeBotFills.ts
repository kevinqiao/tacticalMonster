import { internal } from "../../_generated/api";

import { fetchCasualMatchSubmitContext } from "../casualBridgeResolve";

import type { ActionCtx } from "../../_generated/server";

import {

  botSlotsToScoreBands,

  pickScoresFromRolloutBands,

  type AsyncBotFillFromRollout,

} from "./rolloutPick";

import {

  computeFixedTopBotScoreSlots,

  computeSoloBotScoreSlots,

  deriveRankScoreFloorsFromQuantiles,

  generateSoloBotScores,

  hashSessionSeed,

  pickDurationFallbackMs,

  type ScoreQuantiles,

} from "./botDifficulty";

import { recommendSoloEffectiveRank } from "./soloRankRecommend";
import type { BotStrategyPlayerContext, CasualRankRateEntry } from "./botStrategyTypes";

import {
  attachRevealAtToBotFills,
  buildBotRevealPlanSeedKey,
} from "./botRevealSchedule";



export type SlimCasualSeedBinding = {

  seedId: string;

  poolVersion: string;

  tier: "easy" | "medium" | "hard";

};



export type CasualSeedBinding = SlimCasualSeedBinding & {

  scoreQuantiles: ScoreQuantiles;

};



export type SoloRankPlanningInputs = {

  profile: BotStrategyPlayerContext;

  rankCounts: Record<number, number>;

  rankRates: CasualRankRateEntry[];

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

  /** mode=solo 时由 resolve-match-submit-context 一并返回 */
  soloRankPlanning?: SoloRankPlanningInputs;

};



export type BotFillPayload = {

  rank: number;

  score: number;

  duration?: number;

  rolloutIndex?: number;

  revealAt?: number;

};



export type CasualV2IngestPayload = {

  uid: string;

  matchGameId: string;

  score: number;

  botFills?: BotFillPayload[];

  replaceAllVirtual?: boolean;

};



async function resolveSeedBindingWithQuantiles(

  ctx: ActionCtx,

  slim: SlimCasualSeedBinding

): Promise<CasualSeedBinding> {

  const entry = await ctx.runQuery(

    internal.service.seedPool.towerSeedPoolQueries.getSeedEntryBySeedId,

    { seedId: slim.seedId, poolVersion: slim.poolVersion }

  );

  const quantiles = entry?.metrics?.scoreQuantiles;

  if (!quantiles) {

    throw new Error("missing_seed_quantiles");

  }

  return { ...slim, scoreQuantiles: quantiles };

}



async function fetchRolloutBands(

  ctx: ActionCtx,

  seedBinding: CasualSeedBinding,

  bands: ReturnType<typeof botSlotsToScoreBands>

): Promise<Array<{ min: number; max?: number; rollouts: Array<{ rolloutIndex: number; finalScore: number; elapsedTime?: number }> }>> {

  const result = await ctx.runQuery(

    internal.service.seedPool.casualMatchSeedHttp.rolloutsForCasualMatchSeed,

    {

      seedId: seedBinding.seedId,

      poolVersion: seedBinding.poolVersion,

      scores: bands,

    }

  );

  if (!result.ok) {

    return bands.map((b) => ({ ...b, rollouts: [] }));

  }

  return result.bands;

}



async function pickBotFillsFromSlots(args: {

  ctx: ActionCtx;

  slots: Array<{ rank: number; low: number; high: number }>;

  seedBinding: CasualSeedBinding;

  sessionSeed: number;

  localFills: Array<{ rank: number; score: number; duration?: number }>;

}): Promise<BotFillPayload[]> {

  const bands = botSlotsToScoreBands(args.slots);

  const rolloutBands = await fetchRolloutBands(args.ctx, args.seedBinding, bands);

  const fills: AsyncBotFillFromRollout[] = pickScoresFromRolloutBands({

    slots: args.slots,

    bands: rolloutBands,

    sessionSeed: args.sessionSeed,

    gameType: "tower_arena",

    localFills: args.localFills.map((f) => ({

      ...f,

      duration: f.duration ?? pickDurationFallbackMs(args.sessionSeed, f.rank),

    })),

  });

  return fills.map((f) => ({

    rank: f.rank,

    score: f.score,

    duration: f.duration,

    ...(f.rolloutIndex != null ? { rolloutIndex: f.rolloutIndex } : {}),

  }));

}



export async function computeSoloBotFills(args: {

  ctx: ActionCtx;

  context: ResolveSubmitContext;

  uid: string;

  humanScore: number;

}): Promise<{ botFills: BotFillPayload[]; effectiveRank: number }> {

  const { context, uid, humanScore } = args;

  if (!context.seedBinding) {

    throw new Error("missing_seed_binding");

  }



  const seedBinding = await resolveSeedBindingWithQuantiles(args.ctx, context.seedBinding);

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



  const localFills = generateSoloBotScores({

    humanScore,

    effectiveRank,

    rankFloors,

    maxPlayers: context.maxPlayers,

    gameType: "tower_arena",

    sessionSeed,

  }).map((f, i) => ({

    ...f,

    duration: pickDurationFallbackMs(sessionSeed, f.rank + i),

  }));



  const slots = computeSoloBotScoreSlots({

    humanScore,

    effectiveRank,

    rankFloors,

    maxPlayers: context.maxPlayers,

    gameType: "tower_arena",

  });



  const botFills = await pickBotFillsFromSlots({

    ctx: args.ctx,

    slots,

    seedBinding,

    sessionSeed,

    localFills,

  });



  return { botFills, effectiveRank };

}



export async function computeMixedBotFillsDPrime(args: {

  ctx: ActionCtx;

  context: ResolveSubmitContext;

  humanScore: number;

}): Promise<BotFillPayload[]> {

  const { context, humanScore } = args;

  if (!context.seedBinding) {

    throw new Error("missing_seed_binding");

  }

  const seedBinding = await resolveSeedBindingWithQuantiles(args.ctx, context.seedBinding);

  const rankFloors = deriveRankScoreFloorsFromQuantiles(

    seedBinding.scoreQuantiles,

    context.maxPlayers

  );

  const sessionSeed = hashSessionSeed(`${context.templateId}|${context.sessionExternalId}`);



  const slots = computeFixedTopBotScoreSlots({

    botCount: context.botCount,

    rankFloors,

    gameType: "tower_arena",

  });



  const localFills = slots.map((slot, i) => {

    const high = Number.isFinite(slot.high) ? slot.high : slot.low + 2000;

    return {

      rank: slot.rank,

      score: Math.floor(slot.low + (high - slot.low) * 0.5),

      duration: pickDurationFallbackMs(sessionSeed, i),

    };

  });



  void humanScore;



  return pickBotFillsFromSlots({

    ctx: args.ctx,

    slots,

    seedBinding,

    sessionSeed,

    localFills,

  });

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
    game?.playStartedAt != null && Number.isFinite(game.playStartedAt)
      ? Math.floor(game.playStartedAt)
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



  /** bot 补位仅在首次 ingest（botsSeeded=false）写入；再战只更新真人分，保留已有虚拟对手 */
  if (context.mode === "solo" && !context.botsSeeded) {

    const { botFills } = await computeSoloBotFills({

      ctx: args.ctx,

      context,

      uid: args.uid,

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

      ctx: args.ctx,

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


