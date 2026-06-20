import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import {
  PASS_LEVEL_REWARDS,
  PASS_MAX_LEVEL,
  passRewardForLevel,
} from "../../data/casualPassRewards.js";
import { deluxeInstantSkinIds } from "../../data/casualSkinCatalog.js";

/** 当前激活赛季（无则退回首条），用于 Pass 子表读写的单一入口 */
async function resolveActiveSeason(ctx: QueryCtx) {
  const seasons = await ctx.db.query("casual_seasons").collect();
  return seasons.find((s) => s.active) ?? seasons[0] ?? null;
}

/** 赛季列表 MVP：读 DB；无数据时返回占位（不写 DB，避免在 query 内突变） */
export const listSeasons = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_seasons").collect();
    if (rows.length > 0) {
      return rows.map((r) => ({
        seasonId: r.seasonId,
        name: r.name,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        active: r.active,
      }));
    }
    return [
      {
        seasonId: "season_placeholder_1",
        name: "Season 1 (configure in dashboard)",
        startsAt: Date.now(),
        endsAt: Date.now() + 86400000 * 90,
        active: true,
      },
    ];
  },
});

/**
 * 运营/运维手动创建（或更新）赛季。
 * - 同 `seasonId`：执行更新（upsert）
 * - `activateNow=true`：将其它赛季置为 inactive，并激活当前赛季
 */
export const upsertSeason = mutation({
  args: {
    seasonId: v.string(),
    name: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    activateNow: v.optional(v.boolean()),
  },
  handler: async (ctx, { seasonId, name, startsAt, endsAt, activateNow }) => {
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) {
      return { ok: false as const, error: "invalid_window" };
    }

    const existing = await ctx.db
      .query("casual_seasons")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .unique();

    const shouldActivate = activateNow === true;
    let targetId = existing?._id;
    if (!existing) {
      targetId = await ctx.db.insert("casual_seasons", {
        seasonId,
        name,
        startsAt,
        endsAt,
        active: shouldActivate,
      });
    } else {
      await ctx.db.patch(existing._id, {
        seasonId,
        name,
        startsAt,
        endsAt,
        ...(activateNow != null ? { active: shouldActivate } : {}),
      });
    }

    if (shouldActivate && targetId) {
      const all = await ctx.db.query("casual_seasons").collect();
      for (const s of all) {
        const nextActive = s._id === targetId;
        if (s.active !== nextActive) {
          await ctx.db.patch(s._id, { active: nextActive });
        }
      }
      await ctx.runMutation(internal.service.tournament.shared.casualTournamentAdmin.seedDemoTournaments, {});
    }

    return {
      ok: true as const,
      created: !existing,
      seasonId,
      activated: shouldActivate,
    };
  },
});

export const getPassProgress = query({
  args: { uid: v.optional(v.string()) },
  handler: async (ctx, { uid }) => {
    if (!uid) return null;
    const season = await resolveActiveSeason(ctx);
    if (!season) return null;
    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season.seasonId))
      .unique();
    const claimedRows = await ctx.db
      .query("casual_pass_claims")
      .withIndex("by_uid_season_track_level", (q) =>
        q.eq("uid", uid).eq("seasonId", season.seasonId)
      )
      .collect();
    const claimed = claimedRows.map((c) => ({ track: c.track, level: c.level }));

    if (!row) {
      return {
        uid,
        seasonId: season.seasonId,
        level: 1,
        xp: 0,
        seasonVouchers: 0,
        tracksPurchased: { standard: false, deluxe: false },
        claimed,
      };
    }
    return {
      uid: row.uid,
      seasonId: row.seasonId,
      level: row.level,
      xp: row.xp,
      seasonVouchers: row.seasonVouchers ?? 0,
      tracksPurchased: row.tracksPurchased ?? { standard: false, deluxe: false },
      claimed,
    };
  },
});

export const activeSeasonIdForAuth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const season = await resolveActiveSeason(ctx);
    return season ? { seasonId: season.seasonId } : null;
  },
});

/** `casual_pass_progress` 当季快照：authenticate 一次读出 */
export const seasonEconomySnapshotForAuth = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const season = await resolveActiveSeason(ctx);
    if (!season) {
      return {
        seasonXp: 0,
        seasonVouchers: 0,
      };
    }
    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season.seasonId))
      .unique();
    return {
      seasonXp: row?.xp ?? 0,
      seasonVouchers: row?.seasonVouchers ?? 0,
    };
  },
});

/** 在当前激活赛季的 `casual_pass_progress` 上增减当季券（可 upsert） */
export const applySeasonWalletBalanceDelta = internalMutation({
  args: {
    uid: v.string(),
    deltaVouchers: v.optional(v.number()),
  },
  handler: async (ctx, { uid, deltaVouchers = 0 }) => {
    const dv = Math.trunc(deltaVouchers);
    if (dv === 0) return { ok: true as const };

    const season = await resolveActiveSeason(ctx);
    if (!season) return { ok: false as const, error: "no_season" as const };

    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season.seasonId))
      .unique();

    const baseV = row?.seasonVouchers ?? 0;
    const nextV = baseV + dv;
    if (nextV < 0) return { ok: false as const, error: "insufficient_vouchers" as const };

    const now = Date.now();
    if (!row) {
      await ctx.db.insert("casual_pass_progress", {
        uid,
        seasonId: season.seasonId,
        level: 1,
        xp: 0,
        seasonVouchers: nextV,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(row._id, {
        updatedAt: now,
        seasonVouchers: nextV,
      });
    }
    return { ok: true as const };
  },
});

async function autoClaimPassLevelsUpTo(
  ctx: MutationCtx,
  uid: string,
  seasonId: string,
  maxLevel: number
): Promise<void> {
  const progress = await ctx.db
    .query("casual_pass_progress")
    .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
    .unique();
  const tracksPurchased = progress?.tracksPurchased ?? {};
  const tracks: Array<"free" | "standard" | "deluxe"> = ["free"];
  if (tracksPurchased.standard) tracks.push("standard");
  if (tracksPurchased.deluxe) tracks.push("deluxe");

  const cap = Math.min(Math.max(1, maxLevel), PASS_MAX_LEVEL);
  for (let level = 1; level <= cap; level++) {
    for (const track of tracks) {
      const existingClaim = await ctx.db
        .query("casual_pass_claims")
        .withIndex("by_uid_season_track_level", (q) =>
          q.eq("uid", uid).eq("seasonId", seasonId).eq("track", track).eq("level", level)
        )
        .unique();
      if (existingClaim) continue;
      const reward = passRewardForLevel(track, level);
      if (!reward || reward.grants.length === 0) continue;
      for (const g of reward.grants) {
        await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
          uid,
          kind: g.kind,
          amount: g.amount,
          skinId: g.skinId,
          skinToken: g.skinToken,
          seasonId,
          source: g.kind === "skin" ? ("pass" as const) : undefined,
        });
      }
      await ctx.db.insert("casual_pass_claims", {
        uid,
        seasonId,
        track,
        level,
        claimedAt: Date.now(),
      });
    }
  }
}

export const addPassXpFromRun = internalMutation({
  args: { uid: v.string(), deltaXp: v.number() },
  handler: async (ctx, { uid, deltaXp }) => {
    const d = Math.max(0, Math.floor(deltaXp));
    if (d === 0) return { ok: true as const };
    const season = await resolveActiveSeason(ctx);
    if (!season) return { ok: false as const, error: "no_season" };
    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season.seasonId))
      .unique();
    const now = Date.now();
    const nextXp = (row?.xp ?? 0) + d;
    const nextLevel = Math.min(PASS_MAX_LEVEL, 1 + Math.floor(nextXp / 1000));
    if (!row) {
      await ctx.db.insert("casual_pass_progress", {
        uid,
        seasonId: season.seasonId,
        level: nextLevel,
        xp: nextXp,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(row._id, {
        xp: nextXp,
        level: Math.max(row.level, nextLevel),
        updatedAt: now,
      });
    }
    await autoClaimPassLevelsUpTo(ctx, uid, season.seasonId, nextLevel);
    return { ok: true as const };
  },
});

type ClaimPassLevelResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "level_not_reached"
        | "standard_not_owned"
        | "deluxe_not_owned"
        | "already_claimed"
        | "no_reward_row"
        | "no_player"
        | "claim_failed";
    };

export const claimPassLevel = mutation({
  args: {
    uid: v.string(),
    seasonId: v.string(),
    track: v.union(v.literal("free"), v.literal("standard"), v.literal("deluxe")),
    level: v.number(),
  },
  handler: async (ctx, { uid, seasonId, track, level }): Promise<ClaimPassLevelResult> => {
    const progress = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();
    const maxLevel = progress?.level ?? 1;
    if (level > maxLevel) {
      return { ok: false as const, error: "level_not_reached" };
    }
    const tracks = progress?.tracksPurchased ?? {};
    if (track === "standard" && !tracks.standard) {
      return { ok: false as const, error: "standard_not_owned" };
    }
    if (track === "deluxe" && !tracks.deluxe) {
      return { ok: false as const, error: "deluxe_not_owned" };
    }
    const existingClaim = await ctx.db
      .query("casual_pass_claims")
      .withIndex("by_uid_season_track_level", (q) =>
        q.eq("uid", uid).eq("seasonId", seasonId).eq("track", track).eq("level", level)
      )
      .unique();
    if (existingClaim) {
      return { ok: false as const, error: "already_claimed" };
    }
    const reward = passRewardForLevel(track, level);
    if (!reward) {
      return { ok: false as const, error: "no_reward_row" };
    }
    for (const g of reward.grants) {
      const gr = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: g.kind,
        amount: g.amount,
        skinId: g.skinId,
        skinToken: g.skinToken,
        seasonId,
        source: g.kind === "skin" ? ("pass" as const) : undefined,
      });
      if (!gr.ok) {
        return {
          ok: false as const,
          error: gr.error === "no_player" ? ("no_player" as const) : ("claim_failed" as const),
        };
      }
    }
    const now = Date.now();
    await ctx.db.insert("casual_pass_claims", {
      uid,
      seasonId,
      track,
      level,
      claimedAt: now,
    });
    return { ok: true as const };
  },
});

/** 开发/占位：解锁付费轨（真实环境由 IAP webhook 调用） */
export const devUnlockPassTrack = mutation({
  args: {
    uid: v.string(),
    seasonId: v.string(),
    track: v.union(v.literal("standard"), v.literal("deluxe")),
  },
  handler: async (ctx, { uid, seasonId, track }) => {
    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();
    const now = Date.now();
    const nextTracks = {
      ...(row?.tracksPurchased ?? {}),
      [track]: true,
    };
    const passLevelAfter = !row ? 1 : Math.max(1, row.level ?? 1);
    if (!row) {
      await ctx.db.insert("casual_pass_progress", {
        uid,
        seasonId,
        level: passLevelAfter,
        xp: 0,
        tracksPurchased: nextTracks,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(row._id, {
        tracksPurchased: nextTracks,
        updatedAt: now,
      });
    }
    await autoClaimPassLevelsUpTo(ctx, uid, seasonId, passLevelAfter);
    if (track === "deluxe") {
      for (const skinId of deluxeInstantSkinIds(seasonId)) {
        await ctx.runMutation(internal.service.skin.casualSkinService.grantSkin, {
          uid,
          skinId,
          source: "pass",
          seasonId,
        });
      }
    }
    return { ok: true as const };
  },
});

export const sealSeasonSnapshot = internalMutation({
  args: { seasonId: v.string(), kind: v.string(), payloadJson: v.string() },
  handler: async (ctx, { seasonId, kind, payloadJson }) => {
    await ctx.db.insert("casual_season_snapshots", {
      seasonId,
      kind,
      createdAt: Date.now(),
      payloadJson,
    });
    return { ok: true as const };
  },
});

/**
 * 自动季切：
 * 1) 按 startsAt/endsAt 命中当前时间窗口，自动激活目标赛季；
 * 2) 若发生季切（或发现数据缺口），触发一次 bootstrap，确保锦标/商店/活动可用。
 */
export const autoInitializeCurrentSeason = internalMutation({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    let seasons = await ctx.db.query("casual_seasons").collect();

    // 冷启动：没有赛季时先做一次引导写入。
    if (seasons.length === 0) {
      await ctx.runMutation(internal.service.tournament.shared.casualTournamentAdmin.seedDemoTournaments, {});
      seasons = await ctx.db.query("casual_seasons").collect();
      if (seasons.length === 0) {
        return {
          ok: false as const,
          error: "bootstrap_failed_no_season",
        };
      }
    }

    const inWindow = seasons
      .filter((s) => s.startsAt <= now && now < s.endsAt)
      .sort((a, b) => b.startsAt - a.startsAt);
    const target = inWindow[0] ?? null;
    if (!target) {
      return {
        ok: true as const,
        changed: false,
        targetSeasonId: null,
        reason: "no_matching_season_window",
      };
    }

    const activeRows = seasons.filter((s) => s.active);
    const shouldSwitch =
      activeRows.length !== 1 || activeRows[0]._id !== target._id;

    if (shouldSwitch) {
      const profiles = await ctx.db.query("casual_weekly_league_profile").collect();
      for (const p of profiles) {
        await ctx.db.patch(p._id, {
          seasonPeakLeagueTier: p.peakLeagueTier,
          updatedAt: now,
        });
        await ctx.runMutation(
          internal.service.achievement.casualAchievementService.checkAndUnlockAchievements,
          {
            uid: p.uid,
            event: {
              kind: "week_close",
              peakLeagueTier: p.peakLeagueTier,
              weeklyPromoteCount: p.totalWeeklyPromotions ?? 0,
            },
          }
        );
      }
      for (const s of seasons) {
        const nextActive = s._id === target._id;
        if (s.active !== nextActive) {
          await ctx.db.patch(s._id, { active: nextActive });
        }
      }
      await ctx.runMutation(internal.service.tournament.shared.casualTournamentAdmin.seedDemoTournaments, {});
      return {
        ok: true as const,
        changed: true,
        targetSeasonId: target.seasonId,
        activatedAt: now,
      };
    }

    // 已在目标赛季：若关键基础数据缺失，兜底引导一次。
    const hasTournament = await ctx.db.query("casual_tournaments").first();
    const hasShopSku = await ctx.db.query("casual_shop_skus").first();
    const hasActivity = await ctx.db.query("casual_activities").first();
    const repaired = !hasTournament || !hasShopSku || !hasActivity;
    if (repaired) {
      await ctx.runMutation(internal.service.tournament.shared.casualTournamentAdmin.seedDemoTournaments, {});
    }
    return {
      ok: true as const,
      changed: false,
      targetSeasonId: target.seasonId,
      repaired,
    };
  },
});

export const listPassRewardTable = query({
  args: {},
  handler: async () => PASS_LEVEL_REWARDS,
});
