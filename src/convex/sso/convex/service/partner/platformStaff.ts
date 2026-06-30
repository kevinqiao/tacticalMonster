import type { MutationCtx, QueryCtx } from "../../_generated/server";

export type PlatformStaffRole = "owner" | "admin" | "viewer";

const ROLE_RANK: Record<PlatformStaffRole, number> = {
  viewer: 1,
  admin: 2,
  owner: 3,
};

type AuthedCtx = { user: { uid: string } };

function legacyOperatorUids(): string[] {
  const raw = process.env.PLATFORM_OPERATOR_UIDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getPlatformStaffRow(ctx: QueryCtx | MutationCtx, uid: string) {
  return await ctx.db
    .query("platform_staff")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
}

export async function hasAnyPlatformStaff(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const row = await ctx.db.query("platform_staff").first();
  return row !== null;
}

export async function requirePlatformStaff(
  ctx: (QueryCtx | MutationCtx) & AuthedCtx,
  minRole: PlatformStaffRole = "viewer"
) {
  const row = await getPlatformStaffRow(ctx, ctx.user.uid);
  if (row) {
    if (ROLE_RANK[row.role as PlatformStaffRole] < ROLE_RANK[minRole]) {
      throw new Error("forbidden");
    }
    return row;
  }
  if (legacyOperatorUids().includes(ctx.user.uid)) {
    return {
      _id: undefined,
      _creationTime: 0,
      uid: ctx.user.uid,
      role: "owner" as PlatformStaffRole,
      createdAt: 0,
    };
  }
  throw new Error("forbidden");
}

export async function listPlatformStaffRows(ctx: QueryCtx | MutationCtx) {
  return await ctx.db.query("platform_staff").collect();
}
