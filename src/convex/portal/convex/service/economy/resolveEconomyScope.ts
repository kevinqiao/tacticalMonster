import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  economyScopeKey,
  resolveLobbyOpsMode,
  type PortalLobbyOpsMode,
} from "../../data/portalLobbyOpsMode";

export type EconomyScope =
  | {
      mode: "shared";
      partnerId: number;
      lobbyId: null;
      scopeKey: "shared";
    }
  | {
      mode: "isolated";
      partnerId: number;
      lobbyId: Id<"portal_lobbies">;
      scopeKey: string;
    };

/**
 * Resolve economy partition for wallet / shop / ad-replay usage.
 * Matchmaking and player_seeds must NOT use this helper.
 */
export async function loadPartnerLobbyOpsMode(
  ctx: QueryCtx | MutationCtx,
  partnerId: number
): Promise<PortalLobbyOpsMode> {
  const row = await ctx.db
    .query("portal_partner_lobby_ops_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .unique();
  return resolveLobbyOpsMode(row?.lobbyOpsMode);
}

export async function resolveEconomyScope(
  ctx: QueryCtx | MutationCtx,
  args: {
    partnerId: number;
    lobbyId?: Id<"portal_lobbies"> | null;
  }
): Promise<EconomyScope> {
  const mode = await loadPartnerLobbyOpsMode(ctx, args.partnerId);
  if (mode === "shared") {
    return {
      mode: "shared",
      partnerId: args.partnerId,
      lobbyId: null,
      scopeKey: "shared",
    };
  }
  const lobbyId = args.lobbyId ?? null;
  if (!lobbyId) {
    throw new Error("lobby_required_for_isolated_economy");
  }
  return {
    mode: "isolated",
    partnerId: args.partnerId,
    lobbyId,
    scopeKey: economyScopeKey("isolated", lobbyId),
  };
}

export function matchPartitionKey(partnerId: number, templateId: string): string {
  return `p:${partnerId}|t:${templateId}`;
}
