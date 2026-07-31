/**
 * Portal 徽章：解锁 + Account 墙查询（纯展示）。
 */
import { v } from "convex/values";

import {
  PORTAL_BADGE_TEMPLATES,
  PORTAL_LEGACY_BADGE_IDS,
  buildSeasonMarkTemplates,
  portalLeagueTierOrder,
  type PortalBadgeTemplate,
} from "../../data/portalBadgeTemplates";
import { portalSeasonDisplayN } from "../../data/portalSeasonHonorConfig";
import { authedMutation, authedQuery } from "../../custom/session";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx, type QueryCtx } from "../../_generated/server";
import { resolveSeasonHonorContext } from "../season/resolvePortalSeasonHonor";
import { ensureWeeklyLeagueProfileForLobby } from "../weeklyLeague/casualWeeklyLeagueProfile";
import { portalBadgeTemplateMet } from "./portalBadgeUnlockLogic";

export type PortalBadgeCheckEvent =
  | {
      kind: "week_close";
      peakLeagueTier: string;
      weeklyPromoteCount: number;
    }
  | {
      kind: "match_settled";
      peakLeagueTier: string;
      totalMatchWins: number;
      totalMultiplayerWins: number;
    }
  | {
      kind: "season_finalized";
      seasonId: string;
      seasonLevel: number;
    };

async function findBadge(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  badgeId: string,
  lobbyId?: Id<"portal_lobbies"> | null
) {
  if (lobbyId) {
    const rows = await ctx.db
      .query("portal_player_badges")
      .withIndex("by_uid_lobby", (q) => q.eq("uid", uid).eq("lobbyId", lobbyId))
      .collect();
    return rows.find((r) => r.badgeId === badgeId) ?? null;
  }
  return await ctx.db
    .query("portal_player_badges")
    .withIndex("by_uid_badge", (q) => q.eq("uid", uid).eq("badgeId", badgeId))
    .unique();
}

async function insertBadgeIfNew(
  ctx: MutationCtx,
  args: {
    uid: string;
    badgeId: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    now: number;
    metadataJson?: string;
  }
): Promise<boolean> {
  const existing = await findBadge(ctx, args.uid, args.badgeId, args.lobbyId);
  if (existing) return false;
  await ctx.db.insert("portal_player_badges", {
    uid: args.uid,
    ...(args.lobbyId ? { lobbyId: args.lobbyId } : {}),
    badgeId: args.badgeId,
    unlockedAt: args.now,
    ...(args.metadataJson ? { metadataJson: args.metadataJson } : {}),
  });
  return true;
}

export async function checkAndUnlockBadgesCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    event: PortalBadgeCheckEvent;
    now?: number;
  }
): Promise<{ unlocked: string[] }> {
  const now = args.now ?? Date.now();
  const unlocked: string[] = [];

  const templates: PortalBadgeTemplate[] =
    args.event.kind === "season_finalized"
      ? buildSeasonMarkTemplates(
          args.event.seasonId,
          portalSeasonDisplayN(args.event.seasonId)
        )
      : PORTAL_BADGE_TEMPLATES.filter((t) => t.eventKind !== "legacy_complete");

  for (const tmpl of templates) {
    if (!portalBadgeTemplateMet(tmpl, args.event)) continue;
    const ok = await insertBadgeIfNew(ctx, {
      uid: args.uid,
      badgeId: tmpl.badgeId,
      lobbyId: args.lobbyId,
      now,
      metadataJson:
        args.event.kind === "season_finalized"
          ? JSON.stringify({
              seasonId: args.event.seasonId,
              level: args.event.seasonLevel,
            })
          : undefined,
    });
    if (ok) unlocked.push(tmpl.badgeId);
  }

  // Collector: all legacy badges present
  const legacyUnlocked = await Promise.all(
    PORTAL_LEGACY_BADGE_IDS.map((id) => findBadge(ctx, args.uid, id, args.lobbyId))
  );
  if (legacyUnlocked.every(Boolean)) {
    const ok = await insertBadgeIfNew(ctx, {
      uid: args.uid,
      badgeId: "legacy_collector",
      lobbyId: args.lobbyId,
      now,
    });
    if (ok) unlocked.push("legacy_collector");
  }

  return { unlocked };
}

export const checkAndUnlockBadges = internalMutation({
  args: {
    uid: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    event: v.union(
      v.object({
        kind: v.literal("week_close"),
        peakLeagueTier: v.string(),
        weeklyPromoteCount: v.number(),
      }),
      v.object({
        kind: v.literal("match_settled"),
        peakLeagueTier: v.string(),
        totalMatchWins: v.number(),
        totalMultiplayerWins: v.number(),
      }),
      v.object({
        kind: v.literal("season_finalized"),
        seasonId: v.string(),
        seasonLevel: v.number(),
      })
    ),
  },
  handler: async (ctx, args) =>
    checkAndUnlockBadgesCore(ctx, {
      uid: args.uid,
      lobbyId: args.lobbyId,
      event: args.event,
    }),
});

export const listPortalPlayerBadges = authedQuery({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, args) => {
    const uid = ctx.uid;
    const honor = args.lobbyId
      ? await resolveSeasonHonorContext(ctx, args.lobbyId)
      : null;
    const seasonId = honor?.seasonId ?? null;
    const seasonDisplayN = seasonId ? portalSeasonDisplayN(seasonId) : 0;

    const profile = args.lobbyId
      ? await ctx.db
          .query("portal_weekly_league_profile")
          .withIndex("by_uid_lobby", (q) =>
            q.eq("uid", uid).eq("lobbyId", args.lobbyId!)
          )
          .unique()
      : null;

    const unlockRows = args.lobbyId
      ? await ctx.db
          .query("portal_player_badges")
          .withIndex("by_uid_lobby", (q) =>
            q.eq("uid", uid).eq("lobbyId", args.lobbyId!)
          )
          .collect()
      : await ctx.db
          .query("portal_player_badges")
          .withIndex("by_uid", (q) => q.eq("uid", uid))
          .collect();

    const unlockedById = new Map(unlockRows.map((r) => [r.badgeId, r]));

    const counters = {
      peakLeagueTier: profile?.peakLeagueTier ?? "bronze",
      totalMatchWins: profile?.totalMatchWins ?? 0,
      totalMultiplayerWins: profile?.totalMultiplayerWins ?? 0,
      totalWeeklyPromotions: profile?.totalWeeklyPromotions ?? 0,
    };

    const progressFor = (tmpl: PortalBadgeTemplate): number => {
      switch (tmpl.eventKind) {
        case "peak_league_tier":
          return portalLeagueTierOrder(counters.peakLeagueTier);
        case "weekly_promote_count":
          return counters.totalWeeklyPromotions;
        case "multiplayer_win":
          return counters.totalMultiplayerWins;
        case "total_match_wins":
          return counters.totalMatchWins;
        case "legacy_complete":
          return PORTAL_LEGACY_BADGE_IDS.every((id) => unlockedById.has(id))
            ? 1
            : 0;
        case "season_level":
          return 0;
        default:
          return 0;
      }
    };

    const legacyItems = PORTAL_BADGE_TEMPLATES.map((tmpl) => {
      const row = unlockedById.get(tmpl.badgeId);
      return {
        badgeId: tmpl.badgeId,
        title: tmpl.title,
        description: tmpl.description,
        category: tmpl.category,
        iconKey: tmpl.iconKey,
        threshold: tmpl.threshold,
        progress: progressFor(tmpl),
        unlocked: Boolean(row),
        unlockedAt: row?.unlockedAt ?? null,
      };
    });

    let currentSeasonItems: Array<{
      badgeId: string;
      title: string;
      description: string;
      category: string;
      iconKey: string;
      threshold: number;
      progress: number;
      unlocked: boolean;
      unlockedAt: number | null;
    }> = [];

    if (honor?.active && seasonId) {
      const seasonTemplates = buildSeasonMarkTemplates(seasonId, seasonDisplayN);
      let seasonLevel = 1;
      if (args.lobbyId) {
        const seasonRow = await ctx.db
          .query("portal_season_honor_progress")
          .withIndex("by_uid_lobby_season", (q) =>
            q
              .eq("uid", uid)
              .eq("lobbyId", args.lobbyId!)
              .eq("seasonId", seasonId)
          )
          .unique();
        seasonLevel = seasonRow?.level ?? 1;
      }
      currentSeasonItems = seasonTemplates.map((tmpl) => {
        const row = unlockedById.get(tmpl.badgeId);
        return {
          badgeId: tmpl.badgeId,
          title: tmpl.title,
          description: tmpl.description,
          category: tmpl.category,
          iconKey: tmpl.iconKey,
          threshold: tmpl.threshold,
          progress: row ? tmpl.threshold : Math.min(seasonLevel, tmpl.threshold),
          unlocked: Boolean(row),
          unlockedAt: row?.unlockedAt ?? null,
        };
      });
    }

    const pastSeasonItems = unlockRows
      .filter((r) => {
        if (!r.badgeId.startsWith("season_")) return false;
        if (seasonId && r.badgeId.startsWith(`season_${seasonId}_`)) return false;
        return true;
      })
      .map((r) => {
        const m = /^season_(.+)_lv(10|20|30)$/.exec(r.badgeId);
        const sid = m?.[1] ?? "S1";
        const lv = Number(m?.[2] ?? 10) as 10 | 20 | 30;
        const built = buildSeasonMarkTemplates(sid, portalSeasonDisplayN(sid)).find(
          (t) => t.badgeId === r.badgeId
        );
        return {
          badgeId: r.badgeId,
          title: built?.title ?? r.badgeId,
          description: built?.description ?? "",
          category: "season_marks" as const,
          iconKey: built?.iconKey ?? "season_active",
          threshold: lv,
          progress: lv,
          unlocked: true,
          unlockedAt: r.unlockedAt,
        };
      })
      .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0));

    return {
      counters,
      seasonId,
      seasonDisplayN,
      seasonHonorActive: honor?.active ?? false,
      seasonHonorStartsWeekKey: honor?.startsWeekKey ?? null,
      items: [...legacyItems, ...currentSeasonItems],
      pastSeasonMarks: pastSeasonItems,
      unreadSeasonMarks: Boolean(profile?.unreadSeasonMarks),
      unreadSeasonId: profile?.unreadSeasonId ?? null,
    };
  },
});

export const dismissPortalSeasonMarks = authedMutation({
  args: {
    lobbyId: v.id("portal_lobbies"),
  },
  handler: async (ctx, args) => {
    await ensureWeeklyLeagueProfileForLobby(ctx, ctx.uid, args.lobbyId);
    const profile = await ctx.db
      .query("portal_weekly_league_profile")
      .withIndex("by_uid_lobby", (q) =>
        q.eq("uid", ctx.uid).eq("lobbyId", args.lobbyId)
      )
      .unique();
    if (!profile) return { ok: true };
    await ctx.db.patch(profile._id, {
      unreadSeasonMarks: false,
      unreadSeasonId: undefined,
      unreadSeasonLevel: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});
