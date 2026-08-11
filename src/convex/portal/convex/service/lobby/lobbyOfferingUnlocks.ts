import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { portalSeasonLevelFromXp } from "../../data/portalSeasonHonorConfig";
import type { PortalLobbyOffering } from "../../data/portalLobbyConfig";
import { resolveSeasonHonorContext } from "../season/resolvePortalSeasonHonor";
import { ensureWeeklyLeagueProfileForLobby } from "../weeklyLeague/casualWeeklyLeagueProfile";

async function resolveSeasonLevelForUnlock(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">,
  seasonLevel?: number | null
): Promise<number> {
  if (typeof seasonLevel === "number" && Number.isFinite(seasonLevel)) {
    return Math.max(1, Math.floor(seasonLevel));
  }
  const honor = await resolveSeasonHonorContext(ctx, lobbyId);
  if (!honor?.active) return 1;
  const row = await ctx.db
    .query("portal_season_honor_progress")
    .withIndex("by_uid_lobby_season", (q) =>
      q.eq("uid", uid).eq("lobbyId", lobbyId).eq("seasonId", honor.seasonId)
    )
    .unique();
  const level = row?.level ?? portalSeasonLevelFromXp(row?.seasonXp ?? 0);
  return Math.max(1, Math.floor(level));
}

function canPersistUnlocks(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
  return typeof (ctx.db as { patch?: unknown }).patch === "function";
}

function normalizeUnlockLevel(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const n = Math.floor(raw);
  return n >= 2 ? n : null;
}

export function offeringUnlockSeasonLevel(
  offering: Pick<PortalLobbyOffering, "unlockSeasonLevel"> | null | undefined
): number | null {
  return normalizeUnlockLevel(offering?.unlockSeasonLevel);
}

export async function readUnlockedTournamentIds(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  lobbyId: Id<"portal_lobbies">
): Promise<string[]> {
  const profile = await ctx.db
    .query("portal_weekly_league_profile")
    .withIndex("by_uid_lobby", (q) => q.eq("uid", uid).eq("lobbyId", lobbyId))
    .unique();
  const ids = profile?.unlockedTournamentIds ?? [];
  return ids.filter((id) => typeof id === "string" && id.length > 0);
}

/**
 * Persist permanent unlocks for offerings whose unlockSeasonLevel <= seasonLevel.
 * Survives season XP reset.
 */
export async function syncLobbyOfferingUnlocksForSeasonLevel(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId: Id<"portal_lobbies">;
    seasonLevel: number;
    now?: number;
  }
): Promise<string[]> {
  const level = Math.max(1, Math.floor(args.seasonLevel));
  const lobby = await ctx.db.get(args.lobbyId);
  if (!lobby) return [];

  const gated = (lobby.offerings ?? []).filter((o) => {
    if (o.enabled === false) return false;
    const need = offeringUnlockSeasonLevel(o);
    return need != null && level >= need;
  });
  if (gated.length === 0) return [];

  const now = args.now ?? Date.now();
  await ensureWeeklyLeagueProfileForLobby(ctx, args.uid, args.lobbyId, now);
  const profile = await ctx.db
    .query("portal_weekly_league_profile")
    .withIndex("by_uid_lobby", (q) =>
      q.eq("uid", args.uid).eq("lobbyId", args.lobbyId)
    )
    .unique();
  if (!profile) return [];

  const prev = new Set(
    (profile.unlockedTournamentIds ?? []).filter(
      (id): id is string => typeof id === "string" && id.length > 0
    )
  );
  let changed = false;
  for (const o of gated) {
    if (!prev.has(o.tournamentId)) {
      prev.add(o.tournamentId);
      changed = true;
    }
  }
  const next = [...prev];
  if (changed) {
    await ctx.db.patch(profile._id, {
      unlockedTournamentIds: next,
      updatedAt: now,
    });
  }
  return next;
}

export async function isLobbyOfferingUnlockedForPlayer(
  ctx: QueryCtx | MutationCtx,
  args: {
    uid: string;
    lobbyId: Id<"portal_lobbies">;
    tournamentId: string;
    seasonLevel?: number | null;
  }
): Promise<boolean> {
  const lobby = await ctx.db.get(args.lobbyId);
  if (!lobby) return true;
  const offering = (lobby.offerings ?? []).find(
    (o) => o.tournamentId === args.tournamentId && o.enabled !== false
  );
  if (!offering) return true;
  const need = offeringUnlockSeasonLevel(offering);
  if (need == null) return true;

  const unlocked = await readUnlockedTournamentIds(ctx, args.uid, args.lobbyId);
  if (unlocked.includes(args.tournamentId)) return true;

  const level = await resolveSeasonLevelForUnlock(
    ctx,
    args.uid,
    args.lobbyId,
    args.seasonLevel
  );
  return level >= need;
}

/**
 * Join guard for level-gated lobby offerings.
 * If currently eligible by season level, also persist the permanent unlock.
 */
export async function assertLobbyOfferingJoinAllowed(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    tournamentId: string;
    seasonLevel?: number | null;
  }
): Promise<{ ok: true } | { ok: false; error: "offering_locked" }> {
  const lobbyId = args.lobbyId ?? null;
  if (!lobbyId) return { ok: true };

  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) return { ok: true };
  const offering = (lobby.offerings ?? []).find(
    (o) => o.tournamentId === args.tournamentId && o.enabled !== false
  );
  if (!offering) return { ok: true };
  const need = offeringUnlockSeasonLevel(offering);
  if (need == null) return { ok: true };

  const unlocked = await readUnlockedTournamentIds(ctx, args.uid, lobbyId);
  if (unlocked.includes(args.tournamentId)) return { ok: true };

  const level = await resolveSeasonLevelForUnlock(
    ctx,
    args.uid,
    lobbyId,
    args.seasonLevel
  );
  if (level >= need) {
    if (canPersistUnlocks(ctx)) {
      await syncLobbyOfferingUnlocksForSeasonLevel(ctx, {
        uid: args.uid,
        lobbyId,
        seasonLevel: level,
      });
    }
    return { ok: true };
  }

  return { ok: false, error: "offering_locked" };
}
