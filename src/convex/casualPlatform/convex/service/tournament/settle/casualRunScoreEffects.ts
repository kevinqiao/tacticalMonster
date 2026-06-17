/**
 * Run 结算：赛季梯、Pass XP、待发钱包奖励（与 ingest 共用）。
 */
import { internal } from "../../../_generated/api";
import {
  applyPassXpFromModifiers,
  casualSettleBaseCoins,
  casualSettleBaseGems,
  findCasualRankRewardEntry,
  findHighestScoreTierReward,
  type CasualTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { CASUAL_WEEKLY_LEAGUE_ENABLED } from "../../../data/casualWeeklyLeagueConfig";
import { applyWeeklyLeagueOnMatchSettle } from "../../weeklyLeague/casualWeeklyLeagueSettle";
import type { WeeklyLeagueSettlePayload } from "../../weeklyLeague/casualWeeklyLeagueService";
export function prunePendingWalletRewards(p: {
  coins?: number;
  gems?: number;
  seasonVoucher?: number;
}):
  | {
      coins?: number;
      gems?: number;
      seasonVoucher?: number;
    }
  | undefined {
  const o: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  } = {};
  if ((p.coins ?? 0) > 0) o.coins = p.coins;
  if ((p.gems ?? 0) > 0) o.gems = p.gems;
  if ((p.seasonVoucher ?? 0) > 0) o.seasonVoucher = p.seasonVoucher;
  return Object.keys(o).length > 0 ? o : undefined;
}

export async function activeSeasonId(ctx: MutationCtx): Promise<string | null> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const s = seasons.find((r) => r.active) ?? seasons[0];
  return s?.seasonId ?? null;
}

/** 结算待发奖写入 `casual_run_player_tournaments.pendingRunRewards`，由历史页 `claimCasualRunRewards` 领取 */
export async function persistPendingRunRewards(
  ctx: MutationCtx,
  runTournamentId: Id<"casual_run_tournaments"> | string,
  uid: string,
  rewards:
    | {
        coins?: number;
        gems?: number;
        seasonVoucher?: number;
      }
    | undefined
): Promise<void> {
  const pruned = rewards ? prunePendingWalletRewards(rewards) : undefined;
  if (!pruned) return;
  const pt = await ctx.db
    .query("casual_run_player_tournaments")
    .withIndex("by_tournament_uid", (q) =>
      q.eq("tournamentId", runTournamentId as Id<"casual_run_tournaments">).eq("uid", uid)
    )
    .unique();
  if (!pt) return;
  await ctx.db.patch(pt._id, {
    pendingRunRewards: pruned,
    updatedAt: Date.now(),
  });
}

export async function applyCasualTemplateScoreEffects(
  ctx: MutationCtx,
  def: CasualTournamentDefinition,
  args: {
    uid: string;
    tournamentId: string;
    gameType: string;
    score: number;
    matchId?: string;
    runTournamentId?: string;
    deferWalletRewards?: boolean;
    skipCasualAsyncBotSeed?: boolean;
    multiplayerFinalRank?: number;
    /** 单人 p75 挑战：该 seed 的成功阈值分（由游戏服按 seed 分位解析后带入） */
    seedScoreThreshold?: number;
    /** 为 true 时跳过 League XP（异步多人 finalize 路径单独写入） */
    skipWeeklyLeagueXp?: boolean;
    sessionKind?: "single" | "triathlon";
  }
): Promise<{
  pendingWalletRewards?: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  };
  weeklyLeagueSettle?: WeeklyLeagueSettlePayload;
}> {
  const { uid, tournamentId, score } = args;
  const deferWallet = args.deferWalletRewards !== false;
  const pendingWallet: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  } = {};

  const settleCoins = casualSettleBaseCoins(def);
  const settleGems = casualSettleBaseGems(def);
  const mpRank = args.multiplayerFinalRank;
  if (typeof mpRank === "number" && mpRank >= 1) {
    const rr = findCasualRankRewardEntry(def.rewards.rankRewards, mpRank);
    if (rr) {
      const mult = rr.multiplier ?? 1;
      if (rr.coins != null) {
        const rc = Math.floor(rr.coins * mult);
        if (rc > 0) pendingWallet.coins = (pendingWallet.coins ?? 0) + rc;
      }
      if (rr.gems != null) {
        const rg = Math.floor(rr.gems * mult);
        if (rg > 0) pendingWallet.gems = (pendingWallet.gems ?? 0) + rg;
      }
    }
  }
  // 单场（single_match）分位奖：按本局终分命中最高满足档，叠加到待发钱包。
  // 周期型（daily/weekly/season）由 `grantCasualScoreTierRewardsOnEachRunSettled` / 桶收尾处理，
  // 不走本函数，故此处不会重复发放。
  const scoreTier = findHighestScoreTierReward(def.rewards.scoreTierRewards, score);
  if (scoreTier) {
    const tc = scoreTier.coins != null ? Math.max(0, Math.floor(scoreTier.coins)) : 0;
    const tg = scoreTier.gems != null ? Math.max(0, Math.floor(scoreTier.gems)) : 0;
    if (tc > 0) pendingWallet.coins = (pendingWallet.coins ?? 0) + tc;
    if (tg > 0) pendingWallet.gems = (pendingWallet.gems ?? 0) + tg;
  }
  // 单人 p75 挑战：本局分数达到该 seed 的成功阈值（默认 p75）时叠加成功奖。
  const successReward = def.seedQuantileSuccess;
  if (
    successReward &&
    typeof args.seedScoreThreshold === "number" &&
    Number.isFinite(args.seedScoreThreshold) &&
    score >= args.seedScoreThreshold
  ) {
    const sc = successReward.coins != null ? Math.max(0, Math.floor(successReward.coins)) : 0;
    const sg = successReward.gems != null ? Math.max(0, Math.floor(successReward.gems)) : 0;
    if (sc > 0) pendingWallet.coins = (pendingWallet.coins ?? 0) + sc;
    if (sg > 0) pendingWallet.gems = (pendingWallet.gems ?? 0) + sg;
  }
  if (settleCoins > 0) {
    if (deferWallet) {
      pendingWallet.coins = (pendingWallet.coins ?? 0) + settleCoins;
    } else {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: settleCoins,
      });
    }
  }
  if (settleGems > 0) {
    if (deferWallet) {
      pendingWallet.gems = (pendingWallet.gems ?? 0) + settleGems;
    } else {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: settleGems,
      });
    }
  }
  let passXpDelta = def.seasonXpOnSettle;
  if (def.seasonXpOnSettle > 0) {
    const xpMods = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    passXpDelta = applyPassXpFromModifiers(
      def.seasonXpOnSettle,
      xpMods.passXpMultiplier,
      xpMods.passXpDelta
    );
  }
  if (passXpDelta > 0) {
    await ctx.runMutation(internal.service.season.casualSeasonService.addPassXpFromRun, {
      uid,
      deltaXp: passXpDelta,
    });
  }

  await ctx.runMutation(internal.service.task.casualTaskService.notifyScoreSubmitted, {
    uid,
    matchType: def.matchType,
    platformGameType: def.gameType,
    spotlightSeasonBoardGain: 0,
    ...(typeof args.multiplayerFinalRank === "number" && args.multiplayerFinalRank >= 1
      ? { multiplayerFinalRank: args.multiplayerFinalRank }
      : {}),
  });

  let weeklyLeagueSettle: WeeklyLeagueSettlePayload | null = null;
  if (
    CASUAL_WEEKLY_LEAGUE_ENABLED &&
    !args.skipWeeklyLeagueXp &&
    def.maxPlayers <= 1
  ) {
    weeklyLeagueSettle = await applyWeeklyLeagueOnMatchSettle(ctx, {
      uid,
      def,
      seasonXpOnSettle: passXpDelta,
      multiplayerFinalRank: args.multiplayerFinalRank ?? 1,
      sessionKind: args.sessionKind,
    });
  }

  const pendingPruned = deferWallet ? prunePendingWalletRewards(pendingWallet) : undefined;
  return {
    ...(pendingPruned ? { pendingWalletRewards: pendingPruned } : {}),
    ...(weeklyLeagueSettle ? { weeklyLeagueSettle } : {}),
  };
}
