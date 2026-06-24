import { v } from "convex/values";

import {
  getPortalTournamentDefinition,
  getTournamentRankRates,
  type CasualRankRateEntry,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import type { BotStrategyPlayerContext } from "../../../data/portalPlayerStrategyTypes";
import type { QueryCtx } from "../../../_generated/server";
import { internalQuery } from "../../../_generated/server";
import { resolvePlayerBotStrategyContext } from "../join/casualMatchmakingProfile";
import { loadPlayerTournamentRankCounts } from "../shared/casualPlayerTournamentRankStats";

/** solo bot ??????????(profile + rankCounts + rankRates) */
export type SoloRankPlanningBundle = {
  profile: BotStrategyPlayerContext;
  rankCounts: Record<number, number>;
  rankRates: CasualRankRateEntry[];
  maxPlayers: number;
};

export async function loadSoloRankPlanningBundle(
  ctx: QueryCtx,
  args: { uid: string; templateId: string; def: PortalTournamentDefinition }
): Promise<SoloRankPlanningBundle> {
  const { uid, templateId, def } = args;
  const profile = await resolvePlayerBotStrategyContext(ctx, {
    uid,
    templateId,
    def,
  });
  const rankCounts = await loadPlayerTournamentRankCounts(ctx, uid, templateId);
  const rankRates = getTournamentRankRates(def);
  return {
    profile,
    rankCounts,
    rankRates,
    maxPlayers: def.maxPlayers,
  };
}

/** ?? HTTP ??;?? resolve ? mode=solo ????????? */
export const getSoloRankPlanningInputs = internalQuery({
  args: {
    uid: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, { uid, templateId }) => {
    const def = getPortalTournamentDefinition(templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const bundle = await loadSoloRankPlanningBundle(ctx, { uid, templateId, def });
    return {
      ok: true as const,
      ...bundle,
    };
  },
});
