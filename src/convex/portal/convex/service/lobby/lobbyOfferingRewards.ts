import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type {
  PortalSoloPointsOverride,
  PortalTournamentDefinition,
} from "../../data/portalTournamentConfigs";

export type RewardsOverrideSnapshot = {
  soloPoints?: PortalSoloPointsOverride;
  rankPoints?: Record<string, number>;
  coins?: {
    soloSuccess?: number;
    soloFail?: number;
    rankCoins?: Record<string, number>;
  };
};

export type EntrySnapshot = {
  kind: "none" | "coins" | "gems";
  amount?: number;
};

/** Load offering rewardsOverride for a lobby + tournament template. */
export async function loadLobbyRewardsOverride(
  ctx: QueryCtx | MutationCtx,
  lobbyId: Id<"portal_lobbies"> | null | undefined,
  tournamentId: string
): Promise<RewardsOverrideSnapshot | undefined> {
  if (!lobbyId) return undefined;
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) return undefined;
  const offering = (lobby.offerings ?? []).find(
    (o) => o.tournamentId === tournamentId && o.enabled !== false
  );
  return offering?.rewardsOverride as RewardsOverrideSnapshot | undefined;
}

export function entrySnapshotFromDef(
  def: Pick<PortalTournamentDefinition, "entry">
): EntrySnapshot {
  if (def.entry.kind === "coins") {
    return { kind: "coins", amount: def.entry.amount };
  }
  if (def.entry.kind === "gems") {
    return { kind: "gems", amount: def.entry.amount };
  }
  return { kind: "none" };
}
