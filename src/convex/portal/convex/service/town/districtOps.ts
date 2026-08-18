import {
  DISTRICTS,
  DISTRICT_TYPE_CHOICES,
  type DistrictId,
  type ZoneTypeId,
  districtDevelopCost,
  districtRebrandCost,
  districtLevelTotal,
  passivePerHour,
  prosperityScoreFromDistricts,
  upgradeCost,
  ZONE_GLOBAL,
  ZONE_TYPES,
  townLevyTick,
} from "./zoneEconomyConfig";
import { ensureTownProgress, readTownProgress, type TownProgressRow } from "./townProgressStore";
import { applyWalletDelta, getPlayerWalletBalances } from "../economy/portalWalletDao";
import { coinTableBonusActive, resolveCoinGamesThisWeek } from "./coinWeekProgress";
import { entertainmentBonusActive, resolveShowdownGamesThisWeek } from "./showdownWeekProgress";
import type { TownScopedCtx } from "./portalTownService";
import { logTownEvent } from "./townTelemetry";
import { PROSPERITY_MILESTONES } from "./prosperityMilestonesConfig";
import { flushTermPassOnRollover } from "./termPass";

export type TownZoneRow = {
  _id: string;
  uid: string;
  slotId: string;
  districtId: string;
  zoneType?: string;
  level: number;
  lastCollectedAt?: number;
  updatedAt: number;
};

export type DistrictOp = {
  type?: ZoneTypeId;
  level: number;
  lastCollectedAt?: number;
  rebranded?: boolean;
};

export type DistrictOpsMap = Record<string, DistrictOp>;

type ZoneCtx = TownScopedCtx;

const EMPTY_OPS: DistrictOpsMap = {
  D0: { level: 0 },
  D1: { level: 0 },
};

export function emptyDistrictOps(): DistrictOpsMap {
  return {
    D0: { level: 0 },
    D1: { level: 0 },
  };
}

export function isDistrictDeveloped(op: DistrictOp | undefined): boolean {
  return Boolean(op && op.level > 0 && op.type);
}

export function migrateLotsToDistrictOps(zones: TownZoneRow[]): DistrictOpsMap {
  const result = emptyDistrictOps();
  for (const districtId of ["D0", "D1"] as DistrictId[]) {
    const developed = zones.filter((z) => {
      if (z.districtId !== districtId || z.level < 1 || !z.zoneType) return false;
      if (z.zoneType === "civic") return false;
      const slot = DISTRICTS[districtId].slots.find((s) => s.slotId === z.slotId);
      return slot?.developable !== false;
    });
    if (developed.length === 0) continue;
    const counts = new Map<string, number>();
    let maxLevel = 0;
    let oldest: number | undefined;
    for (const z of developed) {
      counts.set(z.zoneType!, (counts.get(z.zoneType!) ?? 0) + 1);
      maxLevel = Math.max(maxLevel, z.level);
      if (z.lastCollectedAt != null) {
        oldest = oldest == null ? z.lastCollectedAt : Math.min(oldest, z.lastCollectedAt);
      }
    }
    let majority = developed[0]!.zoneType as ZoneTypeId;
    let best = 0;
    for (const [type, n] of counts) {
      if (n > best) {
        majority = type as ZoneTypeId;
        best = n;
      }
    }
    result[districtId] = {
      type: majority,
      level: Math.min(ZONE_GLOBAL.maxZoneLevel, Math.max(developed.length, maxLevel)),
      lastCollectedAt: oldest,
    };
  }
  return result;
}

export function resolveDistrictOps(
  progress: TownProgressRow | null,
  zones: TownZoneRow[] = []
): DistrictOpsMap {
  const stored = progress?.districtOps;
  if (stored && Object.keys(stored).length > 0) {
    const asOp = (row?: { type?: string; level: number; lastCollectedAt?: number; rebranded?: boolean }): DistrictOp => ({
      type: row?.type as ZoneTypeId | undefined,
      level: row?.level ?? 0,
      lastCollectedAt: row?.lastCollectedAt,
      rebranded: row?.rebranded,
    });
    return {
      D0: asOp(stored.D0),
      D1: asOp(stored.D1),
    };
  }
  if (zones.length > 0) return migrateLotsToDistrictOps(zones);
  return emptyDistrictOps();
}

export async function ensureDistrictOps(ctx: ZoneCtx): Promise<{
  progress: TownProgressRow;
  ops: DistrictOpsMap;
}> {
  const now = Date.now();
  const progress = await ensureTownProgress(ctx);
  const flushed = await flushTermPassOnRollover(ctx, progress);
  const current = flushed ?? progress;
  if (current.districtOps && Object.keys(current.districtOps).length > 0) {
    return { progress: current, ops: resolveDistrictOps(current) };
  }
  const zones: TownZoneRow[] = await ctx.db
    .query("town_zones")
    .withIndex("by_uid_townId", (q: any) => q.eq("uid", ctx.uid).eq("townId", ctx.townId))
    .collect();
  const ops = migrateLotsToDistrictOps(zones);
  await ctx.db.patch(current._id, {
    districtOps: ops,
    updatedAt: now,
  });
  return { progress: { ...current, districtOps: ops, updatedAt: now }, ops };
}

export function districtOpView(
  districtId: DistrictId,
  op: DistrictOp,
  unlocked: boolean,
  showdownGamesThisWeek = 0,
  coinGamesThisWeek = 0
) {
  const cfg = DISTRICTS[districtId];
  const developed = isDistrictDeveloped(op);
  const zoneType = developed ? op.type : undefined;
  const ratePerHour =
    developed && zoneType
      ? passivePerHour({
          zoneType,
          level: op.level,
          districtId,
          showdownGamesThisWeek,
          coinGamesThisWeek,
        })
      : 0;
  return {
    districtId,
    label: cfg.label,
    labelZh: cfg.labelZh,
    unlocked,
    type: zoneType ?? null,
    typeLabel: zoneType ? ZONE_TYPES[zoneType].label : null,
    typeLabelZh: zoneType ? ZONE_TYPES[zoneType].labelZh : null,
    level: op.level,
    rebranded: Boolean(op.rebranded),
    choices: cfg.typeChoices,
    developCost: developed ? null : cfg.developCost,
    upgradeCost:
      developed && zoneType && op.level < ZONE_GLOBAL.maxZoneLevel
        ? upgradeCost(zoneType, op.level)
        : null,
    rebrandCost: developed && !op.rebranded ? cfg.rebrandCost : null,
    maxLevel: ZONE_GLOBAL.maxZoneLevel,
    passivePerHour: ratePerHour,
    entertainmentBonusActive:
      zoneType === "entertainment" && developed
        ? entertainmentBonusActive(showdownGamesThisWeek)
        : undefined,
    coinTableBonusActive:
      zoneType === "commercial" && developed ? coinTableBonusActive(coinGamesThisWeek) : undefined,
    gameType: cfg.gameType ?? null,
  };
}

export async function recomputeProsperityFromOps(
  ctx: ZoneCtx,
  ops: DistrictOpsMap
): Promise<number> {
  const active = (["D0", "D1"] as DistrictId[])
    .map((id) => {
      const op = ops[id];
      if (!isDistrictDeveloped(op) || !op?.type) return null;
      return { zoneType: op.type, level: op.level, districtId: id };
    })
    .filter((row): row is { zoneType: ZoneTypeId; level: number; districtId: DistrictId } =>
      Boolean(row)
    );
  const score = prosperityScoreFromDistricts(active);
  const progress = await readTownProgress(ctx);
  if (progress) {
    const prevScore = progress.prosperityScore ?? 0;
    const now = Date.now();
    await ctx.db.patch(progress._id, {
      prosperityScore: score,
      updatedAt: now,
    });
    for (const milestone of PROSPERITY_MILESTONES) {
      if (score >= milestone.threshold && prevScore < milestone.threshold) {
        await logTownEvent(ctx, "prosperity_milestone", {
          milestoneId: milestone.id,
          score,
          threshold: milestone.threshold,
        });
      }
    }
  }
  return score;
}

export async function computeCollectableFromOps(
  ctx: ZoneCtx,
  ops: DistrictOpsMap,
  showdownGamesThisWeek = 0,
  now = Date.now(),
  coinGamesThisWeek = 0
): Promise<{
  raw: number;
  capped: number;
  ratePerHour: number;
  payout: number;
  remainingMs: number;
  readyAt: number;
  active: boolean;
  cappedByWeekly: boolean;
}> {
  let ratePerHour = 0;
  let oldest = Number.POSITIVE_INFINITY;
  for (const districtId of ["D0", "D1"] as DistrictId[]) {
    const op = ops[districtId];
    if (!isDistrictDeveloped(op) || !op?.type) continue;
    ratePerHour += passivePerHour({
      zoneType: op.type,
      level: op.level,
      districtId,
      showdownGamesThisWeek,
      coinGamesThisWeek,
    });
    if (op.lastCollectedAt != null) oldest = Math.min(oldest, op.lastCollectedAt);
  }
  const startedAt = Number.isFinite(oldest) ? oldest : null;
  const tick = townLevyTick({ passivePerHourTotal: ratePerHour, startedAt, nowMs: now });
  if (!tick.active) {
    return {
      raw: 0,
      capped: 0,
      ratePerHour: 0,
      payout: 0,
      remainingMs: tick.remainingMs,
      readyAt: tick.readyAt,
      active: false,
      cappedByWeekly: false,
    };
  }
  return {
    raw: tick.collectable,
    capped: tick.collectable,
    ratePerHour,
    payout: tick.payout,
    remainingMs: tick.remainingMs,
    readyAt: tick.readyAt,
    active: true,
    cappedByWeekly: false,
  };
}

export async function developDistrict(
  ctx: ZoneCtx,
  districtId: DistrictId,
  zoneType: ZoneTypeId
): Promise<{ ok: true; ops: DistrictOpsMap; coins: number } | { ok: false; error: string }> {
  if (!DISTRICTS[districtId]) return { ok: false, error: "INVALID_DISTRICT" };
  if (!DISTRICT_TYPE_CHOICES.includes(zoneType) || !DISTRICTS[districtId].typeChoices.includes(zoneType)) {
    return { ok: false, error: "INVALID_ZONE_TYPE" };
  }
  const { progress, ops } = await ensureDistrictOps(ctx);
  if (!progress.unlockedDistricts.includes(districtId)) {
    return { ok: false, error: "DISTRICT_LOCKED" };
  }
  if (isDistrictDeveloped(ops[districtId])) return { ok: false, error: "ALREADY_DEVELOPED" };

  const cost = districtDevelopCost(districtId);
  const debit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: -cost,
    reason: "town_district_develop",
  });
  if (!debit.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

  const now = Date.now();
  const next: DistrictOpsMap = {
    ...ops,
    [districtId]: { type: zoneType, level: 1, lastCollectedAt: now },
  };
  await ctx.db.patch(progress._id, { districtOps: next, updatedAt: now });
  await recomputeProsperityFromOps(ctx, next);
  await logTownEvent(ctx, "district_develop", { districtId, zoneType, cost });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  return { ok: true, ops: next, coins: wallet.coins };
}

export async function upgradeDistrict(
  ctx: ZoneCtx,
  districtId: DistrictId
): Promise<{ ok: true; ops: DistrictOpsMap; coins: number } | { ok: false; error: string }> {
  if (!DISTRICTS[districtId]) return { ok: false, error: "INVALID_DISTRICT" };
  const { progress, ops } = await ensureDistrictOps(ctx);
  const op = ops[districtId];
  if (!isDistrictDeveloped(op) || !op?.type) return { ok: false, error: "NOT_DEVELOPED" };
  if (!progress.unlockedDistricts.includes(districtId)) return { ok: false, error: "DISTRICT_LOCKED" };
  if (op.level >= ZONE_GLOBAL.maxZoneLevel) return { ok: false, error: "MAX_LEVEL" };

  const cost = upgradeCost(op.type, op.level);
  if (cost <= 0) return { ok: false, error: "NOT_UPGRADABLE" };
  const debit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: -cost,
    reason: "town_district_upgrade",
  });
  if (!debit.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

  const now = Date.now();
  const next: DistrictOpsMap = {
    ...ops,
    [districtId]: { ...op, level: op.level + 1 },
  };
  await ctx.db.patch(progress._id, { districtOps: next, updatedAt: now });
  await recomputeProsperityFromOps(ctx, next);
  await logTownEvent(ctx, "district_upgrade", { districtId, level: op.level + 1, cost });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  return { ok: true, ops: next, coins: wallet.coins };
}

export async function rebrandDistrict(
  ctx: ZoneCtx,
  districtId: DistrictId,
  zoneType: ZoneTypeId
): Promise<{ ok: true; ops: DistrictOpsMap; coins: number } | { ok: false; error: string }> {
  if (!DISTRICTS[districtId]) return { ok: false, error: "INVALID_DISTRICT" };
  if (!DISTRICT_TYPE_CHOICES.includes(zoneType) || !DISTRICTS[districtId].typeChoices.includes(zoneType)) {
    return { ok: false, error: "INVALID_ZONE_TYPE" };
  }
  const { progress, ops } = await ensureDistrictOps(ctx);
  const op = ops[districtId];
  if (!isDistrictDeveloped(op) || !op?.type) return { ok: false, error: "NOT_DEVELOPED" };
  if (!progress.unlockedDistricts.includes(districtId)) return { ok: false, error: "DISTRICT_LOCKED" };
  if (op.rebranded) return { ok: false, error: "ALREADY_REBRANDED" };
  if (op.type === zoneType) return { ok: false, error: "SAME_TYPE" };

  const cost = districtRebrandCost(districtId);
  const debit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: -cost,
    reason: "town_district_rebrand",
  });
  if (!debit.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

  const now = Date.now();
  const next: DistrictOpsMap = {
    ...ops,
    [districtId]: { ...op, type: zoneType, rebranded: true },
  };
  await ctx.db.patch(progress._id, { districtOps: next, updatedAt: now });
  await recomputeProsperityFromOps(ctx, next);
  await logTownEvent(ctx, "district_rebrand", { districtId, zoneType, cost });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  return { ok: true, ops: next, coins: wallet.coins };
}

export async function collectDistrictPassive(
  ctx: ZoneCtx
): Promise<
  | { ok: true; collected: number; raw: number; cappedByPassive: boolean; coins: number }
  | { ok: false; error: string }
> {
  const now = Date.now();
  const { progress, ops } = await ensureDistrictOps(ctx);
  const showdownGamesThisWeek = resolveShowdownGamesThisWeek(progress, now);
  const coinGamesThisWeek = resolveCoinGamesThisWeek(progress, now);
  const { raw, capped } = await computeCollectableFromOps(
    ctx,
    ops,
    showdownGamesThisWeek,
    now,
    coinGamesThisWeek
  );
  if (capped <= 0) {
    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
    return { ok: true, collected: 0, raw, cappedByPassive: raw > 0, coins: wallet.coins };
  }

  const credit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: capped,
    reason: "town_passive_collect",
  });
  if (!credit.ok) return { ok: false, error: "COLLECT_FAILED" };

  const next: DistrictOpsMap = { ...ops };
  for (const districtId of ["D0", "D1"] as DistrictId[]) {
    const op = next[districtId];
    if (isDistrictDeveloped(op) && op) {
      next[districtId] = { ...op, lastCollectedAt: now };
    }
  }
  await ctx.db.patch(progress._id, { districtOps: next, updatedAt: now });
  await logTownEvent(ctx, "passive_collect", {
    collected: capped,
    raw,
    cappedByPassive: capped < raw,
  });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  return {
    ok: true,
    collected: capped,
    raw,
    cappedByPassive: capped < raw,
    coins: wallet.coins,
  };
}

export async function expandDistrictByLevel(
  ctx: ZoneCtx,
  districtId: DistrictId
): Promise<{ ok: true; unlockedDistricts: string[]; coins: number } | { ok: false; error: string }> {
  const now = Date.now();
  const { progress, ops } = await ensureDistrictOps(ctx);
  const expansion = DISTRICTS[districtId].expansion;
  if (!expansion) return { ok: false, error: "NOT_EXPANDABLE" };
  if (progress.unlockedDistricts.includes(districtId)) {
    return { ok: false, error: "ALREADY_UNLOCKED" };
  }

  const { mayorLevelFromXp } = await import("./zoneEconomyConfig");
  const mayorLevel = progress.mayorLevel ?? mayorLevelFromXp(progress.mayorXp ?? 0);
  if (mayorLevel < expansion.minMayorLevel) return { ok: false, error: "MAYOR_LEVEL_TOO_LOW" };

  const prior = ops[expansion.requiresDistrict];
  if ((prior?.level ?? 0) < expansion.minPriorDistrictLevel) {
    return { ok: false, error: "NEED_HIGHER_DISTRICT_LEVEL" };
  }

  const completed = progress.completedQuestIds ?? progress.questIds ?? [];
  if (!completed.includes(expansion.mainQuestId)) return { ok: false, error: "QUEST_REQUIRED" };

  const debit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: -expansion.expansionFeeCoins,
    reason: "town_district_expand",
  });
  if (!debit.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

  const unlockedDistricts = [...new Set([...progress.unlockedDistricts, districtId])];
  const nextOps: DistrictOpsMap = {
    ...ops,
    [districtId]: ops[districtId] ?? { level: 0 },
  };
  await ctx.db.patch(progress._id, {
    unlockedDistricts,
    currentDistrict: districtId,
    districtOps: nextOps,
    updatedAt: now,
  });
  await logTownEvent(ctx, "district_expand", { districtId, fee: expansion.expansionFeeCoins });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  return { ok: true, unlockedDistricts, coins: wallet.coins };
}

export function districtDevelopedLevel(ops: DistrictOpsMap, districtId: DistrictId): number {
  const op = ops[districtId];
  return isDistrictDeveloped(op) ? op!.level : 0;
}

export function totalDevelopedLevel(ops: DistrictOpsMap): number {
  return districtLevelTotal(ops);
}

export { EMPTY_OPS };
