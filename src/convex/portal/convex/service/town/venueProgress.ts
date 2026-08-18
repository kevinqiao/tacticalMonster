import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

import type { HallKind } from "../../data/portalTownVenueCatalog";
import { ensureTownProgress, readTownProgress, townProgressCtxFromId, type TownProgressCtx } from "./townProgressStore";
import { VENUE_LEVEL_CONFIG, venueLevelFromXp, xpToNextVenueLevel } from "./venueProgressConfig";

function utcDayKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

type VenueXpToday = { trial: number; showdown: number };

function readVenueXpToday(progress: {
  venueXpDayKey?: string;
  venueXpToday?: Partial<VenueXpToday>;
}): VenueXpToday {
  const dayKey = utcDayKey();
  if (progress.venueXpDayKey !== dayKey) {
    return { trial: 0, showdown: 0 };
  }
  return {
    trial: progress.venueXpToday?.trial ?? 0,
    showdown: progress.venueXpToday?.showdown ?? 0,
  };
}

export function resolveVenueXp(
  progress: { venueXp?: Partial<Record<HallKind, number>> } | null
): Record<HallKind, number> {
  return {
    trial: progress?.venueXp?.trial ?? 0,
    showdown: progress?.venueXp?.showdown ?? 0,
  };
}

export function resolveVenueLevel(
  progress: {
    venueLevel?: Partial<Record<HallKind, number>>;
    venueXp?: Partial<Record<HallKind, number>>;
  } | null,
  hallKind: HallKind
): number {
  const cached = progress?.venueLevel?.[hallKind];
  if (cached != null) return cached;
  const xp = progress?.venueXp?.[hallKind] ?? 0;
  return venueLevelFromXp(xp);
}

export function resolveVenueLevels(
  progress: {
    venueLevel?: Partial<Record<HallKind, number>>;
    venueXp?: Partial<Record<HallKind, number>>;
  } | null
): Record<HallKind, number> {
  return {
    trial: resolveVenueLevel(progress, "trial"),
    showdown: resolveVenueLevel(progress, "showdown"),
  };
}

export async function grantVenueXp(
  ctx: TownProgressCtx,
  args: {
    hallKind: HallKind;
    won?: boolean;
  }
): Promise<{ granted: number; venueLevel: number; venueXp: number }> {
  const now = Date.now();
  const progress = await ensureTownProgress(ctx);
  const dayKey = utcDayKey(now);
  const xpToday = readVenueXpToday(progress);

  let grant =
    args.hallKind === "showdown"
      ? VENUE_LEVEL_CONFIG.xpPerShowdownComplete
      : VENUE_LEVEL_CONFIG.xpPerTrialComplete;
  if (args.hallKind === "showdown" && args.won) {
    grant += VENUE_LEVEL_CONFIG.xpPerShowdownWin;
  }

  const cap = VENUE_LEVEL_CONFIG.dailyXpCap[args.hallKind];
  const remaining = Math.max(0, cap - xpToday[args.hallKind]);
  const applied = Math.min(grant, remaining);

  const venueXpMap = resolveVenueXp(progress);
  const currentXp = venueXpMap[args.hallKind];

  if (applied <= 0) {
    return {
      granted: 0,
      venueLevel: resolveVenueLevel(progress, args.hallKind),
      venueXp: currentXp,
    };
  }

  const venueXp = currentXp + applied;
  const venueLevel = venueLevelFromXp(venueXp);
  const levels = resolveVenueLevels(progress);
  levels[args.hallKind] = venueLevel;

  xpToday[args.hallKind] += applied;

  await ctx.db.patch(progress._id, {
    venueXp: { ...venueXpMap, [args.hallKind]: venueXp },
    venueLevel: levels,
    venueXpDayKey: dayKey,
    venueXpToday: xpToday,
    updatedAt: now,
  });

  return { granted: applied, venueLevel, venueXp };
}

/** Called from run settlement — awards venue XP for the hall that hosted the match. */
export const applyVenueXpOnRunSettled = internalMutation({
  args: {
    uid: v.string(),
    matchType: v.string(),
    rank: v.optional(v.number()),
    townId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, matchType, rank, townId }) => {
    if (!townId) return { ok: true as const, granted: 0 };
    const hallKind =
      matchType === "solo_p75"
        ? ("trial" as const)
        : matchType === "multi_ranked"
          ? ("showdown" as const)
          : null;
    if (!hallKind) return { ok: true as const, granted: 0 };

    const won = hallKind === "showdown" && rank === 1;
    const result = await grantVenueXp(townProgressCtxFromId(ctx.db, uid, townId), { hallKind, won });
    return { ok: true as const, ...result };
  },
});

export function venueProgressView(progress: Awaited<ReturnType<typeof readTownProgress>>) {
  const xp = resolveVenueXp(progress);
  const level = resolveVenueLevels(progress);
  return {
    venueXp: xp,
    venueLevel: level,
    venueXpToNext: {
      trial: xpToNextVenueLevel(xp.trial, level.trial),
      showdown: xpToNextVenueLevel(xp.showdown, level.showdown),
    },
  };
}
