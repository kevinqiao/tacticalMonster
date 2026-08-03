import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import { themeJsonValidator } from "./validators";

/**
 * `theme_sync_jobs` no longer exists. Theme sync drafts are no longer
 * persisted server-side; `syncThemeFromUrl` still returns the extracted
 * draft directly to the caller, but nothing is saved for later review.
 */

export const saveSyncJob = internalMutation({
  args: {
    partnerId: v.number(),
    sourceUrl: v.string(),
    rawExtract: v.string(),
    themeDraft: themeJsonValidator,
  },
  handler: async () => {
    return { ok: false as const, error: "not_supported" as const };
  },
});

export const getLatestSyncJob = internalQuery({
  args: { partnerId: v.number() },
  handler: async () => {
    return null;
  },
});
