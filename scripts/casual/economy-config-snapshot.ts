/**
 * 从 casualPlatform 配表提取平衡脚本镜像数据（stdout JSON）。
 * 由 economy-sync.mjs 调用；也可单独：npx tsx scripts/casual/economy-config-snapshot.ts
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CASUAL_F2P_PASS_TARGET_BAND,
  CASUAL_F2P_PASS_TARGET_LEVELS,
  CASUAL_SEASON_NOMINAL_WEEKS,
  DAILY_P75_COINS_SOFT_CAP,
  ECONOMY_SHOP_SINK_BY_PROFILE,
  PASS_MAX_LEVEL,
  PASS_XP_PER_LEVEL,
} from "../../src/convex/casualPlatform/convex/data/casualSeasonEconomyConstants.ts";
import { XP_DECAY_BY_ORDINAL } from "../../src/convex/casualPlatform/convex/data/casualPayoutPolicy.ts";
import {
  CASUAL_MISSION_TEMPLATES,
  type CasualMissionTemplate,
} from "../../src/convex/casualPlatform/convex/data/casualMissionTemplates.ts";
import {
  CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
  CASUAL_SOLO_P75_CHALLENGE_BLOCK_BLAST_ID,
  casualSettleBaseCoins,
  casualSettleBaseGems,
  getTournamentDefinition,
  type CasualTournamentDefinition,
} from "../../src/convex/casualPlatform/convex/data/casualTournamentConfigs.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

/** 分位奖期望：仅最高档命中；与 economy-balance 模型一致（中度画像锚点） */
const SCORE_TIER_HIT_RATES = { p33: 0.45, p66: 0.28, p90: 0.09 } as const;

/** 平衡脚本专用周尺度锚点（运行时配表未单独暴露时在此维护） */
const BALANCE_WEEKLY_ANCHORS = {
  leagueEndCoinsExpect: 25,
  leagueEndGemsExpect: 0.4,
  leaguePromoteVoucherExpect: 0.5,
  /** runs_15 4 券 + league 1 券 × ~50% 完成 */
  missionVouchersExpect: 4.5,
  passFreeVouchersPerWeek: 0.6,
  passFreeCoinsPerWeek: 35,
};

const NET_FLOW_BANDS = {
  coins: { min: -200, max: 700 },
  gems: { min: -15, max: 45 },
  vouchers: { min: -1, max: 4 },
};

const ASYNC_BB_IDS = {
  A: "casual_async_a_bb",
  B: "casual_async_b_bb",
  C: "casual_async_c_bb",
} as const;

const MISSION_IDS = {
  signIn: "daily_sign_in",
  dailyAsync1: "daily_platform_async_1",
  dailyRuns3: "daily_platform_runs_3",
  weeklyAsync8: "weekly_platform_async_8",
  weeklyRuns15: "weekly_platform_runs_15",
  weeklyLeaguePromote: "weekly_league_promote_1",
  seasonRuns60: "season_platform_runs_60",
} as const;

function missionById(taskId: string): CasualMissionTemplate | undefined {
  return CASUAL_MISSION_TEMPLATES.find((m) => m.taskId === taskId);
}

function entryCoins(def: CasualTournamentDefinition): number | undefined {
  return def.entry.kind === "coins" ? def.entry.amount : undefined;
}

function entryGems(def: CasualTournamentDefinition): number | undefined {
  return def.entry.kind === "gems" ? def.entry.amount : undefined;
}

function expectScoreTierFromDef(def: CasualTournamentDefinition): {
  expectScoreTierCoins?: number;
  expectScoreTierGems?: number;
} {
  const tiers = def.rewards.scoreTierRewards;
  if (!tiers?.length) return {};

  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
  const cumRates = [
    SCORE_TIER_HIT_RATES.p90,
    SCORE_TIER_HIT_RATES.p66,
    SCORE_TIER_HIT_RATES.p33,
  ];

  let coinExpect = 0;
  let gemExpect = 0;
  for (let i = 0; i < sorted.length && i < cumRates.length; i++) {
    const prev = i === 0 ? 0 : cumRates[i - 1]!;
    const marginal = cumRates[i]! - prev;
    const tier = sorted[i]!;
    if (tier.coins != null) coinExpect += marginal * tier.coins;
    if (tier.gems != null) gemExpect += marginal * tier.gems;
  }

  return {
    ...(coinExpect > 0 ? { expectScoreTierCoins: Math.round(coinExpect * 10) / 10 } : {}),
    ...(gemExpect > 0 ? { expectScoreTierGems: Math.round(gemExpect * 100) / 100 } : {}),
  };
}

function asyncTierSnapshot(tier: "A" | "B" | "C") {
  const def = getTournamentDefinition(ASYNC_BB_IDS[tier]);
  if (!def) throw new Error(`missing tournament ${ASYNC_BB_IDS[tier]}`);
  const tierExpect = expectScoreTierFromDef(def);
  return {
    entryCoins: entryCoins(def),
    entryGems: entryGems(def),
    baseCoins: casualSettleBaseCoins(def),
    baseGems: casualSettleBaseGems(def),
    passXp: def.seasonXpOnSettle,
    ...tierExpect,
    sourceTournamentId: def.tournamentId,
  };
}

function p75Snapshot() {
  const def = getTournamentDefinition(CASUAL_SOLO_P75_CHALLENGE_BLOCK_BLAST_ID);
  if (!def) throw new Error("missing p75 block blast template");
  return {
    baseCoins: casualSettleBaseCoins(def),
    successCoins: def.seedQuantileSuccess?.coins ?? 0,
    passXp: def.seasonXpOnSettle,
    sourceTournamentId: def.tournamentId,
  };
}

function readDailyGrowthFullXpGames(): number | null {
  const path = join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/service/payout/casualPayoutDailyService.ts"
  );
  const text = readFileSync(path, "utf8");
  const m = text.match(/export const DAILY_GROWTH_FULL_XP_GAMES = (\d+)/);
  return m ? Number(m[1]) : null;
}

function missionPassXp(taskId: string): number {
  return missionById(taskId)?.rewardSeasonXp ?? 0;
}

function missionVouchers(taskId: string): number {
  return missionById(taskId)?.rewardVouchers ?? 0;
}

const spotlightDef = getTournamentDefinition(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID);
const seasonChallengeVoucherCost =
  spotlightDef?.entry.kind === "seasonVouchers" ? spotlightDef.entry.amount : 2;

const weeklyMissionPassXp =
  missionPassXp(MISSION_IDS.weeklyAsync8) +
  missionPassXp(MISSION_IDS.weeklyRuns15) +
  missionPassXp(MISSION_IDS.weeklyLeaguePromote);

const signInMission = missionById(MISSION_IDS.signIn);

const snapshot = {
  generatedFrom: [
    "casualSeasonEconomyConstants.ts",
    "casualPayoutPolicy.ts",
    "casualTournamentConfigs.ts (block_blast A/B/C + p75 + season_challenge_bb)",
    "casualMissionTemplates.ts (platform 任务子集)",
    "casualPayoutDailyService.ts (DAILY_GROWTH_FULL_XP_GAMES)",
  ],
  meta: {
    scoreTierHitRates: SCORE_TIER_HIT_RATES,
    balanceWeeklyAnchors: BALANCE_WEEKLY_ANCHORS,
    dailyGrowthFullXpGames: readDailyGrowthFullXpGames(),
  },
  PASS_XP_PER_LEVEL,
  PASS_MAX_LEVEL,
  CASUAL_SEASON_NOMINAL_WEEKS,
  CASUAL_F2P_PASS_TARGET_LEVELS,
  CASUAL_F2P_PASS_TARGET_BAND,
  DAILY_P75_COINS_SOFT_CAP,
  NET_FLOW_BANDS,
  DEFAULT_TOURNAMENTS: {
    A: asyncTierSnapshot("A"),
    B: asyncTierSnapshot("B"),
    C: asyncTierSnapshot("C"),
  },
  DEFAULT_P75: p75Snapshot(),
  SIGN_IN: {
    coins: signInMission?.rewardCoins ?? 15,
    passXp: signInMission?.rewardSeasonXp ?? 8,
  },
  DEFAULT_XP_DECAY_BY_ORDINAL: [...XP_DECAY_BY_ORDINAL],
  DAILY_MISSION_PASS_XP:
    missionPassXp(MISSION_IDS.dailyAsync1) + missionPassXp(MISSION_IDS.dailyRuns3),
  DEFAULT_WEEKLY: {
    ...BALANCE_WEEKLY_ANCHORS,
    missionPassXp: weeklyMissionPassXp,
    seasonMissionPassXpPerWeek:
      missionPassXp(MISSION_IDS.seasonRuns60) / CASUAL_SEASON_NOMINAL_WEEKS,
  },
  SEASON_CHALLENGE_VOUCHER_COST: seasonChallengeVoucherCost,
  SHOP_SINK_BY_PROFILE: ECONOMY_SHOP_SINK_BY_PROFILE,
};

console.log(JSON.stringify(snapshot, null, 2));
