import { internal } from "../../../_generated/api";
import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";

export async function scheduleMerchantCampaignSettleNotify(
  ctx: MutationCtx,
  args: {
    runRow: Doc<"portal_run_tournaments"> | null;
    matchDoc: Doc<"portal_run_matches">;
    pm: Doc<"portal_run_player_matches">;
    def: PortalTournamentDefinition;
    uid: string;
    score: number;
    rank?: number;
    p75Success?: boolean;
  }
): Promise<void> {
  const campaignId = args.runRow?.campaignId ?? args.matchDoc.campaignId;
  const merchantId = args.runRow?.merchantId ?? args.matchDoc.merchantId;
  if (!campaignId || !merchantId) return;

  await ctx.scheduler.runAfter(
    0,
    internal.service.bridge.merchantCampaignBridgeActions.notifyOnRunSettled,
    {
      campaignId,
      merchantId,
      uid: args.uid,
      matchId: args.pm.matchId,
      gameType: args.def.gameType,
      mode: args.def.maxPlayers <= 1 ? ("solo" as const) : ("multi" as const),
      score: args.score,
      rank: args.rank,
      p75Success: args.p75Success,
    }
  );
}
