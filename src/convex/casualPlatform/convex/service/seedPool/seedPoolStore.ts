import type { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server";

import type { DataModel, Doc } from "../../_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;
type DbWriter = GenericDatabaseWriter<DataModel>;

export type CatalogGameType = Doc<"seed_pool_entries">["gameType"];
export type CatalogSeedTier = Doc<"seed_pool_entries">["tier"];

export type RolloutSummary = {
  rolloutIndex: number;
  finalScore: number;
  moves: number;
  completed: boolean;
  terminalReason: Doc<"seed_pool_rollout_summaries">["terminalReason"];
  elapsedSimSeconds: number;
  opCount: number;
};

export type SeedPoolEntryDoc = Doc<"seed_pool_entries">;
export type RolloutSummaryDoc = Doc<"seed_pool_rollout_summaries">;

export type RolloutFilter = {
  minScore?: number;
  maxScore?: number;
};

export function matchesRolloutFilter(summary: RolloutSummary, filter: RolloutFilter): boolean {
  if (filter.minScore != null && summary.finalScore < filter.minScore) return false;
  if (filter.maxScore != null && summary.finalScore > filter.maxScore) return false;
  return true;
}

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

export async function getActivePoolMeta(db: DbReader, gameType: CatalogGameType) {
  const rows = await db
    .query("seed_pool_meta")
    .withIndex("by_gameType_and_isActive", (q) =>
      q.eq("gameType", gameType).eq("isActive", true)
    )
    .collect();
  return rows[0] ?? null;
}

export async function resolvePoolVersion(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion?: string
): Promise<string | null> {
  if (poolVersion) return poolVersion;
  const meta = await getActivePoolMeta(db, gameType);
  return meta?.poolVersion ?? null;
}

export async function getEntryBySeedId(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string,
  seedId: string
): Promise<SeedPoolEntryDoc | null> {
  return await db
    .query("seed_pool_entries")
    .withIndex("by_gameType_poolVersion_seedId", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion).eq("seedId", seedId)
    )
    .unique();
}

export async function loadRolloutSummariesForSeed(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string,
  seedId: string
): Promise<RolloutSummary[]> {
  const rows = await db
    .query("seed_pool_rollout_summaries")
    .withIndex("by_gameType_poolVersion_seedId", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion).eq("seedId", seedId)
    )
    .collect();
  return [...rows.map(rolloutDocToSummary)].sort((a, b) => a.rolloutIndex - b.rolloutIndex);
}

export async function findRolloutsInSeed(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string,
  seedId: string,
  filter: RolloutFilter = {}
): Promise<RolloutSummary[]> {
  const all = await loadRolloutSummariesForSeed(db, gameType, poolVersion, seedId);
  return all.filter((s) => matchesRolloutFilter(s, filter));
}

export async function loadUsedSeedIdsForUids(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string,
  uids: string[]
): Promise<Set<string>> {
  const used = new Set<string>();
  for (const uid of [...new Set(uids.filter(Boolean))]) {
    const rows = await db
      .query("player_seeds")
      .withIndex("by_gameType_uid_poolVersion", (q) =>
        q.eq("gameType", gameType).eq("uid", uid).eq("poolVersion", poolVersion)
      )
      .collect();
    for (const row of rows) used.add(row.seedId);
  }
  return used;
}

export async function pickDeterministicSeedForTier(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string,
  tier: CatalogSeedTier,
  sessionKey: string,
  excludeSeedIds: ReadonlySet<string> = new Set()
): Promise<SeedPoolEntryDoc | null> {
  const rows = await db
    .query("seed_pool_entries")
    .withIndex("by_gameType_poolVersion_tier", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion).eq("tier", tier)
    )
    .collect();
  const available = rows.filter((r) => !excludeSeedIds.has(r.seedId));
  if (available.length === 0) return null;
  const sorted = [...available].sort((a, b) => a.seedId.localeCompare(b.seedId));
  let hash = 0;
  for (let i = 0; i < sessionKey.length; i++) {
    hash = (hash * 31 + sessionKey.charCodeAt(i)) >>> 0;
  }
  return sorted[hash % sorted.length]!;
}

export async function findMatchSeedPickByMatchId(
  db: DbReader,
  gameType: CatalogGameType,
  matchId: string
) {
  return await db
    .query("match_seed_picks")
    .withIndex("by_gameType_and_matchId", (q) =>
      q.eq("gameType", gameType).eq("matchId", matchId)
    )
    .unique();
}

export async function insertMatchSeedPick(
  db: DbWriter,
  args: {
    gameType: CatalogGameType;
    matchId: string;
    seedId: string;
    poolVersion: string;
    uids: string[];
    sessionKey: string;
  }
): Promise<void> {
  await db.insert("match_seed_picks", {
    ...args,
    pickedAt: Date.now(),
  });
}

export async function recordPlayerSeedsForMatch(
  db: DbWriter,
  args: {
    gameType: CatalogGameType;
    uids: string[];
    seedId: string;
    poolVersion: string;
    matchId?: string;
  }
): Promise<void> {
  const now = Date.now();
  for (const uid of [...new Set(args.uids.filter(Boolean))]) {
    const existing = await db
      .query("player_seeds")
      .withIndex("by_gameType_uid_poolVersion_seedId", (q) =>
        q
          .eq("gameType", args.gameType)
          .eq("uid", uid)
          .eq("poolVersion", args.poolVersion)
          .eq("seedId", args.seedId)
      )
      .unique();
    if (existing) continue;
    await db.insert("player_seeds", {
      gameType: args.gameType,
      uid,
      seedId: args.seedId,
      poolVersion: args.poolVersion,
      ...(args.matchId ? { matchId: args.matchId } : {}),
      usedAt: now,
    });
  }
}

function hashMix(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleRolloutsByKey<T>(items: T[], key: string): T[] {
  const out = [...items];
  let state = hashMix(key);
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildPickOkPayload(entry: SeedPoolEntryDoc, idempotent?: boolean) {
  return {
    ok: true as const,
    ...(idempotent ? { idempotent: true as const } : {}),
    seedId: entry.seedId,
    poolVersion: entry.poolVersion,
    tier: entry.tier,
    difficultyScore: entry.difficultyScore,
    metrics: {
      scoreQuantiles: entry.metrics.scoreQuantiles,
      rolloutCount: entry.metrics.rolloutCount,
      matchTimeLimitSec: undefined as number | undefined,
    },
  };
}

export async function getPoolMetaByVersion(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string
) {
  return await db
    .query("seed_pool_meta")
    .withIndex("by_gameType_and_poolVersion", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion)
    )
    .unique();
}

export async function deactivateAllPoolsForGame(db: DbWriter, gameType: CatalogGameType) {
  const actives = await db
    .query("seed_pool_meta")
    .withIndex("by_gameType_and_isActive", (q) =>
      q.eq("gameType", gameType).eq("isActive", true)
    )
    .collect();
  for (const m of actives) {
    await db.patch(m._id, { isActive: false });
  }
}

export async function countEntriesForPool(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string
): Promise<number> {
  const rows = await db
    .query("seed_pool_entries")
    .withIndex("by_gameType_and_poolVersion", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion)
    )
    .collect();
  return rows.length;
}

export async function computeTierCounts(
  db: DbReader,
  gameType: CatalogGameType,
  poolVersion: string
): Promise<{ easy: number; medium: number; hard: number }> {
  const rows = await db
    .query("seed_pool_entries")
    .withIndex("by_gameType_and_poolVersion", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion)
    )
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
  gameType: CatalogGameType,
  poolVersion: string,
  batchSize: number
): Promise<{ deleted: number; done: boolean }> {
  const rows = await db
    .query("seed_pool_rollout_summaries")
    .withIndex("by_gameType_and_poolVersion", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion)
    )
    .take(batchSize);
  for (const row of rows) {
    await db.delete(row._id);
  }
  return { deleted: rows.length, done: rows.length < batchSize };
}

export async function deleteEntriesBatch(
  db: DbWriter,
  gameType: CatalogGameType,
  poolVersion: string,
  batchSize: number
): Promise<{ deleted: number; done: boolean }> {
  const rows = await db
    .query("seed_pool_entries")
    .withIndex("by_gameType_and_poolVersion", (q) =>
      q.eq("gameType", gameType).eq("poolVersion", poolVersion)
    )
    .take(batchSize);
  for (const row of rows) {
    await db.delete(row._id);
  }
  return { deleted: rows.length, done: rows.length < batchSize };
}

export type ListSeedEntriesOpts = {
  gameType: CatalogGameType;
  poolVersion: string;
  tier?: CatalogSeedTier;
  minDifficulty?: number;
  maxDifficulty?: number;
  cursor?: string;
  limit?: number;
};

export type ListSeedEntriesResult = {
  entries: Array<{
    seedId: string;
    poolVersion: string;
    tier: CatalogSeedTier;
    difficultyScore: number;
    metrics: SeedPoolEntryDoc["metrics"];
  }>;
  continueCursor?: string;
  isDone: boolean;
};

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

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

export async function listSeedEntries(
  db: DbReader,
  opts: ListSeedEntriesOpts
): Promise<ListSeedEntriesResult> {
  const limit = Math.min(Math.max(1, opts.limit ?? DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
  const cursorSeedId = opts.cursor;

  if (opts.tier != null) {
    const rows = await db
      .query("seed_pool_entries")
      .withIndex("by_gameType_poolVersion_tier", (iq) =>
        iq
          .eq("gameType", opts.gameType)
          .eq("poolVersion", opts.poolVersion)
          .eq("tier", opts.tier!)
      )
      .collect();
    return paginateEntryDocs(rows, cursorSeedId, limit, opts.minDifficulty, opts.maxDifficulty);
  }

  const rows = await db
    .query("seed_pool_entries")
    .withIndex("by_gameType_and_poolVersion", (iq) =>
      iq.eq("gameType", opts.gameType).eq("poolVersion", opts.poolVersion)
    )
    .collect();
  return paginateEntryDocs(rows, cursorSeedId, limit, opts.minDifficulty, opts.maxDifficulty);
}
