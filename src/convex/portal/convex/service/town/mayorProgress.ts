import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

import { mayorLevelFromXp, MAYOR_LEVEL_CONFIG } from "./zoneEconomyConfig";
import { ensureTownProgress, readTownProgress, townProgressCtxFromId, type TownProgressCtx } from "./townProgressStore";

function utcDayKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export async function grantMayorXp(
  ctx: TownProgressCtx,
  args: {
    hallKind: "trial" | "showdown";
    won?: boolean;
  }
): Promise<{ granted: number; mayorLevel: number; mayorXp: number }> {
  const now = Date.now();
  const progress = await ensureTownProgress(ctx);
  const dayKey = utcDayKey(now);

  let mayorXpToday = progress.mayorXpToday ?? 0;
  if (progress.mayorXpDayKey !== dayKey) {
    mayorXpToday = 0;
  }

  let grant =
    args.hallKind === "showdown"
      ? MAYOR_LEVEL_CONFIG.xpPerShowdownComplete
      : MAYOR_LEVEL_CONFIG.xpPerTrialComplete;
  if (args.hallKind === "showdown" && args.won) {
    grant += MAYOR_LEVEL_CONFIG.xpPerShowdownWin;
  }

  const remaining = Math.max(0, MAYOR_LEVEL_CONFIG.dailyMayorXpCap - mayorXpToday);
  const applied = Math.min(grant, remaining);
  if (applied <= 0) {
    return {
      granted: 0,
      mayorLevel: progress.mayorLevel ?? mayorLevelFromXp(progress.mayorXp ?? 0),
      mayorXp: progress.mayorXp ?? 0,
    };
  }

  const mayorXp = (progress.mayorXp ?? 0) + applied;
  const mayorLevel = mayorLevelFromXp(mayorXp);

  await ctx.db.patch(progress._id, {
    mayorXp,
    mayorLevel,
    mayorXpDayKey: dayKey,
    mayorXpToday: mayorXpToday + applied,
    updatedAt: now,
  });

  return { granted: applied, mayorLevel, mayorXp };
}

/** Called from run settlement when a Portal match completes. */
export const applyMayorXpOnRunSettled = internalMutation({
  args: {
    uid: v.string(),
    matchType: v.string(),
    rank: v.optional(v.number()),
    townId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, matchType, rank, townId }) => {
    if (!townId) return { ok: true as const, granted: 0 };
    const hallKind =
      matchType === "solo_p75" ? ("trial" as const) : matchType === "multi_ranked" ? ("showdown" as const) : null;
    if (!hallKind) return { ok: true as const, granted: 0 };

    const won = hallKind === "showdown" && rank === 1;
    const result = await grantMayorXp(townProgressCtxFromId(ctx.db, uid, townId), { hallKind, won });
    return { ok: true as const, ...result };
  },
});

export async function completeQuestIfNeeded(
  ctx: TownProgressCtx,
  questId: string
): Promise<void> {
  const progress = await readTownProgress(ctx);
  if (!progress) return;
  const completed = new Set(progress.completedQuestIds ?? progress.questIds ?? []);
  if (completed.has(questId)) return;
  completed.add(questId);
  await ctx.db.patch(progress._id, {
    completedQuestIds: [...completed],
    questIds: [...completed],
    updatedAt: Date.now(),
  });
}

/** M2 stub: first Showdown unlocks D1 quest for testing expand flow. */
export const maybeUnlockD1Quest = internalMutation({
  args: { uid: v.string(), matchType: v.string(), townId: v.optional(v.string()) },
  handler: async (ctx, { uid, matchType, townId }) => {
    if (matchType !== "multi_ranked" || !townId) return { ok: true as const };
    await completeQuestIfNeeded(townProgressCtxFromId(ctx.db, uid, townId), "quest_d1_market");
    return { ok: true as const };
  },
});
