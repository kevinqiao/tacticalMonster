import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import type { CasualReferenceScoreQuantiles } from "../../../data/portalTournamentConfigs";
import {
  portalRankCoinReward,
  resolveEffectiveTournamentRewards,
} from "../../../data/portalTournamentConfigs";
import { applyPortalMatchPoints } from "../../points/portalWeeklyPointsService";

/** Portal 结算：周积分 + 模板金币奖励；campaign 对局跳过全球周榜 */
export async function applyPortalTemplateScoreEffects(
  ctx: MutationCtx,
  def: PortalTournamentDefinition,
  args: {
    uid: string;
    score: number;
    runTournamentId?: string;
    multiplayerFinalRank?: number;
    seedScoreThreshold?: number;
    seedScoreQuantiles?: CasualReferenceScoreQuantiles;
  }
): Promise<{
  pointDelta: number;
  weeklyPointsAfter: number;
  weekKey: string;
  coinsGranted?: number;
}> {
  if (args.runTournamentId) {
    const runRow = await ctx.db.get(args.runTournamentId as Id<"portal_run_tournaments">);
    if (runRow?.campaignId) {
      return { pointDelta: 0, weeklyPointsAfter: 0, weekKey: "" };
    }
  }
  const runId = args.runTournamentId as Id<"portal_run_tournaments">;
  const points = await applyPortalMatchPoints(ctx, {
    uid: args.uid,
    def,
    score: args.score,
    rank: args.multiplayerFinalRank,
    seedScoreThreshold: args.seedScoreThreshold,
    runTournamentId: runId,
  });

  let coinsGranted = 0;
  if (def.matchType === "multi_ranked" && args.multiplayerFinalRank != null) {
    coinsGranted = portalRankCoinReward(def, args.multiplayerFinalRank);
  } else if (def.matchType === "solo_p75") {
    const { coinRewards } = resolveEffectiveTournamentRewards(def);
    const ok =
      typeof args.seedScoreThreshold === "number" &&
      Number.isFinite(args.seedScoreThreshold) &&
      args.score >= args.seedScoreThreshold;
    const raw = ok ? coinRewards.soloSuccess : coinRewards.soloFail;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      coinsGranted = Math.max(0, Math.floor(raw));
    }
  }
  if (coinsGranted > 0) {
    await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
      uid: args.uid,
      kind: "coins",
      amount: coinsGranted,
      reason: `tournament_reward:${def.tournamentId}`,
      gameType: def.gameType,
    });
  }

  if (args.runTournamentId && (coinsGranted > 0 || def.entry.kind === "coins")) {
    const pt = await ctx.db
      .query("portal_run_player_tournaments")
      .withIndex("by_tournament_uid", (q) =>
        q.eq("tournamentId", args.runTournamentId as Id<"portal_run_tournaments">).eq("uid", args.uid)
      )
      .unique();
    if (pt) {
      await ctx.db.patch(pt._id, {
        coinsGranted,
        updatedAt: Date.now(),
      });
    }
  }

  return { ...points, ...(coinsGranted > 0 ? { coinsGranted } : {}) };
}

/** @deprecated alias */
export const applyCasualTemplateScoreEffects = applyPortalTemplateScoreEffects;

export async function persistPendingRunRewards(): Promise<void> {
  /* portal: points applied immediately; no pending wallet */
}

export function prunePendingWalletRewards(): undefined {
  return undefined;
}
