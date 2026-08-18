import { v } from "convex/values";

import { authedMutation } from "../../custom/session";

import {
  developZone,
  upgradeZone,
  ensureDefaultZones,
  setCurrentDistrict,
} from "./zoneService";
import {
  collectDistrictPassive,
  developDistrict,
  expandDistrictByLevel,
  rebrandDistrict,
  upgradeDistrict,
  ensureDistrictOps,
} from "./districtOps";
import { claimTermPassNode } from "./termPass";
import { claimGameOpsReward } from "./gameOps";
import type { DistrictId, ZoneTypeId } from "./zoneEconomyConfig";
import { ensureTownProgress } from "./townProgressStore";
import { ensurePlayerWallet } from "../economy/portalWalletDao";
import {
  requireTownSessionScope,
  toTownScopedCtx,
} from "./portalTownService";
import {
  TOWN_TICKET_GRANT_V1_AMOUNT,
  TOWN_TICKET_GRANT_V1_REASON,
} from "./townTicketGrant";

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
    return await collectDistrictPassive(townCtx);
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
    return await expandDistrictByLevel(townCtx, districtId as DistrictId);
  },
});

export const developDistrictMutation = authedMutation({
  args: {
    ...townSlugArg,
    districtId: v.string(),
    zoneType: v.string(),
  },
  handler: async (ctx, { townSlug, districtId, zoneType }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    return await developDistrict(townCtx, districtId as DistrictId, zoneType as ZoneTypeId);
  },
});

export const upgradeDistrictMutation = authedMutation({
  args: {
    ...townSlugArg,
    districtId: v.string(),
  },
  handler: async (ctx, { townSlug, districtId }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    return await upgradeDistrict(townCtx, districtId as DistrictId);
  },
});

export const rebrandDistrictMutation = authedMutation({
  args: {
    ...townSlugArg,
    districtId: v.string(),
    zoneType: v.string(),
  },
  handler: async (ctx, { townSlug, districtId, zoneType }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    return await rebrandDistrict(townCtx, districtId as DistrictId, zoneType as ZoneTypeId);
  },
});

export const claimTermPassMutation = authedMutation({
  args: {
    ...townSlugArg,
    node: v.number(),
  },
  handler: async (ctx, { townSlug, node }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    await ensureTownProgress(townCtx);
    return await claimTermPassNode(townCtx, node);
  },
});

export const claimGameOpsMutation = authedMutation({
  args: townSlugArg,
  handler: async (ctx, { townSlug }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    const { ops } = await ensureDistrictOps(townCtx);
    return await claimGameOpsReward(townCtx, ops);
  },
});

export const setCurrentDistrictMutation = authedMutation({
  args: {
    ...townSlugArg,
    districtId: v.string(),
  },
  handler: async (ctx, { townSlug, districtId }) => {
    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);
    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    return await setCurrentDistrict(townCtx, districtId as DistrictId);
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
      seedTickets: TOWN_TICKET_GRANT_V1_AMOUNT,
      seedTicketReason: TOWN_TICKET_GRANT_V1_REASON,
    });
    await ensureDefaultZones(townCtx, Date.now());
    await ensureDistrictOps(townCtx);
    return { ok: true as const, townId: scope.townId };
  },
});

