import { v } from "convex/values";
import {
  getTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import { internalQuery, query } from "../../../_generated/server";
import { assertJoinEntryEligible } from "./casualTournamentJoinCore";

/** 与 join 路径一致的入场预览（internal） */
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
