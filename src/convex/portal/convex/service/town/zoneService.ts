import {
  DISTRICTS,
  type DistrictId,
  type ZoneTypeId,
  developCostForSlotIndex,
  developableSlotIndex,
  mayorLevelFromXp,
  passivePerHour,
  prosperityScoreFromSlots,
  upgradeCost,
  ZONE_GLOBAL,
  ZONE_TYPES,
  collectablePassiveCoins,
} from "./zoneEconomyConfig";
import { ensureTownProgress, readTownProgress } from "./townProgressStore";
import { applyWalletDelta, getPlayerWalletBalances } from "../economy/portalWalletDao";
import { coinTableBonusActive, resolveCoinGamesThisWeek } from "./coinWeekProgress";
import { entertainmentBonusActive, resolveShowdownGamesThisWeek } from "./showdownWeekProgress";
import { passiveCapAllowance } from "./townPassiveRollup";
import type { TownScopedCtx } from "./portalTownService";
import { logTownEvent } from "./townTelemetry";
import {
  PROSPERITY_MILESTONES,
} from "./prosperityMilestonesConfig";

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

type ZoneCtx = TownScopedCtx;

function slotConfig(districtId: DistrictId, slotId: string) {
  return DISTRICTS[districtId].slots.find((s) => s.slotId === slotId);
}

export async function listTownZones(ctx: ZoneCtx): Promise<TownZoneRow[]> {
  return await ctx.db
    .query("town_zones")
    .withIndex("by_uid_townId", (q: any) =>
      q.eq("uid", ctx.uid).eq("townId", ctx.townId)
    )
    .collect();
}

export async function ensureDefaultZones(ctx: ZoneCtx, now: number): Promise<void> {
  const existing = await listTownZones(ctx);
  const have = new Set(existing.map((z) => z.slotId));

  for (const districtId of ["D0", "D1"] as DistrictId[]) {
    if (districtId === "D1") continue; // seeded on expand
    for (const slot of DISTRICTS[districtId].slots) {
      if (have.has(slot.slotId)) continue;
      const level = slot.prebuiltLevel ?? 0;
      await ctx.db.insert("town_zones", {
        uid: ctx.uid,
        townId: ctx.townId,
        slotId: slot.slotId,
        districtId,
        zoneType: slot.zoneType ?? undefined,
        level,
        lastCollectedAt: level > 0 ? now : undefined,
        updatedAt: now,
      });
    }
  }
}

export async function seedDistrictZones(
  ctx: ZoneCtx,
  districtId: DistrictId,
  now: number
): Promise<void> {
  const existing = await listTownZones(ctx);
  const have = new Set(existing.map((z) => z.slotId));
  for (const slot of DISTRICTS[districtId].slots) {
    if (have.has(slot.slotId)) continue;
    await ctx.db.insert("town_zones", {
      uid: ctx.uid,
      townId: ctx.townId,
      slotId: slot.slotId,
      districtId,
      zoneType: slot.zoneType ?? undefined,
      level: slot.prebuiltLevel ?? 0,
      lastCollectedAt: slot.prebuiltLevel ? now : undefined,
      updatedAt: now,
    });
  }
}

export async function recomputeProsperity(ctx: ZoneCtx, districtId: DistrictId): Promise<number> {
  const zones = await listTownZones(ctx);
  const active = zones.filter((z) => z.level > 0 && z.zoneType);
  const score = prosperityScoreFromSlots(
    active.map((z) => ({
      zoneType: z.zoneType as ZoneTypeId,
      level: z.level,
      districtId: z.districtId as DistrictId,
    })),
    districtId
  );

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

export function zoneView(
  zone: TownZoneRow,
  districtId: DistrictId,
  developedCountInDistrict: number,
  showdownGamesThisWeek = 0,
  coinGamesThisWeek = 0
) {
  const slot = slotConfig(districtId, zone.slotId);
  const zoneType = zone.zoneType as ZoneTypeId | undefined;
  const isDeveloped = zone.level > 0 && zoneType;

  let developCost: number | null = null;
  let upgradeCostCoins: number | null = null;
  let ratePerHour = 0;

  if (slot?.developable && !isDeveloped) {
    const idx = developableSlotIndex(districtId, zone.slotId);
    if (idx != null) developCost = developCostForSlotIndex(idx);
  } else if (isDeveloped && zoneType && zone.level < ZONE_GLOBAL.maxZoneLevel) {
    upgradeCostCoins = upgradeCost(zoneType, zone.level);
    ratePerHour = passivePerHour({
      zoneType,
      level: zone.level,
      districtId,
      showdownGamesThisWeek,
      coinGamesThisWeek,
    });
  } else if (isDeveloped && zoneType) {
    ratePerHour = passivePerHour({
      zoneType,
      level: zone.level,
      districtId,
      showdownGamesThisWeek,
      coinGamesThisWeek,
    });
  }

  return {
    slotId: zone.slotId,
    districtId: zone.districtId,
    zoneType: zone.zoneType ?? null,
    level: zone.level,
    developable: slot?.developable ?? false,
    choices: slot?.choices ?? [],
    developCost,
    upgradeCost: upgradeCostCoins,
    passivePerHour: ratePerHour,
    entertainmentBonusActive:
      zoneType === "entertainment" && isDeveloped
        ? entertainmentBonusActive(showdownGamesThisWeek)
        : undefined,
    coinTableBonusActive:
      zoneType === "commercial" && isDeveloped
        ? coinTableBonusActive(coinGamesThisWeek)
        : undefined,
    label: zoneType ? ZONE_TYPES[zoneType].label : null,
    labelZh: zoneType ? ZONE_TYPES[zoneType].labelZh : null,
    developedCountInDistrict,
  };
}

export async function computeCollectablePassive(
  ctx: ZoneCtx,
  zones: TownZoneRow[],
  showdownGamesThisWeek = 0,
  now = Date.now(),
  coinGamesThisWeek = 0
): Promise<{ raw: number; capped: number; ratePerHour: number }> {
  let ratePerHour = 0;
  for (const zone of zones) {
    if (zone.level < 1 || !zone.zoneType) continue;
    ratePerHour += passivePerHour({
      zoneType: zone.zoneType as ZoneTypeId,
      level: zone.level,
      districtId: zone.districtId as DistrictId,
      showdownGamesThisWeek,
      coinGamesThisWeek,
    });
  }

  if (ratePerHour <= 0) {
    return { raw: 0, capped: 0, ratePerHour: 0 };
  }

  const oldest = zones
    .filter((z) => z.level > 0 && z.lastCollectedAt)
    .reduce((min, z) => Math.min(min, z.lastCollectedAt!), Number.POSITIVE_INFINITY);

  const since = Number.isFinite(oldest) ? oldest : 0;
  const elapsedMs = Math.max(0, now - since);
  const raw = collectablePassiveCoins({ passivePerHourTotal: ratePerHour, elapsedMs });
  const allowance = await passiveCapAllowance(ctx, ctx.uid, ctx.townId, now);
  const capped = Math.min(raw, allowance);
  return { raw, capped, ratePerHour };
}

export async function developZone(
  ctx: ZoneCtx,
  slotId: string,
  zoneType: ZoneTypeId
): Promise<
  | { ok: true; zone: TownZoneRow; coins: number }
  | { ok: false; error: string }
> {
  const now = Date.now();
  await ensureTownProgress(ctx);
  await ensureDefaultZones(ctx, now);

  const zone = (await listTownZones(ctx)).find((z) => z.slotId === slotId);
  if (!zone) return { ok: false, error: "INVALID_SLOT" };

  const districtId = zone.districtId as DistrictId;
  const slot = slotConfig(districtId, slotId);
  if (!slot?.developable) return { ok: false, error: "NOT_DEVELOPABLE" };
  if (zone.level > 0 || zone.zoneType) return { ok: false, error: "ALREADY_DEVELOPED" };
  if (!slot.choices?.includes(zoneType)) return { ok: false, error: "INVALID_ZONE_TYPE" };

  const progress = await readTownProgress(ctx);
  if (!progress?.unlockedDistricts.includes(districtId)) {
    return { ok: false, error: "DISTRICT_LOCKED" };
  }

  const idx = developableSlotIndex(districtId, slotId);
  if (idx == null) return { ok: false, error: "INVALID_SLOT" };
  const cost = developCostForSlotIndex(idx);

  const debit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: -cost,
    reason: "town_zone_develop",
  });
  if (!debit.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

  await ctx.db.patch(zone._id, {
    zoneType,
    level: 1,
    lastCollectedAt: now,
    updatedAt: now,
  });

  await recomputeProsperity(ctx, districtId);
  await logTownEvent(ctx, "zone_develop", { slotId, zoneType, cost });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  const updated = await ctx.db.get(zone._id);
  return { ok: true, zone: updated as TownZoneRow, coins: wallet.coins };
}

export async function upgradeZone(
  ctx: ZoneCtx,
  slotId: string
): Promise<
  | { ok: true; zone: TownZoneRow; coins: number }
  | { ok: false; error: string }
> {
  const now = Date.now();
  const zone = (await listTownZones(ctx)).find((z) => z.slotId === slotId);
  if (!zone?.zoneType || zone.level < 1) return { ok: false, error: "NOT_DEVELOPED" };
  if (zone.level >= ZONE_GLOBAL.maxZoneLevel) return { ok: false, error: "MAX_LEVEL" };

  const progress = await readTownProgress(ctx);
  if (!progress?.unlockedDistricts.includes(zone.districtId)) {
    return { ok: false, error: "DISTRICT_LOCKED" };
  }

  const zoneType = zone.zoneType as ZoneTypeId;
  const cost = upgradeCost(zoneType, zone.level);
  if (cost <= 0) return { ok: false, error: "NOT_UPGRADABLE" };

  const debit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: -cost,
    reason: "town_zone_upgrade",
  });
  if (!debit.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

  await ctx.db.patch(zone._id, {
    level: zone.level + 1,
    updatedAt: now,
  });

  await recomputeProsperity(ctx, zone.districtId as DistrictId);
  await logTownEvent(ctx, "zone_upgrade", { slotId, level: zone.level + 1, cost });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  const updated = await ctx.db.get(zone._id);
  return { ok: true, zone: updated as TownZoneRow, coins: wallet.coins };
}

export async function collectPassive(
  ctx: ZoneCtx
): Promise<
  | { ok: true; collected: number; raw: number; cappedByPassive: boolean; coins: number }
  | { ok: false; error: string }
> {
  const now = Date.now();
  await ensureTownProgress(ctx);
  await ensureDefaultZones(ctx, now);

  const zones = await listTownZones(ctx);
  const progress = await readTownProgress(ctx);
  const showdownGamesThisWeek = resolveShowdownGamesThisWeek(progress, now);
  const coinGamesThisWeek = resolveCoinGamesThisWeek(progress, now);
  const { raw, capped, ratePerHour } = await computeCollectablePassive(
    ctx,
    zones,
    showdownGamesThisWeek,
    now,
    coinGamesThisWeek
  );
  if (capped <= 0) {
    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
    return {
      ok: true,
      collected: 0,
      raw,
      cappedByPassive: raw > 0,
      coins: wallet.coins,
    };
  }

  if (now - (zones[0]?.updatedAt ?? 0) < ZONE_GLOBAL.minCollectIntervalMs && raw === 0) {
    // noop
  }

  const credit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: capped,
    reason: "town_passive_collect",
  });
  if (!credit.ok) return { ok: false, error: "COLLECT_FAILED" };

  for (const zone of zones) {
    if (zone.level > 0) {
      await ctx.db.patch(zone._id, {
        lastCollectedAt: now,
        updatedAt: now,
      });
    }
  }

  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  await logTownEvent(ctx, "passive_collect", {
    collected: capped,
    raw,
    cappedByPassive: capped < raw,
  });
  return {
    ok: true,
    collected: capped,
    raw,
    cappedByPassive: capped < raw,
    coins: wallet.coins,
  };
}

export async function expandDistrict(
  ctx: ZoneCtx,
  districtId: DistrictId
): Promise<
  | { ok: true; unlockedDistricts: string[]; coins: number }
  | { ok: false; error: string }
> {
  const now = Date.now();
  const progress = await ensureTownProgress(ctx);
  await ensureDefaultZones(ctx, now);

  const expansion = DISTRICTS[districtId].expansion;
  if (!expansion) return { ok: false, error: "NOT_EXPANDABLE" };
  if (progress.unlockedDistricts.includes(districtId)) {
    return { ok: false, error: "ALREADY_UNLOCKED" };
  }

  const mayorLevel = progress.mayorLevel ?? mayorLevelFromXp(progress.mayorXp ?? 0);
  if (mayorLevel < expansion.minMayorLevel) {
    return { ok: false, error: "MAYOR_LEVEL_TOO_LOW" };
  }

  const priorZones = (await listTownZones(ctx)).filter((z) => {
    if (z.districtId !== expansion.requiresDistrict || !(z.level > 0) || !z.zoneType) return false;
    return Boolean(slotConfig(z.districtId as DistrictId, z.slotId)?.developable);
  });
  if (priorZones.length < expansion.minPriorDistrictLevel) {
    return { ok: false, error: "NEED_HIGHER_DISTRICT_LEVEL" };
  }

  const completed = progress.completedQuestIds ?? progress.questIds ?? [];
  if (!completed.includes(expansion.mainQuestId)) {
    return { ok: false, error: "QUEST_REQUIRED" };
  }

  const debit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: -expansion.expansionFeeCoins,
    reason: "town_district_expand",
  });
  if (!debit.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

  const unlockedDistricts = [...new Set([...progress.unlockedDistricts, districtId])];
  await ctx.db.patch(progress._id, {
    unlockedDistricts,
    currentDistrict: districtId,
    updatedAt: now,
  });

  await seedDistrictZones(ctx, districtId, now);
  await logTownEvent(ctx, "district_expand", { districtId, fee: expansion.expansionFeeCoins });
  const wallet = await getPlayerWalletBalances(ctx, ctx.uid, ctx.playScopeKey);
  return { ok: true, unlockedDistricts, coins: wallet.coins };
}

export async function setCurrentDistrict(
  ctx: ZoneCtx,
  districtId: DistrictId
): Promise<{ ok: true; currentDistrict: string } | { ok: false; error: string }> {
  if (!DISTRICTS[districtId]) return { ok: false, error: "INVALID_DISTRICT" };
  const progress = await ensureTownProgress(ctx);
  if (!progress.unlockedDistricts.includes(districtId)) {
    return { ok: false, error: "DISTRICT_LOCKED" };
  }
  if (progress.currentDistrict !== districtId) {
    await ctx.db.patch(progress._id, {
      currentDistrict: districtId,
      updatedAt: Date.now(),
    });
    await logTownEvent(ctx, "district_focus", { districtId });
  }
  return { ok: true, currentDistrict: districtId };
}

export function countDevelopedInDistrict(zones: TownZoneRow[], districtId: string): number {
  return zones.filter((z) => {
    if (z.districtId !== districtId || !(z.level > 0) || !z.zoneType) return false;
    return Boolean(slotConfig(z.districtId as DistrictId, z.slotId)?.developable);
  }).length;
}

export function countDevelopedByZoneType(zones: TownZoneRow[], zoneType: string): number {
  return zones.filter((z) => z.level > 0 && z.zoneType === zoneType).length;
}
