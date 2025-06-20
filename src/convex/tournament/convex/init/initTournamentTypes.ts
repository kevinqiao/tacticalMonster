import { mutation } from "../_generated/server";
import tournamentTypesData from "./json/tournament_types.json";

export const initTournamentTypes = mutation({
  args: {},
  handler: async (ctx) => {
    for (const record of tournamentTypesData.objects) {
      const existing = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q) => q.eq("typeId", record.typeId))
        .first();
      if (!existing) {
        await ctx.db.insert("tournament_types", {
          typeId: record.typeId,
          name: record.name,
          description: record.description,
          handlerModule: record.handlerModule,
          defaultConfig: record.defaultConfig,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }
    }
    return { success: true, count: tournamentTypesData.objects.length };
  },
});