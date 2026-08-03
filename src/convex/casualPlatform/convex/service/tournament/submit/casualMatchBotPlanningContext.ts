import { v } from "convex/values";

import {
  getTournamentDefinition,
  getTournamentRankRates,
  type CasualRankRateEntry,
  type CasualTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import type { BotStrategyPlayerContext } from "../../../data/casualPlayerStrategyTypes";
import type { QueryCtx } from "../../../_generated/server";
import { internalQuery } from "../../../_generated/server";
import { resolvePlayerBotStrategyContext } from "../join/casualMatchmakingProfile";
import { loadPlayerTournamentRankCounts } from "../shared/casualPlayerTournamentRankStats";

/** solo bot 目标名次规划只读输入（profile + rankCounts + rankRates） */
export type SoloRankPlanningBundle = {
  profile: BotStrategyPlayerContext;
  rankCounts: Record<number, number>;
  rankRates: CasualRankRateEntry[];
  maxPlayers: number;
};

export async function loadSoloRankPlanningBundle(
  ctx: QueryCtx,
  args: { uid: string; templateId: string; def: CasualTournamentDefinition }
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

/** 独立 HTTP 契约；交分 resolve 在 mode=solo 时内联返回同构字段 */
export const getSoloRankPlanningInputs = internalQuery({
  args: {
    uid: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, { uid, templateId }) => {
    const def = getTournamentDefinition(templateId);
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
