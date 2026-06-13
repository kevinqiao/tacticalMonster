import type { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server";

import type { DataModel, Doc } from "../../_generated/dataModel";
import {
  TOWER_STOCHASTIC_POLICY_VERSION,
  type RolloutSummary,
  type RolloutTerminalReason,
  type SeedPoolEntry,
  type TowerSeedTier,
} from "./towerRecordedOpTypes";

type DbReader = GenericDatabaseReader<DataModel>;
type DbWriter = GenericDatabaseWriter<DataModel>;

export type SeedPoolEntryDoc = Doc<"tower_seed_pool_entries">;
export type RolloutSummaryDoc = Doc<"tower_seed_pool_rollout_summaries">;

export type RolloutFilter = {
  minScore?: number;
  maxScore?: number;
  terminalReason?: RolloutTerminalReason;
  completed?: boolean;
};

export function rolloutDocToSummary(doc: RolloutSummaryDoc): RolloutSummary {
  return {
    rolloutIndex: doc.rolloutIndex,
    finalScore: doc.finalScore,
    moves: doc.moves,
    completed: doc.completed,
    terminalReason: doc.terminalReason,
    elapsedSimSeconds: doc.elapsedSimSeconds,
    opCount: doc.opCount,
  };
}

export function entryDocToSeedPoolEntry(
  entry: SeedPoolEntryDoc,
  rolloutSummaries?: RolloutSummary[]
): SeedPoolEntry {
  return {
    seedId: entry.seedId,
    poolVersion: entry.poolVersion,
    tier: entry.tier,
    difficultyScore: entry.difficultyScore,
    metrics: { ...entry.metrics, policyVersion: TOWER_STOCHASTIC_POLICY_VERSION },
    ...(rolloutSummaries?.length ? { rolloutSummaries } : {}),
  };
}

export function matchesRolloutFilter(summary: RolloutSummary, filter: RolloutFilter): boolean {
  if (filter.minScore != null && summary.finalScore < filter.minScore) return false;
  if (filter.maxScore != null && summary.finalScore > filter.maxScore) return false;
  if (filter.terminalReason != null && summary.terminalReason !== filter.terminalReason) {
    return false;
  }
  if (filter.completed != null && summary.completed !== filter.completed) return false;
  return true;
}

export function sortRolloutSummaries(summaries: RolloutSummary[]): RolloutSummary[] {
  return [...summaries].sort((a, b) => a.rolloutIndex - b.rolloutIndex);
}

export async function getActivePoolMeta(db: DbReader) {
  const rows = await db
    .query("tower_seed_pool_meta")
    .withIndex("by_isActive", (q) => q.eq("isActive", true))
    .collect();
  if (rows.length === 0) return null;
  return rows[0]!;
}

export async function getPoolMetaByVersion(db: DbReader, poolVersion: string) {
  return await db
    .query("tower_seed_pool_meta")
    .withIndex("by_poolVersion", (q) => q.eq("poolVersion", poolVersion))
    .unique();
}

export async function getEntryBySeedId(
  db: DbReader,
  poolVersion: string,
  seedId: string
): Promise<SeedPoolEntryDoc | null> {
  return await db
    .query("tower_seed_pool_entries")
    .withIndex("by_poolVersion_and_seedId", (q) =>
      q.eq("poolVersion", poolVersion).eq("seedId", seedId)
    )
    .unique();
}

export async function loadRolloutSummariesForSeed(
  db: DbReader,
  poolVersion: string,
  seedId: string
): Promise<RolloutSummary[]> {
  const rows = await db
    .query("tower_seed_pool_rollout_summaries")
    .withIndex("by_poolVersion_and_seedId", (q) =>
      q.eq("poolVersion", poolVersion).eq("seedId", seedId)
    )
    .collect();
  return sortRolloutSummaries(rows.map(rolloutDocToSummary));
}

export async function loadSeedPoolEntryWithSummaries(
  db: DbReader,
  poolVersion: string,
  seedId: string
): Promise<SeedPoolEntry | null> {
  const entry = await getEntryBySeedId(db, poolVersion, seedId);
  if (!entry) return null;
  const summaries = await loadRolloutSummariesForSeed(db, poolVersion, seedId);
  return entryDocToSeedPoolEntry(entry, summaries);
}

export async function getRolloutSummary(
  db: DbReader,
  poolVersion: string,
  seedId: string,
  rolloutIndex: number
): Promise<RolloutSummary | null> {
  const row = await db
    .query("tower_seed_pool_rollout_summaries")
    .withIndex("by_poolVersion_and_seedId_and_rolloutIndex", (q) =>
      q.eq("poolVersion", poolVersion).eq("seedId", seedId).eq("rolloutIndex", rolloutIndex)
    )
    .unique();
  return row ? rolloutDocToSummary(row) : null;
}

export async function findRolloutsInSeed(
  db: DbReader,
  poolVersion: string,
  seedId: string,
  filter: RolloutFilter = {}
): Promise<RolloutSummary[]> {
  const all = await loadRolloutSummariesForSeed(db, poolVersion, seedId);
  return all.filter((s) => matchesRolloutFilter(s, filter));
}

export type ListSeedEntriesOpts = {
  poolVersion: string;
  tier?: TowerSeedTier;
  minDifficulty?: number;
  maxDifficulty?: number;
  cursor?: string;
  limit?: number;
};

export type ListSeedEntriesResult = {
  entries: Array<{
    seedId: string;
    poolVersion: string;
    tier: TowerSeedTier;
    difficultyScore: number;
    metrics: SeedPoolEntryDoc["metrics"];
  }>;
  continueCursor?: string;
  isDone: boolean;
};

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

export async function listSeedEntries(
  db: DbReader,
  opts: ListSeedEntriesOpts
): Promise<ListSeedEntriesResult> {
  const limit = Math.min(Math.max(1, opts.limit ?? DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
  const cursorSeedId = opts.cursor;

  let q = db.query("tower_seed_pool_entries");
  if (opts.tier != null) {
    const tier = opts.tier;
    const rows = await q
      .withIndex("by_poolVersion_and_tier", (iq) =>
        iq.eq("poolVersion", opts.poolVersion).eq("tier", tier)
      )
      .collect();
    return paginateEntryDocs(rows, cursorSeedId, limit, opts.minDifficulty, opts.maxDifficulty);
  }

  const rows = await q
    .withIndex("by_poolVersion", (iq) => iq.eq("poolVersion", opts.poolVersion))
    .collect();
  return paginateEntryDocs(rows, cursorSeedId, limit, opts.minDifficulty, opts.maxDifficulty);
}

function paginateEntryDocs(
  rows: SeedPoolEntryDoc[],
  cursorSeedId: string | undefined,
  limit: number,
  minDifficulty?: number,
  maxDifficulty?: number
): ListSeedEntriesResult {
  const sorted = [...rows].sort((a, b) => {
    if (a.difficultyScore !== b.difficultyScore) {
      return a.difficultyScore - b.difficultyScore;
    }
    return a.seedId.localeCompare(b.seedId);
  });

  let filtered = sorted;
  if (minDifficulty != null) {
    filtered = filtered.filter((e) => e.difficultyScore >= minDifficulty);
  }
  if (maxDifficulty != null) {
    filtered = filtered.filter((e) => e.difficultyScore <= maxDifficulty);
  }

  let start = 0;
  if (cursorSeedId) {
    const idx = filtered.findIndex((e) => e.seedId === cursorSeedId);
    start = idx >= 0 ? idx + 1 : 0;
  }

  const page = filtered.slice(start, start + limit);
  const last = page[page.length - 1];
  const hasMore = start + limit < filtered.length;

  return {
    entries: page.map((e) => ({
      seedId: e.seedId,
      poolVersion: e.poolVersion,
      tier: e.tier,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
    })),
    continueCursor: hasMore && last ? last.seedId : undefined,
    isDone: !hasMore,
  };
}

export async function pickRandomSeedForTier(
  db: DbReader,
  poolVersion: string,
  tier: TowerSeedTier,
  excludeSeedIds: ReadonlySet<string> = new Set()
): Promise<SeedPoolEntryDoc | null> {
  return pickRandomSeedForTierExcluding(db, poolVersion, tier, excludeSeedIds);
}

function filterEntriesExcludingUsed(
  rows: SeedPoolEntryDoc[],
  excludeSeedIds: ReadonlySet<string>
): SeedPoolEntryDoc[] {
  if (excludeSeedIds.size === 0) return rows;
  return rows.filter((r) => !excludeSeedIds.has(r.seedId));
}

/** Deterministic pick: same sessionKey always yields same seed within tier pool. */
export async function pickDeterministicSeedForTier(
  db: DbReader,
  poolVersion: string,
  tier: TowerSeedTier,
  sessionKey: string,
  excludeSeedIds: ReadonlySet<string> = new Set()
): Promise<SeedPoolEntryDoc | null> {
  const rows = await db
    .query("tower_seed_pool_entries")
    .withIndex("by_poolVersion_and_tier", (q) =>
      q.eq("poolVersion", poolVersion).eq("tier", tier)
    )
    .collect();
  const available = filterEntriesExcludingUsed(rows, excludeSeedIds);
  if (available.length === 0) return null;
  const sorted = [...available].sort((a, b) => a.seedId.localeCompare(b.seedId));
  let hash = 0;
  for (let i = 0; i < sessionKey.length; i++) {
    hash = (hash * 31 + sessionKey.charCodeAt(i)) >>> 0;
  }
  const idx = hash % sorted.length;
  return sorted[idx]!;
}

export async function pickRandomSeedForTierExcluding(
  db: DbReader,
  poolVersion: string,
  tier: TowerSeedTier,
  excludeSeedIds: ReadonlySet<string>
): Promise<SeedPoolEntryDoc | null> {
  const rows = await db
    .query("tower_seed_pool_entries")
    .withIndex("by_poolVersion_and_tier", (q) =>
      q.eq("poolVersion", poolVersion).eq("tier", tier)
    )
    .collect();
  const available = filterEntriesExcludingUsed(rows, excludeSeedIds);
  if (available.length === 0) return null;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx]!;
}

export async function countEntriesForPool(db: DbReader, poolVersion: string): Promise<number> {
  const rows = await db
    .query("tower_seed_pool_entries")
    .withIndex("by_poolVersion", (q) => q.eq("poolVersion", poolVersion))
    .collect();
  return rows.length;
}

export async function computeTierCounts(
  db: DbReader,
  poolVersion: string
): Promise<{ easy: number; medium: number; hard: number }> {
  const rows = await db
    .query("tower_seed_pool_entries")
    .withIndex("by_poolVersion", (q) => q.eq("poolVersion", poolVersion))
    .collect();
  let easy = 0;
  let medium = 0;
  let hard = 0;
  for (const e of rows) {
    if (e.tier === "easy") easy += 1;
    else if (e.tier === "medium") medium += 1;
    else hard += 1;
  }
  return { easy, medium, hard };
}

export async function deleteRolloutsBatch(
  db: DbWriter,
  poolVersion: string,
  batchSize: number
): Promise<{ deleted: number; done: boolean }> {
  const rows = await db
    .query("tower_seed_pool_rollout_summaries")
    .withIndex("by_poolVersion", (q) => q.eq("poolVersion", poolVersion))
    .take(batchSize);
  for (const row of rows) {
    await db.delete(row._id);
  }
  return { deleted: rows.length, done: rows.length < batchSize };
}

export async function deleteEntriesBatch(
  db: DbWriter,
  poolVersion: string,
  batchSize: number
): Promise<{ deleted: number; done: boolean }> {
  const rows = await db
    .query("tower_seed_pool_entries")
    .withIndex("by_poolVersion", (q) => q.eq("poolVersion", poolVersion))
    .take(batchSize);
  for (const row of rows) {
    await db.delete(row._id);
  }
  return { deleted: rows.length, done: rows.length < batchSize };
}

export async function deleteRolloutsForSeedIds(
  db: DbWriter,
  poolVersion: string,
  seedIds: string[]
): Promise<number> {
  let deleted = 0;
  for (const seedId of seedIds) {
    const rows = await db
      .query("tower_seed_pool_rollout_summaries")
      .withIndex("by_poolVersion_and_seedId", (q) =>
        q.eq("poolVersion", poolVersion).eq("seedId", seedId)
      )
      .collect();
    for (const row of rows) {
      await db.delete(row._id);
      deleted += 1;
    }
  }
  return deleted;
}

export async function resolvePoolVersion(
  db: DbReader,
  poolVersion?: string
): Promise<string | null> {
  if (poolVersion) return poolVersion;
  const meta = await getActivePoolMeta(db);
  return meta?.poolVersion ?? null;
}

export async function deactivateAllPools(db: DbWriter): Promise<void> {
  const actives = await db
    .query("tower_seed_pool_meta")
    .withIndex("by_isActive", (q) => q.eq("isActive", true))
    .collect();
  for (const m of actives) {
    await db.patch(m._id, { isActive: false });
  }
}

