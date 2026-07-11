/**
 * 周联赛 cohort Bot：
 * - 创建分组时固定种入 15 Bot（立即可见 3–10 个，其余在 5h 内陆续可见）
 * - 匹配结束后若真人不足，再补 Bot 至 30（补位立刻可见）
 * - 可见即有起始分（2–20）；之后按 seed+阶梯虚拟赛程（solo/multi）跳分
 */
import {
  PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
  PORTAL_WEEKLY_LEAGUE_COHORT_SIZE,
  PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT,
} from "../../data/portalWeeklyLeagueConfig";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  computePortalWeeklyLeagueBotStartPoints,
  computePortalWeeklyLeagueBotWeekEndPoints,
  leagueBotUidForSlot,
} from "./portalWeeklyLeagueBotPoints";
import {
  isPortalWeeklyLeagueBotRevealed,
  planPortalWeeklyLeagueFillBotRevealSchedule,
  planPortalWeeklyLeagueInitialBotRevealSchedule,
} from "./portalWeeklyLeagueBotReveal";

async function cohortHumanCount(
  ctx: MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">
): Promise<number> {
  const members = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  return members.filter((m) => !m.isBot).length;
}

async function insertBotMembers(
  ctx: MutationCtx,
  args: {
    cohort: {
      _id: Id<"portal_weekly_league_cohorts">;
      weekKey: string;
      gameType: string;
      leagueTierId: string;
      endsAt: number;
    };
    cohortKey: string;
    plans: Array<{ slot: number; revealAt: number }>;
    now: number;
  }
): Promise<number> {
  const { cohort, cohortKey, plans, now } = args;
  for (const plan of plans) {
    const startPoints = computePortalWeeklyLeagueBotStartPoints({
      cohortKey,
      slot: plan.slot,
    });
    const weekEndPoints = computePortalWeeklyLeagueBotWeekEndPoints({
      cohortKey,
      slot: plan.slot,
      revealAt: plan.revealAt,
      endsAt: cohort.endsAt,
      startPoints,
    });
    const visibleNow = isPortalWeeklyLeagueBotRevealed(plan.revealAt, now);
    await ctx.db.insert("portal_weekly_league_members", {
      weekKey: cohort.weekKey,
      uid: leagueBotUidForSlot(String(cohort._id), plan.slot),
      gameType: cohort.gameType,
      cohortId: cohort._id,
      leagueTierId: cohort.leagueTierId,
      weeklyPoints: visibleNow ? startPoints : 0,
      isBot: true,
      revealAt: plan.revealAt,
      botStartPoints: startPoints,
      botWeekEndPoints: weekEndPoints,
      createdAt: now,
      updatedAt: now,
    });
  }
  return plans.length;
}

/** 创建分组时种入固定 15 Bot（含可见时间表）。 */
export async function seedPortalWeeklyLeagueInitialBots(
  ctx: MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  now: number = Date.now()
): Promise<{ botPoolSize: number; seeded: boolean }> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.status !== "open") {
    return { botPoolSize: 0, seeded: false };
  }

  const members = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  const bots = members.filter((m) => m.isBot);
  if (bots.length > 0) {
    return { botPoolSize: bots.length, seeded: false };
  }

  const createdAt = cohort.createdAt;
  const cohortKey = `${cohort.weekKey}|${cohort.gameType}|${cohort.leagueTierId}|${cohortId}`;
  const plans = planPortalWeeklyLeagueInitialBotRevealSchedule({
    cohortKey,
    createdAt,
    botCount: PORTAL_WEEKLY_LEAGUE_BOT_POOL_SIZE,
  });

  await insertBotMembers(ctx, { cohort, cohortKey, plans, now });

  const humanCount = members.filter((m) => !m.isBot).length;
  await ctx.db.patch(cohortId, {
    humanCount,
    botPoolSize: plans.length,
    memberCount: humanCount + plans.length,
    updatedAt: now,
  });

  return { botPoolSize: plans.length, seeded: true };
}

/**
 * 刷新计数；若尚无 Bot 则补种初始 15。
 * 匹配已关闭时，再按「补满 30」追加 Bot。
 */
export async function syncPortalWeeklyLeagueBotPadding(
  ctx: MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  now: number = Date.now()
): Promise<{ botPoolSize: number; seeded: boolean }> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.status !== "open") {
    return { botPoolSize: 0, seeded: false };
  }

  const humanCount = await cohortHumanCount(ctx, cohortId);
  let members = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  let bots = members.filter((m) => m.isBot);

  let seeded = false;
  if (bots.length === 0) {
    const init = await seedPortalWeeklyLeagueInitialBots(ctx, cohortId, now);
    seeded = init.seeded;
    members = await ctx.db
      .query("portal_weekly_league_members")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
      .collect();
    bots = members.filter((m) => m.isBot);
  }

  if (cohort.matchingClosedAt == null) {
    await ctx.db.patch(cohortId, {
      humanCount,
      botPoolSize: bots.length,
      memberCount: humanCount + bots.length,
      updatedAt: now,
    });
    return { botPoolSize: bots.length, seeded };
  }

  // 匹配结束：若真人 + 已有 Bot < 30，再补立刻可见的 Bot
  const botsNeeded = Math.max(0, PORTAL_WEEKLY_LEAGUE_COHORT_SIZE - humanCount - bots.length);
  if (botsNeeded <= 0) {
    await ctx.db.patch(cohortId, {
      humanCount,
      botPoolSize: bots.length,
      memberCount: humanCount + bots.length,
      updatedAt: now,
    });
    return { botPoolSize: bots.length, seeded };
  }

  const matchingClosedAt = cohort.matchingClosedAt;
  const cohortKey = `${cohort.weekKey}|${cohort.gameType}|${cohort.leagueTierId}|${cohortId}`;
  const maxSlot = bots.reduce((acc, b) => {
    const part = b.uid.split("_").pop();
    const n = part != null ? Number(part) : NaN;
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, -1);
  const plans = planPortalWeeklyLeagueFillBotRevealSchedule({
    matchingClosedAt,
    botCount: botsNeeded,
    slotOffset: maxSlot + 1,
  });

  await insertBotMembers(ctx, { cohort, cohortKey, plans, now });
  const botPoolSize = bots.length + plans.length;
  await ctx.db.patch(cohortId, {
    humanAnchorAt: cohort.humanAnchorAt ?? matchingClosedAt,
    humanCount,
    botPoolSize,
    memberCount: humanCount + botPoolSize,
    updatedAt: now,
  });

  return { botPoolSize, seeded: true };
}

/**
 * 结束匹配：满员（15 真人）或超时后调用。
 * 若真人不足，再补 Bot 至 30。
 */
export async function closePortalWeeklyLeagueMatching(
  ctx: MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  now: number = Date.now()
): Promise<{ closed: boolean; seeded: boolean; botPoolSize: number }> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.status !== "open") {
    return { closed: false, seeded: false, botPoolSize: 0 };
  }
  if (cohort.matchingClosedAt != null) {
    const sync = await syncPortalWeeklyLeagueBotPadding(ctx, cohortId, now);
    return { closed: true, seeded: sync.seeded, botPoolSize: sync.botPoolSize };
  }

  const humanCount = await cohortHumanCount(ctx, cohortId);
  await ctx.db.patch(cohortId, {
    matchingClosedAt: now,
    humanCount,
    humanAnchorAt: cohort.humanAnchorAt ?? now,
    updatedAt: now,
  });

  const sync = await syncPortalWeeklyLeagueBotPadding(ctx, cohortId, now);
  return { closed: true, seeded: sync.seeded, botPoolSize: sync.botPoolSize };
}

/** 真人满员时立即结束匹配；不足 30 时再补 Bot。 */
export async function maybeCloseMatchingIfFull(
  ctx: MutationCtx,
  cohortId: Id<"portal_weekly_league_cohorts">,
  now: number = Date.now()
): Promise<boolean> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.matchingClosedAt != null || cohort.status !== "open") {
    return false;
  }
  const humans = await cohortHumanCount(ctx, cohortId);
  if (humans < PORTAL_WEEKLY_LEAGUE_MAX_HUMANS_PER_COHORT) return false;
  await closePortalWeeklyLeagueMatching(ctx, cohortId, now);
  return true;
}
