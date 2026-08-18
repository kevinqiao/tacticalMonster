import {
  DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  type PortalWeeklyLeagueTierId,
} from "../../data/portalWeeklyLeagueConfig";
import { resolveLeagueScope } from "../../data/portalLeagueScope";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

type ProfileRow = {
  _id: Id<"portal_weekly_league_profile">;
  weeklyLeagueTier: string;
  peakLeagueTier: string;
  leagueScopeKey?: string;
  lobbyId?: Id<"portal_lobbies">;
  gameType?: string;
  totalMatchWins?: number;
  totalMultiplayerWins?: number;
  totalWeeklyPromotions?: number;
  unreadSeasonMarks?: boolean;
  unreadSeasonId?: string;
  unreadSeasonLevel?: number;
  unlockedTournamentIds?: string[];
};

export async function findWeeklyLeagueProfile(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  leagueScopeKey: string
): Promise<ProfileRow | null> {
  return (
    (await ctx.db
      .query("portal_weekly_league_profile")
      .withIndex("by_uid_scope", (q) => q.eq("uid", uid).eq("leagueScopeKey", leagueScopeKey))
      .unique()) ?? null
  );
}

export async function readWeeklyLeagueTierForScope(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  leagueScopeKey: string
): Promise<PortalWeeklyLeagueTierId> {
  const profile = await findWeeklyLeagueProfile(ctx, uid, leagueScopeKey);
  const tier = profile?.weeklyLeagueTier as PortalWeeklyLeagueTierId | undefined;
  return tier ?? DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER;
}

export async function ensureWeeklyLeagueProfileForScope(
  ctx: MutationCtx,
  uid: string,
  leagueScopeKey: string,
  now: number = Date.now()
): Promise<{ weeklyLeagueTier: PortalWeeklyLeagueTierId; peakLeagueTier: PortalWeeklyLeagueTierId }> {
  const existing = await findWeeklyLeagueProfile(ctx, uid, leagueScopeKey);
  if (existing) {
    return {
      weeklyLeagueTier: existing.weeklyLeagueTier as PortalWeeklyLeagueTierId,
      peakLeagueTier: existing.peakLeagueTier as PortalWeeklyLeagueTierId,
    };
  }

  await ctx.db.insert("portal_weekly_league_profile", {
    uid,
    leagueScopeKey,
    weeklyLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    peakLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    updatedAt: now,
  });

  return {
    weeklyLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    peakLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  };
}

export async function readWeeklyLeagueTier(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  gameType: string
): Promise<PortalWeeklyLeagueTierId> {
  const scope = resolveLeagueScope({ gameType });
  return readWeeklyLeagueTierForScope(ctx, uid, scope!.leagueScopeKey);
}

export async function readWeeklyLeagueTierForLobby(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">
): Promise<PortalWeeklyLeagueTierId> {
  const scope = resolveLeagueScope({ lobbyId });
  return readWeeklyLeagueTierForScope(ctx, uid, scope!.leagueScopeKey);
}

export async function ensureWeeklyLeagueProfile(
  ctx: MutationCtx,
  uid: string,
  gameType: string,
  now: number = Date.now()
): Promise<{ weeklyLeagueTier: PortalWeeklyLeagueTierId; peakLeagueTier: PortalWeeklyLeagueTierId }> {
  const scope = resolveLeagueScope({ gameType });
  return ensureWeeklyLeagueProfileForScope(ctx, uid, scope!.leagueScopeKey, now);
}

export async function ensureWeeklyLeagueProfileForLobby(
  ctx: MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  now: number = Date.now()
): Promise<{ weeklyLeagueTier: PortalWeeklyLeagueTierId; peakLeagueTier: PortalWeeklyLeagueTierId }> {
  const scope = resolveLeagueScope({ lobbyId });
  return ensureWeeklyLeagueProfileForScope(ctx, uid, scope!.leagueScopeKey, now);
}
