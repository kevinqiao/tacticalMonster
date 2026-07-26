import {
  DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  type PortalWeeklyLeagueTierId,
} from "../../data/portalWeeklyLeagueConfig";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function readWeeklyLeagueTier(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  gameType: string
): Promise<PortalWeeklyLeagueTierId> {
  const profile = await ctx.db
    .query("portal_weekly_league_profile")
    .withIndex("by_uid_game", (q) => q.eq("uid", uid).eq("gameType", gameType))
    .unique();
  const tier = profile?.weeklyLeagueTier as PortalWeeklyLeagueTierId | undefined;
  return tier ?? DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER;
}

export async function readWeeklyLeagueTierForLobby(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">
): Promise<PortalWeeklyLeagueTierId> {
  const profile = await ctx.db
    .query("portal_weekly_league_profile")
    .withIndex("by_uid_lobby", (q) => q.eq("uid", uid).eq("lobbyId", lobbyId))
    .unique();
  const tier = profile?.weeklyLeagueTier as PortalWeeklyLeagueTierId | undefined;
  return tier ?? DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER;
}

export async function ensureWeeklyLeagueProfile(
  ctx: MutationCtx,
  uid: string,
  gameType: string,
  now: number = Date.now()
): Promise<{ weeklyLeagueTier: PortalWeeklyLeagueTierId; peakLeagueTier: PortalWeeklyLeagueTierId }> {
  const existing = await ctx.db
    .query("portal_weekly_league_profile")
    .withIndex("by_uid_game", (q) => q.eq("uid", uid).eq("gameType", gameType))
    .unique();

  if (existing) {
    return {
      weeklyLeagueTier: existing.weeklyLeagueTier as PortalWeeklyLeagueTierId,
      peakLeagueTier: existing.peakLeagueTier as PortalWeeklyLeagueTierId,
    };
  }

  await ctx.db.insert("portal_weekly_league_profile", {
    uid,
    gameType,
    weeklyLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    peakLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    updatedAt: now,
  });

  return {
    weeklyLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    peakLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  };
}

/** Preferred: tier profile keyed by lobby. */
export async function ensureWeeklyLeagueProfileForLobby(
  ctx: MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  now: number = Date.now()
): Promise<{ weeklyLeagueTier: PortalWeeklyLeagueTierId; peakLeagueTier: PortalWeeklyLeagueTierId }> {
  const existing = await ctx.db
    .query("portal_weekly_league_profile")
    .withIndex("by_uid_lobby", (q) => q.eq("uid", uid).eq("lobbyId", lobbyId))
    .unique();

  if (existing) {
    return {
      weeklyLeagueTier: existing.weeklyLeagueTier as PortalWeeklyLeagueTierId,
      peakLeagueTier: existing.peakLeagueTier as PortalWeeklyLeagueTierId,
    };
  }

  await ctx.db.insert("portal_weekly_league_profile", {
    uid,
    lobbyId,
    weeklyLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    peakLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    updatedAt: now,
  });

  return {
    weeklyLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
    peakLeagueTier: DEFAULT_PORTAL_WEEKLY_LEAGUE_TIER,
  };
}
