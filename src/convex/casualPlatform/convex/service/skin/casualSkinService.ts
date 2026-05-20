import { v } from "convex/values";
import {
  CASUAL_SKIN_CATALOG,
  deluxeInstantSkinIds,
  getSkinCatalogEntry,
  listPublicSkinCatalog,
  seasonEnvSkinIds,
  type CasualSkinCatalogEntry,
} from "../../data/casualSkinCatalog.js";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";

export type SkinEntitlements = {
  seasonId: string;
  uiTier: "free" | "standard" | "deluxe";
  townLayer: "none" | "env" | "accent" | "facade" | "full";
  townVariant: "standard" | "deluxe";
  passLevel: number;
  cssThemeKey: string;
};

async function resolveActiveSeason(ctx: QueryCtx) {
  const seasons = await ctx.db.query("casual_seasons").collect();
  return seasons.find((s) => s.active) ?? seasons[0] ?? null;
}

async function listOwnedSkinIds(ctx: QueryCtx, uid: string): Promise<Set<string>> {
  const rows = await ctx.db
    .query("casual_player_skins")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  return new Set(rows.map((r) => r.skinId));
}

function computeBpEntitledSkinIds(
  seasonId: string,
  level: number,
  tracks: { standard?: boolean; deluxe?: boolean }
): string[] {
  const entitled: string[] = [...seasonEnvSkinIds(seasonId)];
  if (tracks.deluxe) {
    entitled.push(...deluxeInstantSkinIds(seasonId));
  }
  for (const entry of CASUAL_SKIN_CATALOG) {
    if (entry.seasonId !== seasonId) continue;
    if (entry.bpUnlockLevel == null) continue;
    if (level < entry.bpUnlockLevel) continue;
    const tier = entry.bpTier ?? "free";
    if (tier === "free") {
      entitled.push(entry.skinId);
      continue;
    }
    if (tier === "standard" && tracks.standard) {
      entitled.push(entry.skinId);
      continue;
    }
    if (tier === "deluxe" && tracks.deluxe) {
      entitled.push(entry.skinId);
    }
  }
  return [...new Set(entitled)];
}

function computeEntitlements(
  seasonId: string,
  level: number,
  tracks: { standard?: boolean; deluxe?: boolean },
  owned: Set<string>,
  bpEntitled: string[]
): SkinEntitlements {
  const all = new Set([...owned, ...bpEntitled]);
  let uiTier: SkinEntitlements["uiTier"] = "free";
  const isS2 =
    seasonId.toLowerCase() === "casual_s2" ||
    seasonId.toLowerCase().endsWith("_s2") ||
    seasonId.toLowerCase().startsWith("casual_s2_");
  const cssThemeKey = isS2 ? "s2-edo-sakura" : "s1-midnight-sky";

  if (all.has(isS2 ? "ui_s2_deluxe" : "ui_s1_deluxe")) uiTier = "deluxe";
  else if (all.has(isS2 ? "ui_s2_standard" : "ui_s1_standard")) uiTier = "standard";
  else if (all.has(isS2 ? "ui_s2_env" : "ui_s1_env")) uiTier = "free";

  let townLayer: SkinEntitlements["townLayer"] = "none";
  const prefix = isS2 ? "s2" : "s1";
  if (all.has(`${prefix}_town_theme_full_deluxe`) || all.has(`${prefix}_town_theme_full_std`)) {
    townLayer = "full";
  } else if (
    all.has(`${prefix}_town_theme_facade_deluxe`) ||
    all.has(`${prefix}_town_theme_facade_std`)
  ) {
    townLayer = "facade";
  } else if (
    all.has(`${prefix}_town_theme_accent_deluxe`) ||
    all.has(`${prefix}_town_theme_accent_std`)
  ) {
    townLayer = "accent";
  } else if (all.has(`${prefix}_town_theme_env`)) {
    townLayer = "env";
  }

  const townVariant = all.has(`${prefix}_town_theme_accent_deluxe`) ||
    all.has(`${prefix}_town_theme_facade_deluxe`) ||
    all.has(`${prefix}_town_theme_full_deluxe`)
    ? "deluxe"
    : "standard";

  return { seasonId, uiTier, townLayer, townVariant, passLevel: level, cssThemeKey };
}

export const getSkinCatalog = query({
  args: {},
  handler: async () => listPublicSkinCatalog(),
});

export const getPlayerSkinState = query({
  args: { uid: v.optional(v.string()) },
  handler: async (ctx, { uid }) => {
    if (!uid) return null;
    const season = await resolveActiveSeason(ctx);
    const seasonId = season?.seasonId ?? "casual_s1";

    const ownedRows = await ctx.db
      .query("casual_player_skins")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();

    const equipRows = await ctx.db
      .query("casual_player_skin_equip")
      .withIndex("by_uid_slot", (q) => q.eq("uid", uid))
      .collect();

    const progress = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();

    const level = progress?.level ?? 1;
    const tracks = progress?.tracksPurchased ?? {};
    const owned = new Set(ownedRows.map((r) => r.skinId));
    const bpEntitled = computeBpEntitledSkinIds(seasonId, level, tracks);
    const entitlements = computeEntitlements(seasonId, level, tracks, owned, bpEntitled);

    const effectiveOwned = [...new Set([...owned, ...bpEntitled])];

    return {
      seasonId,
      owned: ownedRows.map((r) => ({
        skinId: r.skinId,
        grantedAt: r.grantedAt,
        source: r.source,
        seasonId: r.seasonId,
      })),
      effectiveOwned,
      equipped: Object.fromEntries(equipRows.map((r) => [r.slot, r.skinId])),
      entitlements,
      catalog: listPublicSkinCatalog(),
    };
  },
});

export const grantSkin = internalMutation({
  args: {
    uid: v.string(),
    skinId: v.string(),
    source: v.union(
      v.literal("pass"),
      v.literal("shop"),
      v.literal("achievement"),
      v.literal("season_auto")
    ),
    seasonId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, skinId, source, seasonId }) => {
    const entry = getSkinCatalogEntry(skinId);
    if (!entry) return { ok: false as const, error: "unknown_skin" };
    const existing = await ctx.db
      .query("casual_player_skins")
      .withIndex("by_uid_skinId", (q) => q.eq("uid", uid).eq("skinId", skinId))
      .unique();
    if (existing) return { ok: true as const, alreadyOwned: true as const };
    await grantSkinIdempotent(ctx, uid, skinId, source, seasonId ?? entry.seasonId);
    return { ok: true as const, alreadyOwned: false as const };
  },
});

async function grantSkinIdempotent(
  ctx: MutationCtx,
  uid: string,
  skinId: string,
  source: "pass" | "shop" | "achievement" | "season_auto",
  seasonId?: string
) {
  const entry = getSkinCatalogEntry(skinId);
  if (!entry) return;
  const existing = await ctx.db
    .query("casual_player_skins")
    .withIndex("by_uid_skinId", (q) => q.eq("uid", uid).eq("skinId", skinId))
    .unique();
  if (existing) return;
  await ctx.db.insert("casual_player_skins", {
    uid,
    skinId,
    grantedAt: Date.now(),
    source,
    seasonId: seasonId ?? entry.seasonId,
  });
}

/** 登录/赛季 ensure：环境层 + 经典卡 + 默认装备 */
export const ensureDefaultSkinsForPlayer = internalMutation({
  args: { uid: v.string(), seasonId: v.string() },
  handler: async (ctx, { uid, seasonId }) => {
    await grantSkinIdempotent(ctx, uid, "classic_card", "season_auto");
    for (const skinId of seasonEnvSkinIds(seasonId)) {
      await grantSkinIdempotent(ctx, uid, skinId, "season_auto", seasonId);
    }
    const equipSlots: Array<{ slot: string; skinId: string }> = [
      { slot: "card_global", skinId: "classic_card" },
      { slot: "game:solitaire", skinId: "classic_card" },
      {
        slot: "town",
        skinId: seasonId.toLowerCase().includes("s2") ? "s2_town_theme_env" : "s1_town_theme_env",
      },
    ];
    const now = Date.now();
    for (const { slot, skinId } of equipSlots) {
      const row = await ctx.db
        .query("casual_player_skin_equip")
        .withIndex("by_uid_slot", (q) => q.eq("uid", uid).eq("slot", slot))
        .unique();
      if (!row) {
        await ctx.db.insert("casual_player_skin_equip", {
          uid,
          slot,
          skinId,
          updatedAt: now,
        });
      }
    }
    return { ok: true as const };
  },
});

export const equipSkin = mutation({
  args: {
    uid: v.string(),
    slot: v.string(),
    skinId: v.string(),
  },
  handler: async (ctx, { uid, slot, skinId }) => {
    const entry = getSkinCatalogEntry(skinId);
    if (!entry) return { ok: false as const, error: "unknown_skin" };

    const season = await resolveActiveSeason(ctx);
    const seasonId = season?.seasonId ?? "casual_s1";
    const progress = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();
    const level = progress?.level ?? 1;
    const tracks = progress?.tracksPurchased ?? {};
    const owned = await listOwnedSkinIds(ctx, uid);
    const bpEntitled = new Set(computeBpEntitledSkinIds(seasonId, level, tracks));
    const canUse = owned.has(skinId) || bpEntitled.has(skinId);
    if (!canUse) return { ok: false as const, error: "not_owned" };

    if (slot.startsWith("game:")) {
      const gameId = slot.slice("game:".length);
      const applies = entry.appliesToGameIds ?? [];
      if (applies.length > 0 && !applies.includes(gameId)) {
        return { ok: false as const, error: "game_not_applicable" };
      }
    }

    const now = Date.now();
    const row = await ctx.db
      .query("casual_player_skin_equip")
      .withIndex("by_uid_slot", (q) => q.eq("uid", uid).eq("slot", slot))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { skinId, updatedAt: now });
    } else {
      await ctx.db.insert("casual_player_skin_equip", { uid, slot, skinId, updatedAt: now });
    }
    return { ok: true as const };
  },
});

export const unequipSkin = mutation({
  args: { uid: v.string(), slot: v.string() },
  handler: async (ctx, { uid, slot }) => {
    const row = await ctx.db
      .query("casual_player_skin_equip")
      .withIndex("by_uid_slot", (q) => q.eq("uid", uid).eq("slot", slot))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return { ok: true as const };
  },
});

export const resolveEquippedVisualForGame = internalQuery({
  args: { uid: v.string(), gameId: v.string() },
  handler: async (ctx, { uid, gameId }) => {
    const slot = `game:${gameId}`;
    let equip = await ctx.db
      .query("casual_player_skin_equip")
      .withIndex("by_uid_slot", (q) => q.eq("uid", uid).eq("slot", slot))
      .unique();
    if (!equip) {
      equip = await ctx.db
        .query("casual_player_skin_equip")
        .withIndex("by_uid_slot", (q) => q.eq("uid", uid).eq("slot", "card_global"))
        .unique();
    }
    const skinId = equip?.skinId ?? "classic_card";
    const entry = getSkinCatalogEntry(skinId);
    const components = entry?.componentsByGame?.[gameId] ?? entry?.componentsByGame?.solitaire;
    return {
      skinId,
      visualKey: components?.card_face ?? components?.board_bg ?? "classic",
      components: components ?? { card_face: "classic", card_back: "classic", table_bg: "classic" },
    };
  },
});

export function skinAppliesToGame(entry: CasualSkinCatalogEntry, gameId: string): boolean {
  const ids = entry.appliesToGameIds ?? [];
  return ids.length === 0 || ids.includes(gameId);
}
