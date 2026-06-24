import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

const emptyModifiers = {
  voucherCostMultiplier: 1,
  voucherCostDelta: 0,
  passXpMultiplier: 1,
  passXpDelta: 0,
  coinsCostMultiplier: 1,
  coinsCostDelta: 0,
  gemsCostMultiplier: 1,
  gemsCostDelta: 0,
};

export const resolveSeasonActivityModifiers = internalQuery({
  args: { tournamentId: v.optional(v.string()) },
  handler: async () => emptyModifiers,
});

export const seedActivitiesIfEmpty = internalMutation({
  args: {},
  handler: async () => {},
});
