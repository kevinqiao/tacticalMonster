import type { QueryCtx, MutationCtx } from "../../_generated/server";
import { resolvePlayerDisplayName } from "../../../../shared/displayName";

/** Batch-load custom display names from portal_players (humans only). */
export async function loadDisplayNameMap(
  ctx: QueryCtx | MutationCtx,
  uids: readonly string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(uids.filter((u) => typeof u === "string" && u.length > 0))];
  for (const uid of unique) {
    const row = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    const name = typeof row?.displayName === "string" ? row.displayName.trim() : "";
    if (name) map.set(uid, name);
  }
  return map;
}

export function resolvePortalPlayerDisplayName(args: {
  uid: string;
  customName?: string | null;
  ssoName?: string | null;
  nameSeed?: string | null;
}): string {
  return resolvePlayerDisplayName({
    uid: args.uid,
    customName: args.customName,
    ssoName: args.ssoName,
    nameSeed: args.nameSeed,
  });
}
