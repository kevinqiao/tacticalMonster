import { v } from "convex/values";

import type { QueryCtx } from "../../_generated/server";
import { internalQuery, query } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { getPartnerByPid, requirePartnerStaff } from "./partnerStaff";
import { partnerHasCampaignOps } from "./partnerCapabilities";
import { isPlatformOperator } from "./platformOperator";
import {
  assertValidStoreSlug,
  getStoreById,
  getStoreBySlug,
  getStoreStaffRow,
  newStoreId,
  normalizeStoreSlug,
  type StoreStaffRole,
} from "./storeStaff";

const storeStaffRoleValidator = v.union(v.literal("owner"), v.literal("staff"));

async function requireCampaignOpsAdmin(
  ctx: { user: { uid: string } } & Parameters<typeof requirePartnerStaff>[0],
  partnerId: number
) {
  const partner = await getPartnerByPid(ctx, partnerId);
  if (!partner) throw new Error("not_found");
  if (!partnerHasCampaignOps(partner)) {
    throw new Error("campaign_ops_disabled");
  }
  if (await isPlatformOperator(ctx, ctx.user.uid)) return;
  await requirePartnerStaff(ctx, partnerId, "admin");
}

async function requireCampaignOpsViewer(
  ctx: { user: { uid: string } } & Parameters<typeof requirePartnerStaff>[0],
  partnerId: number
) {
  const partner = await getPartnerByPid(ctx, partnerId);
  if (!partner) throw new Error("not_found");
  if (!partnerHasCampaignOps(partner)) {
    throw new Error("campaign_ops_disabled");
  }
  if (await isPlatformOperator(ctx, ctx.user.uid)) return;
  await requirePartnerStaff(ctx, partnerId, "viewer");
}

/**
 * Store owner, or Partner campaign-ops admin (so /partner/admin can manage staff
 * without first being store_staff on that store).
 */
async function requireStoreTeamManager(
  ctx: { user: { uid: string } } & QueryCtx,
  storeId: string
): Promise<{ store: NonNullable<Awaited<ReturnType<typeof getStoreById>>>; myRole: StoreStaffRole }> {
  const store = await getStoreById(ctx, storeId);
  if (!store) throw new Error("not_found");

  const staff = await getStoreStaffRow(ctx, storeId, ctx.user.uid);
  if (staff) {
    if (staff.role !== "owner") throw new Error("forbidden");
    return { store, myRole: "owner" };
  }

  await requireCampaignOpsAdmin(ctx, store.partnerId);
  return { store, myRole: "owner" };
}

async function requireStoreTeamAccess(
  ctx: { user: { uid: string } } & QueryCtx,
  storeId: string
): Promise<{ store: NonNullable<Awaited<ReturnType<typeof getStoreById>>>; myRole: StoreStaffRole }> {
  const store = await getStoreById(ctx, storeId);
  if (!store) throw new Error("not_found");

  const staff = await getStoreStaffRow(ctx, storeId, ctx.user.uid);
  if (staff) {
    return { store, myRole: staff.role as StoreStaffRole };
  }

  // Partner admin can view/manage from /partner/admin
  await requireCampaignOpsAdmin(ctx, store.partnerId);
  return { store, myRole: "owner" };
}

export const createStore = authedMutation({
  args: {
    partnerId: v.number(),
    slug: v.string(),
    name: v.string(),
    ownerUid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCampaignOpsAdmin(ctx, args.partnerId);
    const slug = normalizeStoreSlug(args.slug);
    assertValidStoreSlug(slug);
    const existing = await getStoreBySlug(ctx, slug);
    if (existing) throw new Error("slug_taken");

    const storeId = newStoreId();
    const now = Date.now();
    const ownerUid = (args.ownerUid ?? ctx.user.uid).trim();
    await ctx.db.insert("store", {
      storeId,
      partnerId: args.partnerId,
      slug,
      name: args.name.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    if (ownerUid) {
      await ctx.db.insert("store_staff", {
        storeId,
        uid: ownerUid,
        role: "owner",
        createdAt: now,
      });
    }
    return { storeId, slug, partnerId: args.partnerId };
  },
});

export const listStoresForPartner = authedQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await requireCampaignOpsViewer(ctx, partnerId);
    const rows = await ctx.db
      .query("store")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
      .collect();
    return rows
      .map((r) => ({
        storeId: r.storeId,
        partnerId: r.partnerId,
        slug: r.slug,
        name: r.name,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

/** Redeem console: stores where uid is store_staff. */
export const listMyStores = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.user.uid;
    const staffRows = await ctx.db
      .query("store_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const out = [];
    for (const s of staffRows) {
      const store = await getStoreById(ctx, s.storeId);
      if (store) {
        out.push({
          storeId: store.storeId,
          partnerId: store.partnerId,
          slug: store.slug,
          name: store.name,
          status: store.status,
          role: s.role as StoreStaffRole,
        });
      }
    }
    return out;
  },
});

export const listStoreTeam = authedQuery({
  args: { storeId: v.string() },
  handler: async (ctx, { storeId }) => {
    const { store, myRole } = await requireStoreTeamAccess(ctx, storeId);

    const rows = await ctx.db
      .query("store_staff")
      .withIndex("by_store", (q) => q.eq("storeId", storeId))
      .collect();

    return {
      storeId,
      storeName: store.name,
      partnerId: store.partnerId,
      myRole,
      members: rows
        .map((row) => ({
          uid: row.uid,
          role: row.role as StoreStaffRole,
          createdAt: row.createdAt,
        }))
        .sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

export const addStoreStaff = authedMutation({
  args: {
    storeId: v.string(),
    uid: v.string(),
    role: storeStaffRoleValidator,
  },
  handler: async (ctx, args) => {
    const { store } = await requireStoreTeamManager(ctx, args.storeId);

    const targetUid = args.uid.trim();
    if (!targetUid) throw new Error("uid_required");
    if (args.role === "owner") throw new Error("cannot_add_owner");

    const existing = await getStoreStaffRow(ctx, args.storeId, targetUid);
    if (existing) throw new Error("already_member");

    await ctx.db.insert("store_staff", {
      storeId: args.storeId,
      uid: targetUid,
      role: args.role,
      createdAt: Date.now(),
    });
    return { ok: true as const, uid: targetUid, partnerId: store.partnerId };
  },
});

export const removeStoreStaff = authedMutation({
  args: {
    storeId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { storeId, uid }) => {
    await requireStoreTeamManager(ctx, storeId);

    const targetUid = uid.trim();
    const row = await getStoreStaffRow(ctx, storeId, targetUid);
    if (!row) throw new Error("not_found");

    const actorUid = ctx.user.uid;
    if (row.role === "owner" && actorUid !== targetUid) {
      const owners = await ctx.db
        .query("store_staff")
        .withIndex("by_store", (q) => q.eq("storeId", storeId))
        .collect();
      const ownerCount = owners.filter((o) => o.role === "owner").length;
      if (ownerCount <= 1) throw new Error("last_owner");
    }

    await ctx.db.delete(row._id);
    return { ok: true as const };
  },
});

/** Public/embed: store slug → partnerId. */
export const resolvePartnerByStoreSlug = query({
  args: { storeSlug: v.string() },
  handler: async (ctx, args) => {
    const store = await getStoreBySlug(ctx, args.storeSlug);
    if (!store || store.status !== "active") return null;
    return {
      partnerId: store.partnerId,
      storeSlug: store.slug,
      storeName: store.name,
      storeId: store.storeId,
    };
  },
});

export const assertStoreStaffInternal = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const row = await ctx.db
      .query("store_staff")
      .withIndex("by_uid", (q) => q.eq("uid", uid.trim()))
      .first();
    if (!row) {
      return { ok: false as const, error: "not_store_staff" as const };
    }
    return { ok: true as const };
  },
});

export const assertStoreOwnerInternal = internalQuery({
  args: {
    storeId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { storeId, uid }) => {
    const store = await getStoreById(ctx, storeId);
    if (!store) {
      return { ok: false as const, error: "not_found" as const };
    }
    const row = await getStoreStaffRow(ctx, storeId, uid);
    if (row?.role === "owner") {
      return {
        ok: true as const,
        partnerId: store.partnerId,
      };
    }
    // Partner campaign-ops admin may provision staff from /partner/admin
    try {
      await requireCampaignOpsAdmin({ ...ctx, user: { uid } }, store.partnerId);
      return {
        ok: true as const,
        partnerId: store.partnerId,
      };
    } catch {
      return { ok: false as const, error: "forbidden" as const };
    }
  },
});

/** Redeem: store staff for a specific store (+ partnerId for coupon match). */
export const assertStoreStaffForStoreInternal = internalQuery({
  args: {
    storeId: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { storeId, uid }) => {
    const store = await getStoreById(ctx, storeId);
    if (!store || store.status !== "active") {
      return { ok: false as const, error: "not_found" as const };
    }
    const row = await getStoreStaffRow(ctx, storeId, uid.trim());
    if (!row) {
      return { ok: false as const, error: "forbidden" as const };
    }
    return {
      ok: true as const,
      partnerId: store.partnerId,
      role: row.role as StoreStaffRole,
      status: store.status,
    };
  },
});

/** Internal/HTTP: resolve store by id for redeem validate. */
export const resolveStoreInternal = internalQuery({
  args: { storeId: v.string() },
  handler: async (ctx: QueryCtx, { storeId }) => {
    const store = await getStoreById(ctx, storeId);
    if (!store) return null;
    return {
      storeId: store.storeId,
      partnerId: store.partnerId,
      slug: store.slug,
      name: store.name,
      status: store.status,
    };
  },
});
