import { v } from "convex/values";

import { internalQuery } from "../_generated/server";
import { PLATFORM_NAMESPACE_PARTNER_ID } from "../service/auth/platformUid";
import { findWebIdentityByPartnerSubject } from "./authIdentityHelpers";

export type WebStoreStaffCandidate = {
  uid: string;
  partnerId: number;
};

/** All Web identities for accountId — store console may sign in without ?partnerId (pid=0). */
export const listWebStoreStaffCandidates = internalQuery({
  args: {
    accountId: v.string(),
    partnerId: v.optional(v.number()),
  },
  handler: async (ctx, { accountId, partnerId }) => {
    const subject = accountId.trim();
    if (!subject) return [] as WebStoreStaffCandidate[];

    const seen = new Set<string>();
    const out: WebStoreStaffCandidate[] = [];

    const push = (uid: string, pid: number) => {
      if (!uid || seen.has(uid)) return;
      seen.add(uid);
      out.push({ uid, partnerId: pid });
    };

    if (partnerId !== undefined && partnerId >= 0) {
      const exact = await findWebIdentityByPartnerSubject(ctx, partnerId, subject);
      if (exact?.uid) {
        push(exact.uid, exact.partnerId ?? partnerId);
      }
    }

    const rows = await ctx.db
      .query("auth_identities")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", "web").eq("subject", subject)
      )
      .collect();

    for (const row of rows) {
      if (!row.uid) continue;
      push(row.uid, row.partnerId ?? PLATFORM_NAMESPACE_PARTNER_ID);
    }

    return out;
  },
});
