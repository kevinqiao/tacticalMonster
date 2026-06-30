import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type IdentityRow = Doc<"auth_identities">;

function subjectScore(subject: string | undefined): number {
  if (!subject) return 0;
  if (!subject.startsWith("0_")) return 3;
  return 1;
}

/** Pick one row when legacy migrations left duplicate uid rows. */
export function pickCanonicalIdentity(rows: IdentityRow[]): IdentityRow | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0];

  return [...rows].sort((a, b) => {
    const subjectDiff = subjectScore(b.subject) - subjectScore(a.subject);
    if (subjectDiff !== 0) return subjectDiff;
    const providerDiff = (b.provider === "web" ? 1 : 0) - (a.provider === "web" ? 1 : 0);
    if (providerDiff !== 0) return providerDiff;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  })[0];
}

export async function listIdentitiesByUid(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<IdentityRow[]> {
  return await ctx.db
    .query("auth_identities")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
}

export async function findIdentityByUid(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<IdentityRow | null> {
  return pickCanonicalIdentity(await listIdentitiesByUid(ctx, uid));
}

export async function findWebIdentityByPartnerSubject(
  ctx: QueryCtx | MutationCtx,
  partnerId: number,
  subject: string
): Promise<IdentityRow | null> {
  return await ctx.db
    .query("auth_identities")
    .withIndex("by_partner_subject", (q) =>
      q.eq("partnerId", partnerId).eq("subject", subject)
    )
    .unique();
}

export async function findWebIdentityBySubject(
  ctx: QueryCtx | MutationCtx,
  subject: string
): Promise<IdentityRow | null> {
  const rows = await ctx.db
    .query("auth_identities")
    .withIndex("by_provider_subject", (q) =>
      q.eq("provider", "web").eq("subject", subject)
    )
    .collect();
  return pickCanonicalIdentity(rows);
}

/** Remove duplicate auth_identities rows that share the same uid. */
export async function dedupeAuthIdentitiesByUid(ctx: MutationCtx): Promise<{
  groups: number;
  removed: number;
}> {
  const all = await ctx.db.query("auth_identities").collect();
  const byUid = new Map<string, IdentityRow[]>();

  for (const row of all) {
    const bucket = byUid.get(row.uid) ?? [];
    bucket.push(row);
    byUid.set(row.uid, bucket);
  }

  let groups = 0;
  let removed = 0;

  for (const rows of byUid.values()) {
    if (rows.length <= 1) continue;
    groups += 1;
    const keep = pickCanonicalIdentity(rows)!;
    for (const row of rows) {
      if (row._id === keep._id) continue;
      await ctx.db.delete(row._id);
      removed += 1;
    }
  }

  return { groups, removed };
}
