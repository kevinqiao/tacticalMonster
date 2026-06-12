import type { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server";

import type { DataModel, Doc } from "../../_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;
type DbWriter = GenericDatabaseWriter<DataModel>;

export type MatchSeedPickDoc = Doc<"match_seed_picks">;

export async function findMatchSeedPickByMatchId(
  db: DbReader,
  matchId: string
): Promise<MatchSeedPickDoc | null> {
  return await db
    .query("match_seed_picks")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .unique();
}

export async function insertMatchSeedPick(
  db: DbWriter,
  args: {
    matchId: string;
    templateId: string;
    seedId: string;
    poolVersion: string;
    uids: string[];
    sessionKey: string;
  }
): Promise<void> {
  const now = Date.now();
  await db.insert("match_seed_picks", {
    matchId: args.matchId,
    templateId: args.templateId,
    seedId: args.seedId,
    poolVersion: args.poolVersion,
    uids: args.uids,
    sessionKey: args.sessionKey,
    pickedAt: now,
  });
}
