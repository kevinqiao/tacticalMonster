import { v } from "convex/values";
import {
  CASUAL_MISSION_TEMPLATES,
  type CasualMissionTemplate,
  type MissionTier,
  type SpotlightRating,
} from "../../data/casualMissionTemplates";
import { internal } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { dailyPeriodKey, seasonPeriodKey, weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { internalMutation, mutation, query } from "../../_generated/server";

const ASYNC_MATCH_TYPES = new Set(["tournament_a", "tournament_b", "tournament_c"]);
const SPOTLIGHT_RATING_ORDER: Record<SpotlightRating, number> = {
  S: 4,
  A: 3,
  B: 2,
  C: 1,
};
type TaskEventType =
  | "task_progressed"
  | "task_completed"
  | "task_claimed"
  | "task_claim_failed";

async function writeTaskEvent(
  ctx: MutationCtx,
  input: {
    uid: string;
    taskId: string;
    eventType: TaskEventType;
    tier?: MissionTier;
    periodKey?: string;
    objectiveKind?: string;
    delta?: number;
    progress?: number;
    target?: number;
    matchType?: string;
    challengePointsEarned?: number;
    errorCode?: string;
  }
) {
  await ctx.db.insert("casual_task_events", {
    uid: input.uid,
    taskId: input.taskId,
    eventType: input.eventType,
    tier: input.tier,
    periodKey: input.periodKey,
    objectiveKind: input.objectiveKind,
    delta: input.delta,
    progress: input.progress,
    target: input.target,
    matchType: input.matchType,
    challengePointsEarned: input.challengePointsEarned,
    errorCode: input.errorCode,
    createdAt: Date.now(),
  });
}

async function activeSeasonId(ctx: MutationCtx): Promise<string | null> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const s = seasons.find((r) => r.active) ?? seasons[0];
  return s?.seasonId ?? null;
}

async function periodKeyForTier(
  ctx: MutationCtx,
  tier: MissionTier,
  nowMs: number
): Promise<string | null> {
  if (tier === "daily") return dailyPeriodKey(nowMs);
  if (tier === "weekly") return weeklyPeriodKey(nowMs);
  const sid = await activeSeasonId(ctx);
  return sid ? seasonPeriodKey(sid) : null;
}

async function upsertTaskProgress(
  ctx: MutationCtx,
  template: CasualMissionTemplate,
  uid: string,
  taskId: string,
  periodKey: string,
  delta: number,
  meta?: {
    matchType?: string;
    challengePointsEarned?: number;
    spotlightRating?: SpotlightRating;
  }
) {
  const existing = await ctx.db
    .query("casual_tasks")
    .withIndex("by_uid_task_period", (q) =>
      q.eq("uid", uid).eq("taskId", taskId).eq("periodKey", periodKey)
    )
    .unique();
  const now = Date.now();
  const target = template.target;
  const base = existing?.progress ?? 0;
  const next = Math.min(target, Math.max(0, base + Math.max(0, delta)));
  const completedAt = next >= target ? (existing?.completedAt ?? now) : undefined;
  if (!existing) {
    await ctx.db.insert("casual_tasks", {
      uid,
      taskId,
      periodKey,
      progress: next,
      completedAt,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, {
      progress: next,
      completedAt,
      updatedAt: now,
    });
  }
  if (next > base) {
    await writeTaskEvent(ctx, {
      uid,
      taskId,
      tier: template.tier,
      periodKey,
      eventType: "task_progressed",
      objectiveKind: template.objectiveKind,
      delta: next - base,
      progress: next,
      target,
      matchType: meta?.matchType,
      challengePointsEarned: meta?.challengePointsEarned,
    });
  }
  if (base < target && next >= target) {
    await writeTaskEvent(ctx, {
      uid,
      taskId,
      tier: template.tier,
      periodKey,
      eventType: "task_completed",
      objectiveKind: template.objectiveKind,
      progress: next,
      target,
      matchType: meta?.matchType,
      challengePointsEarned: meta?.challengePointsEarned,
    });
  }
}

function deltaForObjective(
  template: CasualMissionTemplate,
  args: {
    matchType: string;
    challengePointsEarned: number;
    spotlightRating?: SpotlightRating;
  }
): number {
  const isAsync = ASYNC_MATCH_TYPES.has(args.matchType);
  const isSpotlight = args.matchType === "season_challenge";
  switch (template.objectiveKind) {
    case "submit_any_score":
      return 1;
    case "submit_async_score":
      return isAsync ? 1 : 0;
    case "submit_spotlight_score":
      return isSpotlight ? 1 : 0;
    case "earn_spotlight_challenge_points":
      return isSpotlight ? Math.max(0, Math.floor(args.challengePointsEarned)) : 0;
    case "submit_spotlight_rating_at_least": {
      if (!isSpotlight || !template.minSpotlightRating || !args.spotlightRating) return 0;
      const got = SPOTLIGHT_RATING_ORDER[args.spotlightRating];
      const need = SPOTLIGHT_RATING_ORDER[template.minSpotlightRating];
      return got >= need ? 1 : 0;
    }
    default:
      return 0;
  }
}

/** 合并模板与玩家 `casual_tasks` / `claims`（按当前 periodKey） */
export const listSeasonMissions = query({
  args: { uid: v.optional(v.string()) },
  handler: async (ctx, { uid }) => {
    const now = Date.now();
    const dailyPk = dailyPeriodKey(now);
    const weeklyPk = weeklyPeriodKey(now);
    const seasons = await ctx.db.query("casual_seasons").collect();
    const seasonRow = seasons.find((r) => r.active) ?? seasons[0];
    const seasonPk = seasonRow ? seasonPeriodKey(seasonRow.seasonId) : null;

    return Promise.all(
      CASUAL_MISSION_TEMPLATES.map(async (t) => {
        const pk =
          t.tier === "daily" ? dailyPk : t.tier === "weekly" ? weeklyPk : seasonPk;
        let progress = 0;
        let completedAt: number | undefined;
        if (uid && pk) {
          const row = await ctx.db
            .query("casual_tasks")
            .withIndex("by_uid_task_period", (q) =>
              q.eq("uid", uid).eq("taskId", t.taskId).eq("periodKey", pk)
            )
            .unique();
          progress = row?.progress ?? 0;
          completedAt = row?.completedAt;
        }
        let claimed = false;
        if (uid && pk) {
          const cl = await ctx.db
            .query("casual_task_claims")
            .withIndex("by_uid_claim_task_period", (q) =>
              q.eq("uid", uid).eq("taskId", t.taskId).eq("periodKey", pk)
            )
            .unique();
          claimed = Boolean(cl);
        }
        const completed = pk ? progress >= t.target : false;
        return {
          taskId: t.taskId,
          title: t.title,
          target: t.target,
          progress,
          completed,
          completedAt,
          tier: t.tier,
          claimed,
          periodKey: pk ?? undefined,
        };
      })
    );
  },
});

/** 任务事件聚合（看板最小版）：按事件类型与 taskId 统计区间次数 */
export const listTaskEventCounts = query({
  args: {
    fromMs: v.number(),
    toMs: v.number(),
    taskId: v.optional(v.string()),
    eventType: v.optional(
      v.union(
        v.literal("task_progressed"),
        v.literal("task_completed"),
        v.literal("task_claimed"),
        v.literal("task_claim_failed")
      )
    ),
  },
  handler: async (ctx, { fromMs, toMs, taskId, eventType }) => {
    const rows = await ctx.db
      .query("casual_task_events")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", fromMs).lte("createdAt", toMs))
      .collect();
    const filtered = rows.filter((r) => {
      if (taskId && r.taskId !== taskId) return false;
      if (eventType && r.eventType !== eventType) return false;
      return true;
    });
    const byEvent = new Map<string, number>();
    const byTask = new Map<string, number>();
    for (const r of filtered) {
      byEvent.set(r.eventType, (byEvent.get(r.eventType) ?? 0) + 1);
      byTask.set(r.taskId, (byTask.get(r.taskId) ?? 0) + 1);
    }
    return {
      total: filtered.length,
      byEvent: Array.from(byEvent.entries()).map(([key, count]) => ({ key, count })),
      byTask: Array.from(byTask.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

/** 任务周报（最小版）：按任务统计完成率、领取率、平均完成耗时（分钟） */
export const listTaskWeeklyReport = query({
  args: {
    fromMs: v.number(),
    toMs: v.number(),
    tier: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("season"))),
  },
  handler: async (ctx, { fromMs, toMs, tier }) => {
    const rows = await ctx.db
      .query("casual_task_events")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", fromMs).lte("createdAt", toMs))
      .collect();
    const filtered = rows.filter((r) => (tier ? r.tier === tier : true));

    const templates = new Map(CASUAL_MISSION_TEMPLATES.map((t) => [t.taskId, t]));
    const started = new Map<string, number>();
    const completed = new Map<string, number>();
    const progressed = new Map<string, number>();
    const claimed = new Map<string, number>();
    const uniqueUsers = new Map<string, Set<string>>();
    const completionDurations = new Map<string, number[]>();

    const keyOf = (r: { uid: string; taskId: string; periodKey?: string }) =>
      `${r.uid}::${r.taskId}::${r.periodKey ?? ""}`;

    for (const r of filtered) {
      uniqueUsers.set(r.taskId, (uniqueUsers.get(r.taskId) ?? new Set<string>()).add(r.uid));
      if (r.eventType === "task_progressed") {
        progressed.set(r.taskId, (progressed.get(r.taskId) ?? 0) + 1);
        const key = keyOf(r);
        if (!started.has(key)) started.set(key, r.createdAt);
      } else if (r.eventType === "task_completed") {
        completed.set(r.taskId, (completed.get(r.taskId) ?? 0) + 1);
        const key = keyOf(r);
        const start = started.get(key);
        if (typeof start === "number" && r.createdAt >= start) {
          const arr = completionDurations.get(r.taskId) ?? [];
          arr.push(r.createdAt - start);
          completionDurations.set(r.taskId, arr);
        }
      } else if (r.eventType === "task_claimed") {
        claimed.set(r.taskId, (claimed.get(r.taskId) ?? 0) + 1);
      }
    }

    const allTaskIds = new Set<string>([
      ...Array.from(progressed.keys()),
      ...Array.from(completed.keys()),
      ...Array.from(claimed.keys()),
    ]);

    const report = Array.from(allTaskIds).map((taskId) => {
      const progressCount = progressed.get(taskId) ?? 0;
      const completedCount = completed.get(taskId) ?? 0;
      const claimedCount = claimed.get(taskId) ?? 0;
      const completionRate = progressCount > 0 ? completedCount / progressCount : 0;
      const claimRate = completedCount > 0 ? claimedCount / completedCount : 0;
      const durations = completionDurations.get(taskId) ?? [];
      const avgCompletionMinutes =
        durations.length > 0
          ? durations.reduce((sum, v) => sum + v, 0) / durations.length / (60 * 1000)
          : undefined;
      const tpl = templates.get(taskId);
      return {
        taskId,
        title: tpl?.title ?? taskId,
        tier: tpl?.tier ?? "unknown",
        uniqueUsers: uniqueUsers.get(taskId)?.size ?? 0,
        progressEvents: progressCount,
        completedEvents: completedCount,
        claimedEvents: claimedCount,
        completionRate,
        claimRate,
        avgCompletionMinutes,
      };
    });

    report.sort((a, b) => b.progressEvents - a.progressEvents);
    return {
      fromMs,
      toMs,
      taskCount: report.length,
      report,
    };
  },
});

const CHECKIN_7_DAY_BONUS = [20, 30, 40, 50, 60, 80, 120];

async function applyDailyCheckinStreakBonus(
  ctx: MutationCtx,
  uid: string,
  periodKey: string
): Promise<{ streakCount: number; bonusCoins: number }> {
  const row = await ctx.db
    .query("casual_checkin_streaks")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  const previous = row?.streakCount ?? 0;
  const next = periodKey === row?.lastClaimPeriodKey ? previous : previous + 1;
  const normalized = ((next - 1) % 7) + 1;
  const bonusCoins = CHECKIN_7_DAY_BONUS[normalized - 1] ?? 0;
  const now = Date.now();
  if (!row) {
    await ctx.db.insert("casual_checkin_streaks", {
      uid,
      streakCount: next,
      lastClaimPeriodKey: periodKey,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(row._id, {
      streakCount: next,
      lastClaimPeriodKey: periodKey,
      updatedAt: now,
    });
  }
  if (bonusCoins > 0) {
    await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
      uid,
      kind: "coins",
      amount: bonusCoins,
    });
  }
  return { streakCount: next, bonusCoins };
}

async function claimMissionCore(
  ctx: MutationCtx,
  uid: string,
  taskId: string
): Promise<
  | { ok: true; streakCount?: number; streakBonusCoins?: number }
  | { ok: false; error: string }
> {
  const template = CASUAL_MISSION_TEMPLATES.find((t) => t.taskId === taskId);
  if (!template) {
    await writeTaskEvent(ctx, {
      uid,
      taskId,
      eventType: "task_claim_failed",
      errorCode: "unknown_task",
    });
    return { ok: false, error: "unknown_task" };
  }
  const pk = await periodKeyForTier(ctx, template.tier, Date.now());
  if (!pk) {
    await writeTaskEvent(ctx, {
      uid,
      taskId,
      tier: template.tier,
      eventType: "task_claim_failed",
      objectiveKind: template.objectiveKind,
      errorCode: "no_active_season",
    });
    return { ok: false, error: "no_active_season" };
  }
  const row = await ctx.db
    .query("casual_tasks")
    .withIndex("by_uid_task_period", (q) =>
      q.eq("uid", uid).eq("taskId", taskId).eq("periodKey", pk)
    )
    .unique();
  if (!row || row.progress < template.target) {
    await writeTaskEvent(ctx, {
      uid,
      taskId,
      tier: template.tier,
      periodKey: pk,
      eventType: "task_claim_failed",
      objectiveKind: template.objectiveKind,
      progress: row?.progress ?? 0,
      target: template.target,
      errorCode: "not_completed",
    });
    return { ok: false, error: "not_completed" };
  }
  const claimed = await ctx.db
    .query("casual_task_claims")
    .withIndex("by_uid_claim_task_period", (q) =>
      q.eq("uid", uid).eq("taskId", taskId).eq("periodKey", pk)
    )
    .unique();
  if (claimed) {
    await writeTaskEvent(ctx, {
      uid,
      taskId,
      tier: template.tier,
      periodKey: pk,
      eventType: "task_claim_failed",
      objectiveKind: template.objectiveKind,
      progress: row.progress,
      target: template.target,
      errorCode: "already_claimed",
    });
    return { ok: false, error: "already_claimed" };
  }
  const now = Date.now();

  const rewardGrants: Array<{
    kind: "coins" | "seasonXp" | "seasonVoucher" | "seasonChallengePoints";
    amount: number;
  }> = [];
  if (template.rewardCoins && template.rewardCoins > 0) {
    rewardGrants.push({ kind: "coins", amount: template.rewardCoins });
  }
  if (template.rewardSeasonXp && template.rewardSeasonXp > 0) {
    rewardGrants.push({ kind: "seasonXp", amount: template.rewardSeasonXp });
  }
  if (template.rewardVouchers && template.rewardVouchers > 0) {
    rewardGrants.push({ kind: "seasonVoucher", amount: template.rewardVouchers });
  }
  if (template.rewardSeasonChallengePoints && template.rewardSeasonChallengePoints > 0) {
    rewardGrants.push({ kind: "seasonChallengePoints", amount: template.rewardSeasonChallengePoints });
  }
  for (const g of rewardGrants) {
    const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
      uid,
      kind: g.kind,
      amount: g.amount,
    });
    if (!gr.ok) {
      const err = gr.error === "no_player" ? "no_player" : "claim_failed";
      await writeTaskEvent(ctx, {
        uid,
        taskId,
        tier: template.tier,
        periodKey: pk,
        eventType: "task_claim_failed",
        objectiveKind: template.objectiveKind,
        progress: row.progress,
        target: template.target,
        errorCode: err,
      });
      return { ok: false, error: err };
    }
  }

  await ctx.db.insert("casual_task_claims", {
    uid,
    taskId,
    periodKey: pk,
    claimedAt: now,
  });

  let streakResult: { streakCount: number; bonusCoins: number } | undefined;
  if (template.objectiveKind === "login_daily") {
    streakResult = await applyDailyCheckinStreakBonus(ctx, uid, pk);
  }
  await writeTaskEvent(ctx, {
    uid,
    taskId,
    tier: template.tier,
    periodKey: pk,
    eventType: "task_claimed",
    objectiveKind: template.objectiveKind,
    progress: row.progress,
    target: template.target,
  });
  return {
    ok: true,
    ...(streakResult
      ? { streakCount: streakResult.streakCount, streakBonusCoins: streakResult.bonusCoins }
      : {}),
  };
}

async function touchDailyLoginProgress(ctx: MutationCtx, uid: string) {
  const now = Date.now();
  const pk = dailyPeriodKey(now);
  for (const t of CASUAL_MISSION_TEMPLATES) {
    if (t.objectiveKind !== "login_daily") continue;
    await upsertTaskProgress(ctx, t, uid, t.taskId, pk, 1);
  }
}

/** 登录成功后调用：每日签到任务 + 当日周期 */
export const recordDailyLogin = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    await touchDailyLoginProgress(ctx, uid);
    return { ok: true as const };
  },
});

/** 前端兜底触发：确保每日签到任务在当日可领取（幂等） */
export const touchDailyLoginMission = mutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    await touchDailyLoginProgress(ctx, uid);
    return { ok: true as const };
  },
});

/** 新创建锦标报名（非重复入场）后调用 */
export const notifyTournamentJoined = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const now = Date.now();
    const sid = await activeSeasonId(ctx);
    if (!sid) return { ok: true as const };
    const pk = seasonPeriodKey(sid);
    for (const t of CASUAL_MISSION_TEMPLATES) {
      if (t.objectiveKind !== "join_tournament_once") continue;
      await upsertTaskProgress(ctx, t, uid, t.taskId, pk, 1);
    }
    return { ok: true as const };
  },
});

/** `applyScore` 有效结算后调用（已与 dedupe 分支分离） */
export const notifyScoreSubmitted = internalMutation({
  args: {
    uid: v.string(),
    matchType: v.string(),
    challengePointsEarned: v.number(),
    spotlightRating: v.optional(v.union(v.literal("S"), v.literal("A"), v.literal("B"), v.literal("C"))),
  },
  handler: async (ctx, { uid, matchType, challengePointsEarned, spotlightRating }) => {
    const now = Date.now();
    const dailyPk = dailyPeriodKey(now);
    const weeklyPk = weeklyPeriodKey(now);
    const sid = await activeSeasonId(ctx);
    const seasonPk = sid ? seasonPeriodKey(sid) : null;

    const args = { matchType, challengePointsEarned, spotlightRating };

    for (const t of CASUAL_MISSION_TEMPLATES) {
      if (
        t.objectiveKind === "login_daily" ||
        t.objectiveKind === "join_tournament_once"
      ) {
        continue;
      }
      const delta = deltaForObjective(t, args);
      if (delta <= 0) continue;
      const pk =
        t.tier === "daily" ? dailyPk : t.tier === "weekly" ? weeklyPk : seasonPk;
      if (!pk) continue;
      await upsertTaskProgress(ctx, t, uid, t.taskId, pk, delta, {
        matchType,
        challengePointsEarned,
        spotlightRating,
      });
    }
    return { ok: true as const };
  },
});

export const claimSeasonMission = mutation({
  args: { uid: v.string(), taskId: v.string() },
  handler: async (ctx, { uid, taskId }) => {
    const r = await claimMissionCore(ctx, uid, taskId);
    return r.ok
      ? {
          ok: true as const,
          ...(typeof r.streakCount === "number" ? { streakCount: r.streakCount } : {}),
          ...(typeof r.streakBonusCoins === "number"
            ? { streakBonusCoins: r.streakBonusCoins }
            : {}),
        }
      : { ok: false as const, error: r.error };
  },
});

/** 批量领取：领取当前已完成且未领的任务 */
export const claimAllReadyMissions = mutation({
  args: { uid: v.string(), tier: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("season"))) },
  handler: async (ctx, { uid, tier }) => {
    const now = Date.now();
    const dailyPk = dailyPeriodKey(now);
    const weeklyPk = weeklyPeriodKey(now);
    const sid = await activeSeasonId(ctx);
    const seasonPk = sid ? seasonPeriodKey(sid) : null;

    const ready: Array<{ taskId: string; tier: MissionTier }> = [];
    for (const t of CASUAL_MISSION_TEMPLATES) {
      if (tier && t.tier !== tier) continue;
      const pk = t.tier === "daily" ? dailyPk : t.tier === "weekly" ? weeklyPk : seasonPk;
      if (!pk) continue;
      const taskRow = await ctx.db
        .query("casual_tasks")
        .withIndex("by_uid_task_period", (q) =>
          q.eq("uid", uid).eq("taskId", t.taskId).eq("periodKey", pk)
        )
        .unique();
      if (!taskRow || taskRow.progress < t.target) continue;
      const claimedRow = await ctx.db
        .query("casual_task_claims")
        .withIndex("by_uid_claim_task_period", (q) =>
          q.eq("uid", uid).eq("taskId", t.taskId).eq("periodKey", pk)
        )
        .unique();
      if (claimedRow) continue;
      ready.push({ taskId: t.taskId, tier: t.tier });
    }
    const claimedTaskIds: string[] = [];
    const failed: Array<{ taskId: string; error: string }> = [];
    let streakCount: number | undefined;
    let streakBonusCoins = 0;
    for (const row of ready) {
      const res = await claimMissionCore(ctx, uid, row.taskId);
      if (!res.ok) {
        failed.push({ taskId: row.taskId, error: res.error });
        continue;
      }
      claimedTaskIds.push(row.taskId);
      if (typeof res.streakCount === "number") streakCount = res.streakCount;
      if (typeof res.streakBonusCoins === "number") streakBonusCoins += res.streakBonusCoins;
    }
    return {
      ok: true as const,
      claimedCount: claimedTaskIds.length,
      claimedTaskIds,
      failed,
      ...(typeof streakCount === "number" ? { streakCount } : {}),
      ...(streakBonusCoins > 0 ? { streakBonusCoins } : {}),
    };
  },
});

/** 查询当前连签状态（P3） */
export const getCheckinStreak = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const row = await ctx.db
      .query("casual_checkin_streaks")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    return {
      streakCount: row?.streakCount ?? 0,
      lastClaimPeriodKey: row?.lastClaimPeriodKey,
      upcomingDayInCycle: ((row?.streakCount ?? 0) % 7) + 1,
    };
  },
});
