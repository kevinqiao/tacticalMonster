import { v } from "convex/values";

/** Convex schema validator for game `recordedOps` (offline sim types live in blockBlastRecordedOpTypes). */
export const blockBlastRecordedStep = v.union(
  v.object({
    op: v.literal("place"),
    slot: v.number(),
    row: v.number(),
    col: v.number(),
    pacingMs: v.optional(v.number()),
  }),
  v.object({ op: v.literal("concede"), pacingMs: v.optional(v.number()) })
);
