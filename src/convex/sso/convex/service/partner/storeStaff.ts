import type { MutationCtx, QueryCtx } from "../../_generated/server";

export type StoreStaffRole = "owner" | "staff";

const ROLE_RANK: Record<StoreStaffRole, number> = {
  staff: 1,
  owner: 2,
};

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function normalizeStoreSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function assertValidStoreSlug(slug: string) {
  if (!slug || !SLUG_RE.test(slug)) throw new Error("slug_invalid");
}

export function newStoreId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getStoreById(ctx: QueryCtx | MutationCtx, storeId: string) {
  return await ctx.db
    .query("store")
    .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
    .unique();
}

export async function getStoreBySlug(ctx: QueryCtx | MutationCtx, slug: string) {
  return await ctx.db
    .query("store")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeStoreSlug(slug)))
    .unique();
}

export async function getStoreStaffRow(
  ctx: QueryCtx | MutationCtx,
  storeId: string,
  uid: string
) {
  return await ctx.db
    .query("store_staff")
    .withIndex("by_store_uid", (q) => q.eq("storeId", storeId).eq("uid", uid))
    .unique();
}

/** Store staff only — redeem / void / store team. */
export async function requireStoreStaff(
  ctx: QueryCtx | MutationCtx,
  args: {
    storeId: string;
    uid: string;
    minRole?: StoreStaffRole;
  }
) {
  const row = await getStoreStaffRow(ctx, args.storeId, args.uid);
  if (!row) {
    throw new Error("forbidden");
  }
  const minRole = args.minRole ?? "staff";
  if (ROLE_RANK[row.role as StoreStaffRole] < ROLE_RANK[minRole]) {
    throw new Error("forbidden");
  }
  return row;
}
