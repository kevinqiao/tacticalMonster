import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { PortalQuotaScope } from "../../data/portalQuotaScope";
import {
  entryUsageBucketForScope,
  usageRowMatchesBucket,
  type PlayEntryContext,
} from "./portalEntryUsageScope";

type EntryMode = "solo" | "multi";

export async function readAdEntryUsedToday(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  dayKey: string,
  mode: EntryMode,
  entryCtx?: PlayEntryContext | null,
  quotaScope: PortalQuotaScope = "mode"
): Promise<number> {
  const bucket = entryUsageBucketForScope(quotaScope, entryCtx);
  const rows = await ctx.db
    .query("portal_ad_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", uid).eq("dayKey", dayKey).eq("mode", mode)
    )
    .collect();
  const row = rows.find((r) => usageRowMatchesBucket(r, bucket));
  return Math.max(0, Math.floor(row?.usedCount ?? 0));
}

export async function bumpAdEntryUsedToday(
  ctx: MutationCtx,
  args: {
    uid: string;
    dayKey: string;
    mode: EntryMode;
    now: number;
    entryCtx?: PlayEntryContext | null;
    quotaScope: PortalQuotaScope;
  }
): Promise<void> {
  const bucket = entryUsageBucketForScope(args.quotaScope, args.entryCtx);
  const rows = await ctx.db
    .query("portal_ad_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", args.uid).eq("dayKey", args.dayKey).eq("mode", args.mode)
    )
    .collect();
  const usage = rows.find((r) => usageRowMatchesBucket(r, bucket));
  if (usage) {
    await ctx.db.patch(usage._id, {
      usedCount: usage.usedCount + 1,
      updatedAt: args.now,
    });
    return;
  }
  await ctx.db.insert("portal_ad_entry_daily_usage", {
    uid: args.uid,
    dayKey: args.dayKey,
    mode: args.mode,
    ...(bucket.lobbyId ? { lobbyId: bucket.lobbyId } : {}),
    ...(bucket.tournamentId ? { tournamentId: bucket.tournamentId } : {}),
    usedCount: 1,
    createdAt: args.now,
    updatedAt: args.now,
  });
}

/** Undo one ad-entry usage bump (queue abandoned before table open). */
export async function decrementAdEntryUsedToday(
  ctx: MutationCtx,
  args: {
    uid: string;
    dayKey: string;
    mode: EntryMode;
    now: number;
    entryCtx?: PlayEntryContext | null;
    quotaScope: PortalQuotaScope;
  }
): Promise<void> {
  const bucket = entryUsageBucketForScope(args.quotaScope, args.entryCtx);
  const rows = await ctx.db
    .query("portal_ad_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", args.uid).eq("dayKey", args.dayKey).eq("mode", args.mode)
    )
    .collect();
  const usage = rows.find((r) => usageRowMatchesBucket(r, bucket));
  if (!usage) return;
  await ctx.db.patch(usage._id, {
    usedCount: Math.max(0, usage.usedCount - 1),
    updatedAt: args.now,
  });
}

export async function readTicketEntryUsedToday(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  dayKey: string,
  mode: EntryMode,
  entryCtx?: PlayEntryContext | null,
  quotaScope: PortalQuotaScope = "mode"
): Promise<number> {
  const bucket = entryUsageBucketForScope(quotaScope, entryCtx);
  const rows = await ctx.db
    .query("portal_ticket_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", uid).eq("dayKey", dayKey).eq("mode", mode)
    )
    .collect();
  const row = rows.find((r) => usageRowMatchesBucket(r, bucket));
  return Math.max(0, Math.floor(row?.usedCount ?? 0));
}

export async function bumpTicketEntryUsedToday(
  ctx: MutationCtx,
  args: {
    uid: string;
    dayKey: string;
    mode: EntryMode;
    now: number;
    entryCtx?: PlayEntryContext | null;
    quotaScope: PortalQuotaScope;
  }
): Promise<void> {
  const bucket = entryUsageBucketForScope(args.quotaScope, args.entryCtx);
  const rows = await ctx.db
    .query("portal_ticket_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", args.uid).eq("dayKey", args.dayKey).eq("mode", args.mode)
    )
    .collect();
  const usage = rows.find((r) => usageRowMatchesBucket(r, bucket));
  if (usage) {
    await ctx.db.patch(usage._id, {
      usedCount: usage.usedCount + 1,
      updatedAt: args.now,
    });
    return;
  }
  await ctx.db.insert("portal_ticket_entry_daily_usage", {
    uid: args.uid,
    dayKey: args.dayKey,
    mode: args.mode,
    ...(bucket.lobbyId ? { lobbyId: bucket.lobbyId } : {}),
    ...(bucket.tournamentId ? { tournamentId: bucket.tournamentId } : {}),
    usedCount: 1,
    createdAt: args.now,
    updatedAt: args.now,
  });
}

/** Undo one ticket-entry usage bump (queue abandoned before table open). */
export async function decrementTicketEntryUsedToday(
  ctx: MutationCtx,
  args: {
    uid: string;
    dayKey: string;
    mode: EntryMode;
    now: number;
    entryCtx?: PlayEntryContext | null;
    quotaScope: PortalQuotaScope;
  }
): Promise<void> {
  const bucket = entryUsageBucketForScope(args.quotaScope, args.entryCtx);
  const rows = await ctx.db
    .query("portal_ticket_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", args.uid).eq("dayKey", args.dayKey).eq("mode", args.mode)
    )
    .collect();
  const usage = rows.find((r) => usageRowMatchesBucket(r, bucket));
  if (!usage) return;
  await ctx.db.patch(usage._id, {
    usedCount: Math.max(0, usage.usedCount - 1),
    updatedAt: args.now,
  });
}
