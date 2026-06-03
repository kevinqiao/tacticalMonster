import type { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server";

import type { DataModel } from "../../_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;
type DbWriter = GenericDatabaseWriter<DataModel>;

/** 任一真人已用过的 seedId（当前 poolVersion 下并集）。 */
export async function loadUsedSeedIdsForUids(
  db: DbReader,
  poolVersion: string,
  uids: string[]
): Promise<Set<string>> {
  const used = new Set<string>();
  const uniqueUids = [...new Set(uids.filter((u) => u.length > 0))];
  for (const uid of uniqueUids) {
    const rows = await db
      .query("player_seeds")
      .withIndex("by_uid_and_poolVersion", (q) =>
        q.eq("uid", uid).eq("poolVersion", poolVersion)
      )
      .collect();
    for (const row of rows) {
      used.add(row.seedId);
    }
  }
  return used;
}

export async function recordPlayerSeedsForMatch(
  db: DbWriter,
  args: {
    uids: string[];
    seedId: string;
    poolVersion: string;
    matchId?: string;
  }
): Promise<void> {
  const now = Date.now();
  const uniqueUids = [...new Set(args.uids.filter((u) => u.length > 0))];
  for (const uid of uniqueUids) {
    const existing = await db
      .query("player_seeds")
      .withIndex("by_uid_poolVersion_and_seedId", (q) =>
        q.eq("uid", uid).eq("poolVersion", args.poolVersion).eq("seedId", args.seedId)
      )
      .unique();
    if (existing) continue;
    await db.insert("player_seeds", {
      uid,
      seedId: args.seedId,
      poolVersion: args.poolVersion,
      ...(args.matchId ? { matchId: args.matchId } : {}),
      usedAt: now,
    });
  }
}
