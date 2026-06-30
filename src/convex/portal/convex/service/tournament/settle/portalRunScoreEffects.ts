import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import type { PortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import type { CasualReferenceScoreQuantiles } from "../../../data/portalTournamentConfigs";
import { applyPortalMatchPoints } from "../../points/portalWeeklyPointsService";

/** Portal 结算：仅写周积分，无钱包/Pass/League；campaign 对局跳过全球周榜 */
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
}> {
  if (args.runTournamentId) {
    const runRow = await ctx.db.get(args.runTournamentId as Id<"portal_run_tournaments">);
    if (runRow?.campaignId) {
      return { pointDelta: 0, weeklyPointsAfter: 0, weekKey: "" };
    }
  }
  const runId = args.runTournamentId as Id<"portal_run_tournaments">;
  return await applyPortalMatchPoints(ctx, {
    uid: args.uid,
    def,
    score: args.score,
    rank: args.multiplayerFinalRank,
    seedScoreThreshold: args.seedScoreThreshold,
    runTournamentId: runId,
  });
}

/** @deprecated alias */
export const applyCasualTemplateScoreEffects = applyPortalTemplateScoreEffects;

export async function persistPendingRunRewards(): Promise<void> {
  /* portal: points applied immediately; no pending wallet */
}

export function prunePendingWalletRewards(): undefined {
  return undefined;
}
