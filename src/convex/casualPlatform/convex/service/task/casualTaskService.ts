import { v } from "convex/values";
import { listSpotlightEligibleGameTypes } from "../../data/casualGameRegistry";
import { weeklySpotlightPlatformGameType } from "../../data/casualSpotlightGame.js";
import {
  CASUAL_MISSION_TEMPLATES,
  type CasualMissionTemplate,
  type MissionTier,
  missionPoolLabelZh,
} from "../../data/casualMissionTemplates";
import { resolvePrimaryPlatformGameType } from "./casualPrimaryGame.js";
import { deltaForMissionObjective } from "./casualMissionObjectiveDelta";
import { internal } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { dailyPeriodKey, seasonPeriodKey, weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { internalMutation, mutation, query } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";

const ASYNC_MATCH_TYPES = new Set(["tournament_a", "tournament_b", "tournament_c"]);
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
    });
  }
}

async function setTaskProgressAbsolute(
  ctx: MutationCtx,
  template: CasualMissionTemplate,
  uid: string,
  taskId: string,
  periodKey: string,
  absoluteProgress: number,
  meta?: { matchType?: string }
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
  const next = Math.min(target, Math.max(0, Math.floor(absoluteProgress)));
  if (next === base) return;
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
    });
  }
}

async function bumpTaskGameCount(
  ctx: MutationCtx,
  uid: string,
  taskId: string,
  periodKey: string,
  platformGameType: string
): Promise<number> {
  const existing = await ctx.db
    .query("casual_task_game_progress")
    .withIndex("by_uid_task_period_game", (q) =>
      q
        .eq("uid", uid)
        .eq("taskId", taskId)
        .eq("periodKey", periodKey)
        .eq("platformGameType", platformGameType)
    )
    .unique();
  const now = Date.now();
  const next = (existing?.count ?? 0) + 1;
  if (!existing) {
    await ctx.db.insert("casual_task_game_progress", {
      uid,
      taskId,
      periodKey,
      platformGameType,
      count: next,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, { count: next, updatedAt: now });
  }
  return next;
}

async function countDistinctGamesMeetingMin(
  ctx: MutationCtx,
  uid: string,
  taskId: string,
  periodKey: string,
  minRuns: number
): Promise<number> {
  const rows = await ctx.db
    .query("casual_task_game_progress")
    .withIndex("by_uid_task_period", (q) =>
      q.eq("uid", uid).eq("taskId", taskId).eq("periodKey", periodKey)
    )
    .collect();
  let n = 0;
  for (const row of rows) {
    if (row.count >= minRuns) n += 1;
  }
  return n;
}

async function syncDistinctGameTaskProgress(
  ctx: MutationCtx,
  template: CasualMissionTemplate,
  uid: string,
  periodKey: string,
  meta?: { matchType?: string }
) {
  const minRuns = template.minRunsPerGame ?? 1;
  const distinct = await countDistinctGamesMeetingMin(ctx, uid, template.taskId, periodKey, minRuns);
  await setTaskProgressAbsolute(ctx, template, uid, template.taskId, periodKey, distinct, meta);
}

async function updatePlatformGameDerivedTasks(
  ctx: MutationCtx,
  args: {
    uid: string;
    platformGameType: string;
    primaryGameType: string;
    spotlightGameType: string;
    matchType: string;
    multiplayerFinalRank?: number;
    dailyPk: string;
    weeklyPk: string;
    seasonPk: string | null;
  }
) {
  const {
    uid,
    platformGameType,
    primaryGameType,
    spotlightGameType,
    matchType,
    multiplayerFinalRank,
    dailyPk,
    weeklyPk,
    seasonPk,
  } = args;
  const isNonPrimary = platformGameType !== primaryGameType;
  const isSpotlight = platformGameType === spotlightGameType;
  const isAsyncTop3 =
    ASYNC_MATCH_TYPES.has(matchType) &&
    typeof multiplayerFinalRank === "number" &&
    multiplayerFinalRank >= 1 &&
    multiplayerFinalRank <= 3;

  for (const t of CASUAL_MISSION_TEMPLATES) {
    const pk = t.tier === "daily" ? dailyPk : t.tier === "weekly" ? weeklyPk : seasonPk;
    if (!pk) continue;

    if (t.objectiveKind === "submit_non_primary_score" && isNonPrimary) {
      await upsertTaskProgress(ctx, t, uid, t.taskId, pk, 1, { matchType });
      continue;
    }

    if (t.objectiveKind === "submit_spotlight_game_score" && isSpotlight) {
      const delta =
        isSpotlight && platformGameType === primaryGameType ? 2 : 1;
      await upsertTaskProgress(ctx, t, uid, t.taskId, pk, delta, { matchType });
      continue;
    }

    if (t.objectiveKind === "submit_spotlight_game_top3" && isSpotlight && isAsyncTop3) {
      await upsertTaskProgress(ctx, t, uid, t.taskId, pk, 1, { matchType });
      continue;
    }

    if (t.objectiveKind === "submit_distinct_games") {
      await bumpTaskGameCount(ctx, uid, t.taskId, pk, platformGameType);
      await syncDistinctGameTaskProgress(ctx, t, uid, pk, { matchType });
    }
  }
}

/** 合并模板与玩家 `casual_tasks` / `claims`（按当前 periodKey） */
export const listSeasonMissions = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
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
        if (pk) {
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
        if (pk) {
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
          missionPool: t.missionPool,
          missionPoolLabel: missionPoolLabelZh(t.missionPool),
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
    kind: "coins" | "seasonXp" | "seasonVoucher";
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
export const touchDailyLoginMission = authedMutation({
  args: {},
  handler: async (ctx) => {
    await touchDailyLoginProgress(ctx, ctx.uid);
    return { ok: true as const };
  },
});

/** 一次性：`platformGameId` → `platformGameType`（字段重命名迁移） */
export const migrateCasualTaskGameProgressPlatformGameType = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_task_game_progress").collect();
    let patched = 0;
    for (const row of rows) {
      const legacy = (row as { platformGameId?: string }).platformGameId;
      const current = (row as { platformGameType?: string }).platformGameType;
      if (legacy != null && !current) {
        // @ts-expect-error legacy field renamed to platformGameType
        await ctx.db.patch(row._id, {
          platformGameType: legacy,
          platformGameId: undefined,
        });
        patched++;
      }
    }
    return { ok: true as const, patched };
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

/** 多游戏 Pass 任务上下文：主游戏、本周主题游戏 */
export const getPlatformPassMissionContext = authedQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const spotlightGameType = weeklySpotlightPlatformGameType(now);
    const primaryGameType = await resolvePrimaryPlatformGameType(ctx, ctx.uid, now);
    return {
      spotlightGameType,
      primaryGameType,
      spotlightGames: listSpotlightEligibleGameTypes(),
    };
  },
});

/** 对局有效结算后调用，驱动任务进度。 */
export const notifyScoreSubmitted = internalMutation({
  args: {
    uid: v.string(),
    matchType: v.string(),
    /** 平台玩法类型：`solitaire` / `block_blast` 等 */
    platformGameType: v.string(),
    /** 多人异步终局名次（1-based） */
    multiplayerFinalRank: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { uid, matchType, platformGameType, multiplayerFinalRank }
  ) => {
    const now = Date.now();
    const dailyPk = dailyPeriodKey(now);
    const weeklyPk = weeklyPeriodKey(now);
    const sid = await activeSeasonId(ctx);
    const seasonPk = sid ? seasonPeriodKey(sid) : null;

    const primaryGameType = await resolvePrimaryPlatformGameType(ctx, uid, now);
    const spotlightGameType = weeklySpotlightPlatformGameType(now);

    const args = {
      matchType,
      platformGameType,
      primaryGameType,
      spotlightGameType,
      multiplayerFinalRank,
    };

    for (const t of CASUAL_MISSION_TEMPLATES) {
      if (
        t.objectiveKind === "login_daily" ||
        t.objectiveKind === "join_tournament_once"
      ) {
        continue;
      }
      const delta = deltaForMissionObjective(t, args);
      if (delta <= 0) continue;
      const pk =
        t.tier === "daily" ? dailyPk : t.tier === "weekly" ? weeklyPk : seasonPk;
      if (!pk) continue;
      await upsertTaskProgress(ctx, t, uid, t.taskId, pk, delta, { matchType });
    }

    await updatePlatformGameDerivedTasks(ctx, {
      uid,
      platformGameType,
      primaryGameType,
      spotlightGameType,
      matchType,
      multiplayerFinalRank,
      dailyPk,
      weeklyPk,
      seasonPk,
    });
    return { ok: true as const };
  },
});

/** 周联赛周尾晋级时调用（`closeExpiredWeeks`）。 */
export const notifyWeeklyLeaguePromote = internalMutation({
  args: { uid: v.string(), weekKey: v.string() },
  handler: async (ctx, { uid, weekKey }) => {
    const template = CASUAL_MISSION_TEMPLATES.find(
      (t) => t.objectiveKind === "weekly_league_promote"
    );
    if (!template) return { ok: true as const };
    await upsertTaskProgress(ctx, template, uid, template.taskId, weekKey, 1, {});
    return { ok: true as const };
  },
});

export const claimSeasonMission = authedMutation({
  args: { taskId: v.string() },
  handler: async (ctx, { taskId }) => {
    const r = await claimMissionCore(ctx, ctx.uid, taskId);
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
export const claimAllReadyMissions = authedMutation({
  args: { tier: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("season"))) },
  handler: async (ctx, { tier }) => {
    const uid = ctx.uid;
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
export const getCheckinStreak = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
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
