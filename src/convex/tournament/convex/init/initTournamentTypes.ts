import { mutation } from "../_generated/server";
import { TOURNAMENT_CONFIGS } from "../data/tournamentConfigs";

export const initTournamentTypes = mutation({
  args: {},
  handler: async (ctx) => {
    let count = 0;

    for (const config of TOURNAMENT_CONFIGS) {
      const existing = await ctx.db
        .query("tournament_types")
        .withIndex("by_typeId", (q) => q.eq("typeId", config.typeId))
        .first();

      if (!existing) {
        await ctx.db.insert("tournament_types", {
          typeId: config.typeId,
          name: config.name,
          description: config.description,
          gameType: config.gameType,
          isActive: config.isActive,
          priority: config.priority,
          defaultConfig: {
            entryRequirements: config.entryRequirements,
            matchRules: config.matchRules,
            rewards: config.rewards,
            schedule: config.schedule,
            limits: config.limits,
            advanced: config.advanced
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        count++;
      }
    }

    return { success: true, count };
  },
});