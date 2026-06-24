import type { MutationCtx } from "../../_generated/server";
import type { PortalTournamentDefinition } from "../../data/portalTournamentConfigs";

export async function applyWeeklyLeagueOnMatchSettle(
  _ctx: MutationCtx,
  _args: {
    uid: string;
    def: PortalTournamentDefinition;
    seasonXpOnSettle?: number;
    multiplayerFinalRank?: number;
    sessionKind?: string;
    now?: number;
    xpDecayMultiplier?: number;
  }
): Promise<null> {
  return null;
}

export async function readWeeklyLeagueTier(_ctx: unknown, _uid: string): Promise<string> {
  return "bronze";
}
