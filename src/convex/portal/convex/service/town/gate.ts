import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { getPortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import {
  gameTypeForTournament,
  getBuilding,
  getTier,
  hallKindForTournament,
  isHallKindMatch,
  isTableUnlocked,
  resolveTierBuyIn,
  tableLockReason,
} from "../../data/portalTownVenueCatalog";
import { applyWalletDelta, getPlayerWalletBalances } from "../economy/portalWalletDao";
import { ensureTownProgress, readTownProgress } from "./townProgressStore";
import { resolveVenueLevel } from "./venueProgress";
import { districtDevelopedLevel, resolveDistrictOps } from "./districtOps";
import { listTownZones } from "./zoneService";
import {
  requireTownSessionScope,
  resolveTownSessionScope,
  toTownScopedCtx,
} from "./portalTownService";

const TOWN_ENTRY_TTL_MS = 5 * 60_000;

export const consumeTownEntryToken = internalMutation({
  args: {
    uid: v.string(),
    entryToken: v.string(),
    tournamentId: v.string(),
  },
  handler: async (ctx, { uid, entryToken, tournamentId }) => {
    const row = await ctx.db
      .query("town_gate_entries")
      .withIndex("by_entry_token", (q) => q.eq("entryToken", entryToken))
      .unique();

    if (!row || row.uid !== uid) {
      return { ok: false as const, error: "invalid_entry_token" as const };
    }
    if (row.status !== "entered") {
      return { ok: false as const, error: "entry_token_used" as const };
    }
    if (row.tournamentId !== tournamentId) {
      return { ok: false as const, error: "tournament_mismatch" as const };
    }
    if (Date.now() - row.createdAt > TOWN_ENTRY_TTL_MS) {
      return { ok: false as const, error: "entry_token_expired" as const };
    }

    await ctx.db.patch(row._id, {
      status: "consumed",
    });

    let townId = row.townId;
    if (!townId) {
      const scope = await resolveTownSessionScope(ctx, uid);
      townId = scope?.townId ?? "";
    }

    return {
      ok: true as const,
      skipEntryCharge: row.buyIn > 0,
      buildingId: row.buildingId,
      tierId: row.tierId,
      hallKind: row.hallKind,
      buyIn: row.buyIn,
      townId,
    };
  },
});

export const validateEntry = authedQuery({
  args: {
    townSlug: v.optional(v.string()),
    buildingId: v.string(),
    tierId: v.string(),
    /** @deprecated M1 compat — ignored; table is identified by tierId. */
    modeId: v.optional(v.string()),
  },
  handler: async (ctx, { townSlug, buildingId, tierId }) => {
    const scope = await resolveTownSessionScope(ctx, ctx.uid, townSlug);
    if (!scope) {
      return { ok: false as const, error: "TOWN_UNAVAILABLE", message: "Town is not ready yet." };
    }
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };

    const building = getBuilding(buildingId);
    if (!building?.hallKind) {
      return { ok: false as const, error: "NOT_A_PORTAL" };
    }
    if (building.portalReady === false) {
      return {
        ok: false as const,
        error: "SSA_NOT_READY",
        message: `${building.name} is not ready yet`,
      };
    }

    const tier = getTier(buildingId, tierId);
    if (!tier) {
      return { ok: false as const, error: "INVALID_TIER" };
    }
    if (!isHallKindMatch(building, tier)) {
      return { ok: false as const, error: "INVALID_TOURNAMENT" };
    }

    const def = getPortalTournamentDefinition(tier.tournamentId);
    if (!def) {
      return { ok: false as const, error: "INVALID_TOURNAMENT" };
    }
    if (hallKindForTournament(tier.tournamentId) !== building.hallKind) {
      return { ok: false as const, error: "INVALID_TOURNAMENT" };
    }

    const progress = await readTownProgress(townCtx);
    const venueLevel = resolveVenueLevel(progress, building.hallKind);
    const zones = await listTownZones(townCtx);
    const ops = resolveDistrictOps(progress, zones);
    const districtLevels = {
      D0: districtDevelopedLevel(ops, "D0"),
      D1: districtDevelopedLevel(ops, "D1"),
    };
    if (!isTableUnlocked(tier, districtLevels)) {
      return {
        ok: false as const,
        error: "TABLE_LOCKED",
        message: tableLockReason(tier, districtLevels) ?? "Table locked",
      };
    }

    const gameType = def.gameType;
    const buyIn = resolveTierBuyIn(tier);
    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, scope.playScopeKey);
    if (wallet.coins < buyIn) {
      return {
        ok: false as const,
        error: "INSUFFICIENT_FUNDS",
        balance: wallet.coins,
        buyIn,
      };
    }

    return {
      ok: true as const,
      ssaKey: gameType,
      gameType,
      hallKind: building.hallKind,
      buildingId,
      tierId,
      tournamentId: tier.tournamentId,
      matchType: def.matchType,
      buyIn,
      balance: wallet.coins,
      venueLevel,
    };
  },
});

export const recordEntry = authedMutation({
  args: {
    townSlug: v.optional(v.string()),
    buildingId: v.string(),
    tierId: v.string(),
    /** @deprecated M1 compat — stored if provided. */
    modeId: v.optional(v.string()),
  },
  handler: async (ctx, { townSlug, buildingId, tierId, modeId }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };

    const building = getBuilding(buildingId);
    const tier = getTier(buildingId, tierId);
    if (!building?.hallKind || !tier) {
      return { ok: false as const, error: "INVALID_REQUEST" };
    }
    if (building.portalReady === false) {
      return { ok: false as const, error: "SSA_NOT_READY" };
    }
    if (!isHallKindMatch(building, tier)) {
      return { ok: false as const, error: "INVALID_TOURNAMENT" };
    }

    const def = getPortalTournamentDefinition(tier.tournamentId);
    if (!def) {
      return { ok: false as const, error: "INVALID_TOURNAMENT" };
    }

    const progress = await ensureTownProgress(townCtx);
    const venueLevel = resolveVenueLevel(progress, building.hallKind);
    const zones = await listTownZones(townCtx);
    const ops = resolveDistrictOps(progress, zones);
    const districtLevels = {
      D0: districtDevelopedLevel(ops, "D0"),
      D1: districtDevelopedLevel(ops, "D1"),
    };
    if (!isTableUnlocked(tier, districtLevels)) {
      return { ok: false as const, error: "TABLE_LOCKED" };
    }

    const gameType = gameTypeForTournament(tier.tournamentId) ?? def.gameType;
    const buyIn = resolveTierBuyIn(tier);
    if (buyIn > 0) {
      const debit = await applyWalletDelta(ctx, {
        uid: ctx.uid,
        scopeKey: scope.playScopeKey,
        kind: "coins",
        delta: -buyIn,
        reason: "town_gate_buyin",
        gameType,
      });
      if (!debit.ok) {
        return { ok: false as const, error: "INSUFFICIENT_FUNDS" };
      }
    }

    const entryToken = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await ctx.db.insert("town_gate_entries", {
      uid: ctx.uid,
      townId: scope.townId,
      entryToken,
      buildingId,
      tierId,
      tournamentId: tier.tournamentId,
      hallKind: building.hallKind,
      ...(modeId ? { modeId } : {}),
      buyIn,
      ssaKey: gameType,
      status: "entered",
      createdAt: Date.now(),
    });

    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, scope.playScopeKey);
    return {
      ok: true as const,
      entryToken,
      tournamentId: tier.tournamentId,
      hallKind: building.hallKind,
      ssaKey: gameType,
      buyIn,
      balance: wallet.coins,
      venueLevel,
      townId: scope.townId,
    };
  },
});

