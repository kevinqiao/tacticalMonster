import { internalMutation } from "../../_generated/server";
import { resolveExperienceType } from "./campaignExperienceType";
import { legacyDefaultTournamentId, resolveCampaignTournament } from "./campaignTournament";

type LegacyCampaignFields = {
  gameType?: string | null;
  mode?: string | null;
  tournamentId?: string | null;
};

/**
 * One-shot widen-migrate helper:
 * - set tournamentId from legacy gameType+mode when missing
 * - clear stored gameType/mode (schema keeps them optional until a later narrow)
 */
export const backfillCampaignTournamentIdsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("campaigns").collect();
    let patched = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of rows) {
      const experienceType = resolveExperienceType(row);
      const legacy = row as typeof row & LegacyCampaignFields;
      const hasLegacyPlay =
        legacy.gameType != null || legacy.mode != null;

      if (experienceType === "display") {
        if (legacy.tournamentId != null || hasLegacyPlay) {
          await ctx.db.patch(row._id, {
            tournamentId: undefined,
            gameType: undefined,
            mode: undefined,
          });
          patched += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      const resolved = resolveCampaignTournament(legacy);
      const tournamentId =
        resolved?.tournamentId ??
        (typeof legacy.gameType === "string" &&
        (legacy.mode === "solo" || legacy.mode === "multi")
          ? legacyDefaultTournamentId(legacy.gameType, legacy.mode)
          : null);

      if (!tournamentId) {
        failed += 1;
        continue;
      }

      if (legacy.tournamentId === tournamentId && !hasLegacyPlay) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(row._id, {
        tournamentId,
        gameType: undefined,
        mode: undefined,
      });
      patched += 1;
    }
    return { ok: true as const, total: rows.length, patched, skipped, failed };
  },
});
