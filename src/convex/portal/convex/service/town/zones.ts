import { v } from "convex/values";

import { authedMutation } from "../../custom/session";

import { expandDistrict, developZone, upgradeZone, collectPassive, ensureDefaultZones } from "./zoneService";
import type { DistrictId, ZoneTypeId } from "./zoneEconomyConfig";
import { ensureTownProgress } from "./townProgressStore";
import { ensurePlayerWallet } from "../economy/portalWalletDao";
import {
  requireTownSessionScope,
  toTownScopedCtx,
} from "./portalTownService";

const townSlugArg = { townSlug: v.optional(v.string()) };

export const developZoneMutation = authedMutation({
  args: {
    ...townSlugArg,
    slotId: v.string(),
    zoneType: v.string(),
  },
  handler: async (ctx, { townSlug, slotId, zoneType }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    await ensureTownProgress(townCtx);
    return await developZone(townCtx, slotId, zoneType as ZoneTypeId);
  },
});

export const upgradeZoneMutation = authedMutation({
  args: {
    ...townSlugArg,
    slotId: v.string(),
  },
  handler: async (ctx, { townSlug, slotId }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = toTownScopedCtx(ctx, scope);
    return await upgradeZone(townCtx, slotId);
  },
});

export const collectPassiveMutation = authedMutation({
  args: townSlugArg,
  handler: async (ctx, { townSlug }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    return await collectPassive(townCtx);
  },
});

export const expandDistrictMutation = authedMutation({
  args: {
    ...townSlugArg,
    districtId: v.string(),
  },
  handler: async (ctx, { townSlug, districtId }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    return await expandDistrict(townCtx, districtId as DistrictId);
  },
});

export const ensureZones = authedMutation({
  args: townSlugArg,
  handler: async (ctx, { townSlug }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    await ensureTownProgress(townCtx);
    await ensurePlayerWallet(ctx, ctx.uid, scope.playScopeKey, {
      seedCoins: scope.walletSeedCoins,
    });
    await ensureDefaultZones(townCtx, Date.now());
    return { ok: true as const, townId: scope.townId };
  },
});
