import type { QueryCtx, MutationCtx } from "../../_generated/server";

import { findIdentityByUid } from "../../dao/authIdentityHelpers";

export type PartnerRole = "owner" | "admin" | "developer" | "viewer";

const ROLE_RANK: Record<PartnerRole, number> = {
  viewer: 1,
  developer: 2,
  admin: 3,
  owner: 4,
};

type AuthedCtx = { user: { uid: string } };

export async function getPartnerStaffRow(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  uid: string
) {
  return await ctx.db
    .query("partner_staff")
    .withIndex("by_partner_uid", (q) => q.eq("partnerId", partnerId).eq("uid", uid))
    .unique();
}

/** Direct row, or membership under another namespaced uid for the same web accountId. */
export async function findPartnerStaffForAccountUid(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  uid: string
) {
  const direct = await getPartnerStaffRow(ctx, partnerId, uid);
  if (direct) return direct;

  const identity = await findIdentityByUid(ctx, uid);
  if (identity?.provider !== "web" || !identity.subject) return null;

  const siblings = await ctx.db
    .query("auth_identities")
    .withIndex("by_provider_subject", (q) =>
      q.eq("provider", "web").eq("subject", identity.subject)
    )
    .collect();

  for (const sib of siblings) {
    if (!sib.uid || sib.uid === uid) continue;
    const row = await getPartnerStaffRow(ctx, partnerId, sib.uid);
    if (row) return row;
  }
  return null;
}

export async function requirePartnerStaff(
  ctx: (QueryCtx | MutationCtx) & AuthedCtx,
  partnerId: number,
  minRole: PartnerRole = "viewer"
) {
  const uid = ctx.user.uid;
  const row = await findPartnerStaffForAccountUid(ctx, partnerId, uid);
  if (!row || ROLE_RANK[row.role as PartnerRole] < ROLE_RANK[minRole]) {
    throw new Error("forbidden");
  }
  return row;
}

export async function getPartnerByPid(ctx: QueryCtx, partnerId: number) {
  return await ctx.db
    .query("partner")
    .withIndex("by_pid", (q) => q.eq("pid", partnerId))
    .unique();
}

export async function nextPartnerId(ctx: QueryCtx | MutationCtx): Promise<number> {
  const rows = await ctx.db.query("partner").collect();
  let max = 0;
  for (const row of rows) {
    if (row.pid > max) max = row.pid;
  }
  return max + 1;
}

export function expandAuthChannels(
  channelIds: number[],
  channels: Array<{ cid: number; provider: string } | null>
) {
  const out: { cid: number; provider: string }[] = [];
  for (const cid of channelIds) {
    if (cid === 0) {
      out.push({ cid: 0, provider: "web" });
      continue;
    }
    const row = channels.find((c) => c?.cid === cid);
    if (row) out.push({ cid: row.cid, provider: row.provider });
  }
  return out;
}
