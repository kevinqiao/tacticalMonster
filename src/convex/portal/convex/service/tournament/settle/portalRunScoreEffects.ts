import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import type { CasualReferenceScoreQuantiles } from "../../../data/portalTournamentConfigs";
import {
  portalRankCoinReward,
  resolveEffectiveTournamentRewards,
} from "../../../data/portalTournamentConfigs";
import {
  isCampaignRun,
  lobbyIdFromJoin,
  resolveWalletScopeFromRun,
  rewardsOverrideFromJoin,
} from "../../../data/portalPlayContext";
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
    if (isCampaignRun(runRow)) {
      return { pointDelta: 0, weeklyPointsAfter: 0, weekKey: "" };
    }
  }
  const runId = args.runTournamentId as Id<"portal_run_tournaments">;

  const playerTournament = args.runTournamentId
    ? await ctx.db
        .query("portal_run_player_tournaments")
        .withIndex("by_tournament_uid", (q) =>
          q
            .eq("tournamentId", args.runTournamentId as Id<"portal_run_tournaments">)
            .eq("uid", args.uid)
        )
        .unique()
    : null;

  const runRow = args.runTournamentId
    ? await ctx.db.get(args.runTournamentId as Id<"portal_run_tournaments">)
    : null;

  const joinLobbyId = lobbyIdFromJoin(playerTournament, runRow);
  const rewardsOverride = rewardsOverrideFromJoin(playerTournament, runRow);

  const points = await applyPortalMatchPoints(ctx, {
    uid: args.uid,
    def,
    score: args.score,
    rank: args.multiplayerFinalRank,
    seedScoreThreshold: args.seedScoreThreshold,
    seedScoreQuantiles: args.seedScoreQuantiles,
    runTournamentId: runId,
    joinLobbyId: joinLobbyId ?? undefined,
    rewardsOverride: rewardsOverride ?? undefined,
  });

  let coinsGranted = 0;
  if (def.matchType === "multi_ranked" && args.multiplayerFinalRank != null) {
    coinsGranted = portalRankCoinReward(def, args.multiplayerFinalRank, rewardsOverride);
  } else if (def.matchType === "solo_p75" && !points.soloRewardsMuted) {
    const { coinRewards } = resolveEffectiveTournamentRewards(def, rewardsOverride);
    const ok =
      typeof args.seedScoreThreshold === "number" &&
      Number.isFinite(args.seedScoreThreshold) &&
      args.score >= args.seedScoreThreshold;
    // Fail coins only when explicitly configured (>0); default fail has no penalty/reward.
    const raw = ok ? coinRewards.soloSuccess : coinRewards.soloFail;
    if (typeof raw === "number" && Number.isFinite(raw) && (ok || raw > 0)) {
      coinsGranted = Math.max(0, Math.floor(raw));
    }
  }
  if (coinsGranted > 0) {
    const walletScope = await resolveWalletScopeFromRun(ctx, runRow);
    await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
      uid: args.uid,
      kind: "coins",
      amount: coinsGranted,
      reason: `tournament_reward:${def.tournamentId}`,
      gameType: def.gameType,
      scopeKey: walletScope.scopeKey,
      ...(walletScope.lobbyId ? { lobbyId: walletScope.lobbyId } : {}),
    });
  }

  if (
    playerTournament &&
    (coinsGranted > 0 ||
      def.entry.kind === "coins" ||
      // Persist explicit 0 when solo daily cap mutes rewards (history must not recompute payouts).
      (def.matchType === "solo_p75" && points.soloRewardsMuted === true))
  ) {
    await ctx.db.patch(playerTournament._id, {
      coinsGranted,
      updatedAt: Date.now(),
    });
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
