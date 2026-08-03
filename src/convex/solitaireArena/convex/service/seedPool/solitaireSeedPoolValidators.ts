import { v } from "convex/values";

/** Convex schema validator for game `recordedOps` (offline sim types live in solitaireRecordedOpTypes). */
export const solitaireRecordedStep = v.union(
  v.object({ op: v.literal("draw"), pacingMs: v.optional(v.number()) }),
  v.object({ op: v.literal("recycle"), pacingMs: v.optional(v.number()) }),
  v.object({
    op: v.literal("move"),
    suit: v.union(
      v.literal("hearts"),
      v.literal("diamonds"),
      v.literal("clubs"),
      v.literal("spades")
    ),
    rank: v.union(
      v.literal("A"),
      v.literal("2"),
      v.literal("3"),
      v.literal("4"),
      v.literal("5"),
      v.literal("6"),
      v.literal("7"),
      v.literal("8"),
      v.literal("9"),
      v.literal("10"),
      v.literal("J"),
      v.literal("Q"),
      v.literal("K")
    ),
    from: v.string(),
    to: v.string(),
    pacingMs: v.optional(v.number()),
  }),
  v.object({ op: v.literal("concede"), pacingMs: v.optional(v.number()) })
);
