import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { listTournamentDefinitions } from "../../../data/casualTournamentConfigs";
import type { PayoutBucket } from "../../../data/casualPayoutPolicy";
import { internalMutation } from "../../../_generated/server";

const LEGACY_ASYNC_PAYOUT_BUCKETS = new Set([
  "tournament_a",
  "tournament_b",
  "tournament_c",
  "triathlon_a",
  "triathlon_b",
  "triathlon_c",
]);

function normalizePayoutBucket(bucket: string): PayoutBucket {
  if (bucket === "async" || bucket === "season_challenge" || bucket === "solo_p75") {
    return bucket;
  }
  if (LEGACY_ASYNC_PAYOUT_BUCKETS.has(bucket)) return "async";
  return "async";
}

/** One-off: strip seasonPointsGrantedToday and merge legacy payout buckets. */
export const migrateCasualPayoutDailyCounters = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const rows = await ctx.db.query("casual_payout_daily_counters").collect();
    type Acc = {
      uid: string;
      periodKey: string;
      bucket: PayoutBucket;
      settledCount: number;
      coinsGrantedToday: number;
      updatedAt: number;
    };
    const merged = new Map<string, Acc>();

    for (const row of rows) {
      const bucket = normalizePayoutBucket(row.bucket);
      const key = `${row.uid}|${row.periodKey}|${bucket}`;
      const prev = merged.get(key);
      if (prev) {
        prev.settledCount += row.settledCount;
        prev.coinsGrantedToday += row.coinsGrantedToday;
        prev.updatedAt = Math.max(prev.updatedAt, row.updatedAt);
      } else {
        merged.set(key, {
          uid: row.uid,
          periodKey: row.periodKey,
          bucket,
          settledCount: row.settledCount,
          coinsGrantedToday: row.coinsGrantedToday,
          updatedAt: row.updatedAt,
        });
      }
    }

    if (dryRun) {
      return {
        ok: true as const,
        dryRun: true as const,
        scanned: rows.length,
        merged: merged.size,
      };
    }

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    let inserted = 0;
    for (const acc of merged.values()) {
      await ctx.db.insert("casual_payout_daily_counters", acc);
      inserted += 1;
    }
    return {
      ok: true as const,
      scanned: rows.length,
      deleted: rows.length,
      inserted,
      merged: merged.size,
    };
  },
});

/** 一次性：`casual_tournaments.gameId` → `gameType` */
export const migrateCasualTournamentsGameType = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_tournaments").collect();
    let patched = 0;
    for (const row of rows) {
      const legacy = (row as { gameId?: string }).gameId;
      const current = (row as { gameType?: string }).gameType;
      if (legacy != null && !current) {
        await ctx.db.patch(row._id, { gameType: legacy });
        // @ts-expect-error legacy field removed from schema after migrateCasualTournamentsGameType
        await ctx.db.patch(row._id, { gameId: undefined });
        patched++;
      }
    }
    return { ok: true as const, patched };
  },
});

/** ä¸€æ¬¡æ€§ï¼šæ¸…é™¤å·²åºŸå¼ƒçš„ `externalGameId`ï¼ˆç”± `matchId` æŽ¨å¯¼ `casual_sess:{matchId}`ï¼‰ */
export const migrateStripCasualRunExternalGameId = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_run_player_matches").collect();
    let patched = 0;
    for (const row of rows) {
      const legacy = (row as { externalGameId?: string }).externalGameId;
      if (legacy != null) {
        // @ts-expect-error legacy field removed from schema after migrateStripCasualRunExternalGameId
        await ctx.db.patch(row._id, { externalGameId: undefined });
        patched++;
      }
    }
    return { ok: true as const, patched };
  },
});

export const seedDemoTournaments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const seasons = await ctx.db.query("casual_seasons").collect();
    if (seasons.length === 0) {
      const now = Date.now();
      await ctx.db.insert("casual_seasons", {
        seasonId: "casual_s1",
        name: "Season 1",
        startsAt: now,
        endsAt: now + 90 * 86400000,
        active: true,
      });
    }
    let tournamentsUpserted = 0;
    for (const t of listTournamentDefinitions()) {
      const existing = await ctx.db
        .query("casual_tournaments")
        .withIndex("by_tournamentId", (q) => q.eq("tournamentId", t.tournamentId))
        .unique();
      if (!existing) {
        await ctx.db.insert("casual_tournaments", {
          tournamentId: t.tournamentId,
          title: t.title,
          gameType: t.gameType,
          matchType: t.matchType,
          status: t.status,
        });
        tournamentsUpserted++;
      } else if (
        existing.title !== t.title ||
        existing.gameType !== t.gameType ||
        existing.matchType !== t.matchType ||
        existing.status !== t.status
      ) {
        await ctx.db.patch(existing._id, {
          title: t.title,
          gameType: t.gameType,
          matchType: t.matchType,
          status: t.status,
        });
        tournamentsUpserted++;
      }
    }
    await ctx.runMutation(internal.service.shop.casualShopService.seedShopSkusIfEmpty, {});
    await ctx.runMutation(internal.service.activity.casualActivityService.seedActivitiesIfEmpty, {});
    return { ok: true as const, tournamentsUpserted };
  },
});
