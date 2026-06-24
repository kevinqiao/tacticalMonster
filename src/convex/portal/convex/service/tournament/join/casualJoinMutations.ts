import { v } from "convex/values";
import {
  getPortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import { internalQuery, query } from "../../../_generated/server";
import { assertJoinEntryEligible } from "./casualTournamentJoinCore";

/** ? join ?????????(internal) */
export const previewJoinEntryChargeInternal = internalQuery({
  args: { uid: v.string(), tournamentId: v.string() },
  handler: async (ctx, { uid, tournamentId }) => {
    return await assertJoinEntryEligible(ctx, uid, tournamentId, Date.now());
  },
});

export const previewJoinEntryCharge = query({
  args: { uid: v.string(), tournamentId: v.string() },
  handler: async (ctx, { uid, tournamentId }) => {
    return await assertJoinEntryEligible(ctx, uid, tournamentId, Date.now());
  },
});
