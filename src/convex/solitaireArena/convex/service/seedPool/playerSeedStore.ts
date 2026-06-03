import type { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server";

import type { DataModel, Doc } from "../../_generated/dataModel";

export type PlayerSeedDoc = Doc<"player_seeds">;

type DbReader = GenericDatabaseReader<DataModel>;
type DbWriter = GenericDatabaseWriter<DataModel>;

/**
 * 同 match 幂等：按 matchId 查已绑定 seed（player_seeds 写入时带 matchId）。
 * 多场 match 共用同一 seedId 时返回该 seedId；数据异常（同 match 多 seed）返回 null + conflict。
 */
export async function findBoundSeedIdForMatch(
  db: DbReader,
  poolVersion: string,
  matchId: string
): Promise<{ seedId: string } | { conflict: true } | null> {
  const rows = await db
    .query("player_seeds")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();
  const forPool = rows.filter((r) => r.poolVersion === poolVersion);
  if (forPool.length === 0) return null;
  const seedIds = new Set(forPool.map((r) => r.seedId));
  if (seedIds.size > 1) {
    return { conflict: true };
  }
  return { seedId: forPool[0]!.seedId };
}

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
