import { internal } from "../../../_generated/api";
import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import {
  campaignDueTimeFromRun,
  campaignIdFromRun,
  campaignRewardModeFromRun,
} from "../../../data/portalPlayContext";
import { upsertCampaignLeagueHumanEntry } from "../../campaignLeague/campaignLeagueUpsert";

/**
 * On settle: pass_per_run → schedule campaign HTTP coupon issue;
 * competitive_leaderboard → inline Portal league upsert (no campaign HTTP).
 *
 * Campaign attrs SSOT: `portal_run_tournaments` only.
 * Missing campaignRewardMode with campaignId → skip (do not default to pass_per_run).
 */
export async function scheduleMerchantCampaignSettleNotify(
  ctx: MutationCtx,
  args: {
    runRow: Doc<"portal_run_tournaments"> | null;
    /** Kept for call-site continuity; campaign attrs come from runRow only. */
    matchDoc: Doc<"portal_run_matches">;
    pm: Doc<"portal_run_player_matches">;
    def: PortalTournamentDefinition;
    uid: string;
    score: number;
    rank?: number;
    isPassed?: boolean;
  }
): Promise<void> {
  void args.matchDoc;
  const campaignId = campaignIdFromRun(args.runRow);
  const partnerId = args.runRow?.contextSnapshot?.partnerId;
  if (!campaignId || partnerId == null) return;

  const rewardMode = campaignRewardModeFromRun(args.runRow);
  if (rewardMode !== "pass_per_run" && rewardMode !== "competitive_leaderboard") {
    return;
  }

  const mode = args.def.maxPlayers <= 1 ? ("solo" as const) : ("multi" as const);

  if (rewardMode === "pass_per_run") {
    await ctx.scheduler.runAfter(
      0,
      internal.service.bridge.merchantCampaignBridgeActions.notifyOnRunSettled,
      {
        campaignId,
        partnerId,
        uid: args.uid,
        runTournamentId: args.pm.tournamentId,
        matchId: args.pm.matchId,
        gameType: args.def.gameType,
        mode,
        score: args.score,
        rank: args.rank,
        isPassed: args.isPassed,
      }
    );
    return;
  }

  const dueTime = campaignDueTimeFromRun(args.runRow) ?? 0;
  if (dueTime <= 0) return;

  await upsertCampaignLeagueHumanEntry(ctx, {
    campaignId,
    partnerId,
    uid: args.uid,
    score: args.score,
    rank: args.rank,
    isPassed: args.isPassed,
    mode,
    dueTime,
    startsAt: args.runRow?.createdAt,
  });
}
