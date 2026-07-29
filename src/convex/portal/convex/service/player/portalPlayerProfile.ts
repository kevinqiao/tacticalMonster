import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../_generated/server";
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

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ensurePortalPlayer(ctx: MutationCtx, uid: string, now: number) {
  const existing = await ctx.db
    .query("portal_players")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("portal_players", {
    uid,
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

async function profileForUid(ctx: QueryCtx, uid: string) {
  const row = await ctx.db
    .query("portal_players")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  const customName = row?.displayName?.trim() || null;
  return {
    displayName: customName,
    resolvedDisplayName: resolvePlayerDisplayName({ uid, customName }),
    verifiedEmail: row?.verifiedEmail ?? null,
    verifiedPhone: row?.verifiedPhone ?? null,
    displayNameUpdatedAt: row?.displayNameUpdatedAt ?? null,
  };
}

async function updateDisplayNameForUid(
  ctx: MutationCtx,
  uid: string,
  displayName: string
) {
  const validated = validatePortalDisplayName(displayName);
  if (!validated.ok) {
    return { ok: false as const, error: validated.error };
  }

  const now = Date.now();
  const player = await ensurePortalPlayer(ctx, uid, now);

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
  if (taken && taken.uid !== uid) {
    return { ok: false as const, error: "name_taken" as const };
  }

  await ctx.db.patch(player._id, {
    displayName: validated.displayName,
    displayNameNormalized: validated.normalized,
    displayNameUpdatedAt: now,
    updatedAt: now,
  });

  return { ok: true as const, displayName: validated.displayName };
}

async function syncContactForUid(
  ctx: MutationCtx,
  args: { uid: string; verifiedEmail?: string; verifiedPhone?: string }
) {
  const now = Date.now();
  const player = await ensurePortalPlayer(ctx, args.uid, now);
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
    redemptionProfileSyncedAt?: number;
  } = { updatedAt: now, redemptionProfileSyncedAt: now };

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
}

export const getPortalPlayerProfile = authedQuery({
  args: {},
  handler: async (ctx) => profileForUid(ctx, ctx.uid),
});

export const updatePortalDisplayName = authedMutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => updateDisplayNameForUid(ctx, ctx.uid, args.displayName),
});

/** Campaign bridge: read Portal player profile by uid. */
export const getPortalPlayerProfileForUidInternal = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, args) => profileForUid(ctx, args.uid),
});

/** Campaign bridge: update display name on portal_players. */
export const updatePortalDisplayNameForUidInternal = internalMutation({
  args: { uid: v.string(), displayName: v.string() },
  handler: async (ctx, args) => updateDisplayNameForUid(ctx, args.uid, args.displayName),
});

/** Campaign bridge: sync contact fields onto portal_players. */
export const syncPortalContactForUidInternal = internalMutation({
  args: {
    uid: v.string(),
    verifiedEmail: v.optional(v.string()),
    verifiedPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => syncContactForUid(ctx, args),
});
