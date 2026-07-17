import { v } from "convex/values";

import {
  DISPLAY_NAME_COOLDOWN_MS,
  resolvePlayerDisplayName,
  validateDisplayName,
} from "../../../../shared/displayName";
import { authedMutation, authedQuery } from "../../custom/session";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const getCampaignPlayerProfile = authedQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("campaign_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();
    const customName = row?.displayName?.trim() || null;
    return {
      displayName: customName,
      resolvedDisplayName: resolvePlayerDisplayName({
        uid: ctx.uid,
        customName,
      }),
      displayNameUpdatedAt: row?.displayNameUpdatedAt ?? null,
      verifiedEmail: row?.verifiedEmail ?? null,
      verifiedPhone: row?.verifiedPhone ?? null,
    };
  },
});

export const updateCampaignDisplayName = authedMutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const validated = validateDisplayName(args.displayName);
    if (!validated.ok) {
      return { ok: false as const, error: validated.error };
    }

    const now = Date.now();
    let player = await ctx.db
      .query("campaign_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();

    if (!player) {
      const id = await ctx.db.insert("campaign_players", {
        uid: ctx.uid,
        createdAt: now,
        updatedAt: now,
      });
      player = (await ctx.db.get(id))!;
    }

    const current = player.displayName?.trim() ?? "";
    if (current === validated.displayName) {
      return { ok: true as const, displayName: current, unchanged: true as const };
    }

    if (
      player.displayNameUpdatedAt != null &&
      now - player.displayNameUpdatedAt < DISPLAY_NAME_COOLDOWN_MS
    ) {
      return { ok: false as const, error: "cooldown" as const };
    }

    const taken = await ctx.db
      .query("campaign_players")
      .withIndex("by_displayNameNormalized", (q) =>
        q.eq("displayNameNormalized", validated.normalized)
      )
      .unique();
    if (taken && taken.uid !== ctx.uid) {
      return { ok: false as const, error: "name_taken" as const };
    }

    await ctx.db.patch(player._id, {
      displayName: validated.displayName,
      displayNameNormalized: validated.normalized,
      displayNameUpdatedAt: now,
      updatedAt: now,
    });

    return { ok: true as const, displayName: validated.displayName };
  },
});

/** 活动侧联系方式（与 Portal 礼品卡档案独立）。 */
export const syncCampaignContactProfile = authedMutation({
  args: {
    verifiedEmail: v.optional(v.string()),
    verifiedPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let player = await ctx.db
      .query("campaign_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();

    if (!player) {
      const id = await ctx.db.insert("campaign_players", {
        uid: ctx.uid,
        createdAt: now,
        updatedAt: now,
      });
      player = (await ctx.db.get(id))!;
    }

    const email = args.verifiedEmail?.trim();
    const phone = args.verifiedPhone?.trim();

    if (email && !looksLikeEmail(email)) {
      return { ok: false as const, error: "invalid_email" as const };
    }

    const patch: {
      updatedAt: number;
      verifiedEmail?: string;
      verifiedPhone?: string;
      contactVerifiedAt?: number;
    } = { updatedAt: now };

    if (email) {
      patch.verifiedEmail = email;
      patch.contactVerifiedAt = now;
    }
    if (phone) {
      patch.verifiedPhone = phone;
      patch.contactVerifiedAt = now;
    }

    await ctx.db.patch(player._id, patch);
    return { ok: true as const };
  },
});
