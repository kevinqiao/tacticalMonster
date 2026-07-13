import { v } from "convex/values";

import { authedMutation, authedQuery } from "../../custom/session";
import { resolvePlayerDisplayName } from "../../../../shared/displayName";

/** Min days between display-name changes. */
export const PORTAL_DISPLAY_NAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const DISPLAY_NAME_MIN = 3;
const DISPLAY_NAME_MAX = 16;
const DISPLAY_NAME_RE = /^[A-Za-z0-9_ ]+$/;

const DISPLAY_NAME_BLOCKLIST = new Set(
  ["admin", "moderator", "mod", "system", "null", "undefined", "official"].map((s) =>
    s.toLowerCase()
  )
);

export type UpdatePortalDisplayNameError =
  | "invalid_name"
  | "name_taken"
  | "cooldown"
  | "unchanged";

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function normalizeDisplayNameKey(raw: string): string {
  return normalizeDisplayName(raw).toLowerCase();
}

export function validatePortalDisplayName(
  raw: string
): { ok: true; displayName: string; normalized: string } | { ok: false; error: "invalid_name" } {
  const displayName = normalizeDisplayName(raw);
  if (
    displayName.length < DISPLAY_NAME_MIN ||
    displayName.length > DISPLAY_NAME_MAX ||
    !DISPLAY_NAME_RE.test(displayName)
  ) {
    return { ok: false, error: "invalid_name" };
  }
  if (DISPLAY_NAME_BLOCKLIST.has(displayName.toLowerCase())) {
    return { ok: false, error: "invalid_name" };
  }
  return {
    ok: true,
    displayName,
    normalized: normalizeDisplayNameKey(displayName),
  };
}

export const getPortalPlayerProfile = authedQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();
    const customName = row?.displayName?.trim() || null;
    return {
      displayName: customName,
      resolvedDisplayName: resolvePlayerDisplayName({
        uid: ctx.uid,
        customName,
      }),
      verifiedEmail: row?.verifiedEmail ?? null,
      verifiedPhone: row?.verifiedPhone ?? null,
      displayNameUpdatedAt: row?.displayNameUpdatedAt ?? null,
    };
  },
});

export const updatePortalDisplayName = authedMutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const validated = validatePortalDisplayName(args.displayName);
    if (!validated.ok) {
      return { ok: false as const, error: validated.error };
    }

    const now = Date.now();
    let player = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();

    if (!player) {
      const id = await ctx.db.insert("portal_players", {
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
      now - player.displayNameUpdatedAt < PORTAL_DISPLAY_NAME_COOLDOWN_MS
    ) {
      return { ok: false as const, error: "cooldown" as const };
    }

    const taken = await ctx.db
      .query("portal_players")
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
