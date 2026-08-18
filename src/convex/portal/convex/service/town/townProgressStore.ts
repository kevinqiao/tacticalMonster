/** Shared town progress reads/writes for Gate + getProgress. */
import { DEFAULT_TOWN_TEMPLATE_ID, defaultSkinForTemplate } from "../../data/portalTownConfig";
import { DEFAULT_UNLOCKED_TIER_IDS as CONFIG_DEFAULT_TIERS } from "../../data/portalTownVenueCatalog";
import { mayorLevelFromXp } from "./zoneEconomyConfig";
import { ensureDefaultZones } from "./zoneService";
import { resolveVenueLevels, venueProgressView } from "./venueProgress";
import type { TownScopedCtx } from "./portalTownService";

export const DEFAULT_UNLOCKED_TIER_IDS = CONFIG_DEFAULT_TIERS;

export type TownProgressCtx = TownScopedCtx & { templateId?: string };

export type TownProgressRow = {
  _id: string;
  uid: string;
  townId: string;
  currentDistrict: string;
  unlockedDistricts: string[];
  unlockedTierIds: string[];
  hallLevels?: Record<string, number>;
  questIds: string[];
  mayorXp?: number;
  mayorLevel?: number;
  prosperityScore?: number;
  townTemplateId?: string;
  equippedSkinId?: string;
  completedQuestIds?: string[];
  mayorXpDayKey?: string;
  mayorXpToday?: number;
  venueXp?: Record<string, number>;
  venueLevel?: Record<string, number>;
  venueXpDayKey?: string;
  venueXpToday?: Record<string, number>;
  showdownWeekKey?: string;
  showdownGamesThisWeek?: number;
  coinWeekKey?: string;
  coinGamesThisWeek?: number;
  districtOps?: Record<
    string,
    { type?: string; level: number; lastCollectedAt?: number; rebranded?: boolean }
  >;
  passTermId?: string;
  passXp?: number;
  passClaimed?: number[];
  mayorChestClaimed?: number[];
  ownedTitles?: string[];
  gameCodex?: Record<string, { opened?: boolean; played?: boolean }>;
  opsWeekKey?: string;
  opsPlays?: Record<string, number>;
  opsClaimed?: string[];
  updatedAt: number;
};

function mergeDefaultUnlockedTierIds(existing: string[]): string[] {
  return [...new Set([...DEFAULT_UNLOCKED_TIER_IDS, ...existing])];
}

/** @deprecated legacy map ids — mirrors venueLevel for old clients */
export function resolveHallLevels(progress: TownProgressRow | null): Record<string, number> {
  const levels = resolveVenueLevels(progress);
  return { parlor: levels.trial, saloon: levels.showdown };
}

/** Read-only — safe inside queries. */
export async function readTownProgress(ctx: TownProgressCtx): Promise<TownProgressRow | null> {
  return await ctx.db
    .query("town_progress")
    .withIndex("by_uid_townId", (q: any) =>
      q.eq("uid", ctx.uid).eq("townId", ctx.townId)
    )
    .unique();
}

/** Effective unlock list for queries before a row exists (no writes). */
export function resolveUnlockedTierIds(progress: TownProgressRow | null): string[] {
  return mergeDefaultUnlockedTierIds(progress?.unlockedTierIds ?? []);
}

export function isTierUnlockedForRead(
  _progress: TownProgressRow | null,
  _buildingId: string,
  _tier: { requiredHallLevel?: number; unlockTierId?: string }
): boolean {
  return true;
}

export function isTierUnlocked(progress: TownProgressRow | null, tierId: string): boolean {
  return Boolean(progress?.unlockedTierIds.includes(tierId));
}

/** Writes — mutations only (recordEntry, etc.). */
export async function ensureTownProgress(ctx: TownProgressCtx): Promise<TownProgressRow> {
  let progress = await readTownProgress(ctx);
  const now = Date.now();
  const templateId = ctx.templateId ?? DEFAULT_TOWN_TEMPLATE_ID;

  if (!progress) {
    const id = await ctx.db.insert("town_progress", {
      uid: ctx.uid,
      townId: ctx.townId,
      currentDistrict: "D0",
      unlockedDistricts: ["D0"],
      unlockedTierIds: DEFAULT_UNLOCKED_TIER_IDS,
      questIds: [],
      mayorXp: 0,
      mayorLevel: 1,
      venueXp: { trial: 0, showdown: 0 },
      venueLevel: { trial: 1, showdown: 1 },
      prosperityScore: 0,
      townTemplateId: templateId,
      equippedSkinId: defaultSkinForTemplate(templateId),
      completedQuestIds: [],
      updatedAt: now,
    });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("town_progress insert failed");
    progress = created as TownProgressRow;
    await ensureDefaultZones(ctx, now);
  }

  const mergedTierIds = mergeDefaultUnlockedTierIds(progress.unlockedTierIds);
  const tierChanged = mergedTierIds.length !== progress.unlockedTierIds.length;

  const mayorXp = progress.mayorXp ?? 0;
  const mayorLevel = progress.mayorLevel ?? mayorLevelFromXp(mayorXp);
  const venueLevels = resolveVenueLevels(progress);
  const patch: Record<string, unknown> = {};

  if (tierChanged) patch.unlockedTierIds = mergedTierIds;
  if (progress.mayorLevel == null) patch.mayorLevel = mayorLevel;
  if (progress.mayorXp == null) patch.mayorXp = mayorXp;
  if (!progress.venueXp) patch.venueXp = { trial: 0, showdown: 0 };
  if (!progress.venueLevel) patch.venueLevel = venueLevels;
  if (!progress.townTemplateId) patch.townTemplateId = templateId;
  if (!progress.equippedSkinId) {
    patch.equippedSkinId = defaultSkinForTemplate(progress.townTemplateId ?? templateId);
  }
  if (!progress.prosperityScore && progress.prosperityScore !== 0) patch.prosperityScore = 0;

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = now;
    await ctx.db.patch(progress._id, patch);
    progress = { ...progress, ...patch } as TownProgressRow;
  }

  return progress;
}

/** Snapshot for getProgress query (read-only, no insert). */
export function townProgressView(progress: TownProgressRow | null, templateId = DEFAULT_TOWN_TEMPLATE_ID) {
  const mayorXp = progress?.mayorXp ?? 0;
  const resolvedTemplate = progress?.townTemplateId ?? templateId;
  return {
    townId: progress?.townId,
    currentDistrict: progress?.currentDistrict ?? "D0",
    unlockedDistricts: progress?.unlockedDistricts ?? ["D0"],
    unlockedTierIds: resolveUnlockedTierIds(progress),
    hallLevels: resolveHallLevels(progress),
    questIds: progress?.questIds ?? [],
    completedQuestIds: progress?.completedQuestIds ?? progress?.questIds ?? [],
    mayorXp,
    mayorLevel: progress?.mayorLevel ?? mayorLevelFromXp(mayorXp),
    prosperityScore: progress?.prosperityScore ?? 0,
    townTemplateId: resolvedTemplate,
    equippedSkinId: progress?.equippedSkinId ?? defaultSkinForTemplate(resolvedTemplate),
    ...venueProgressView(progress),
  };
}

/** Build ctx for settlement when run opened from town scope. */
export function townProgressCtxFromId(
  db: TownProgressCtx["db"],
  uid: string,
  townId: string
): TownProgressCtx {
  return {
    db,
    uid,
    townId,
    playScopeKey: `town:${townId}`,
  };
}

