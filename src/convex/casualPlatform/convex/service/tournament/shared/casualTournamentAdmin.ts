import { internal } from "../../../_generated/api";
import { listTournamentDefinitions } from "../../../data/casualTournamentConfigs";
import { internalMutation } from "../../../_generated/server";
/** ä¸€æ¬¡æ€§ï¼š`casual_tournaments.gameId` â†’ `gameType` */
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
