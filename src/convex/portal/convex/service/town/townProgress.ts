import { v } from "convex/values";



import { authedQuery } from "../../custom/session";



import { getPlayerWalletBalances } from "../economy/portalWalletDao";



import { buildingsForDistricts } from "./config";

import { readTownProgress, townProgressView } from "./townProgressStore";

import { resolveTownTermInfo } from "./townTermInfo";

import {

  computeCollectablePassive,

  countDevelopedInDistrict,

  listTownZones,

  zoneView,

} from "./zoneService";

import { DISTRICTS, type DistrictId } from "./zoneEconomyConfig";

import { prosperityMilestonesForScore } from "./prosperityMilestonesConfig";

import {

  entertainmentBonusView,

  resolveShowdownGamesThisWeek,

} from "./showdownWeekProgress";

import {

  requireTownSessionScope,

  toTownScopedCtx,

} from "./portalTownService";



/** Town shell progress + wallet + zones for Gate Card and Mayor's Office. */

export const getProgress = authedQuery({

  args: {

    townSlug: v.optional(v.string()),

  },

  handler: async (ctx, { townSlug }) => {

    const scope = await requireTownSessionScope(ctx, ctx.uid, townSlug);

    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };



    const progress = await readTownProgress(townCtx);

    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, scope.playScopeKey);

    const zones = await listTownZones(townCtx);

    const developedD0 = countDevelopedInDistrict(zones, "D0");

    const showdownGamesThisWeek = resolveShowdownGamesThisWeek(progress);

    const zoneViews = zones.map((z) =>

      zoneView(

        z,

        z.districtId as DistrictId,

        countDevelopedInDistrict(zones, z.districtId),

        showdownGamesThisWeek

      )

    );

    const collectable = await computeCollectablePassive(townCtx, zones, showdownGamesThisWeek);

    const hasEntertainmentZone = zones.some(

      (z) => z.level > 0 && z.zoneType === "entertainment"

    );

    const unlockedDistricts = progress?.unlockedDistricts ?? ["D0"];

    const visibleBuildings = buildingsForDistricts(unlockedDistricts);

    const d1Expansion = DISTRICTS.D1.expansion;

    const prosperityScore = progress?.prosperityScore ?? 0;



    return {

      ...townProgressView(progress, scope.templateId),

      townSlug: scope.slug,

      townTitle: scope.branding.displayTitle,

      townBranding: scope.branding,

      playScopeKey: scope.playScopeKey,

      term: resolveTownTermInfo(),

      coins: wallet.coins,

      gems: wallet.gems,

      tickets: wallet.tickets,

      buildings: visibleBuildings,

      zones: zoneViews,

      collectablePassive: collectable.capped,

      collectablePassiveRaw: collectable.raw,

      passiveRatePerHour: collectable.ratePerHour,

      showdownGamesThisWeek,

      entertainmentBonus: entertainmentBonusView(showdownGamesThisWeek),

      hasEntertainmentZone,

      developedZonesD0: developedD0,

      prosperityMilestones: prosperityMilestonesForScore(prosperityScore),

      d1Expansion: d1Expansion

        ? {

            minMayorLevel: d1Expansion.minMayorLevel,

            minDevelopedZones: d1Expansion.minDevelopedZonesInPriorDistrict,

            questId: d1Expansion.mainQuestId,

            feeCoins: d1Expansion.expansionFeeCoins,

            canExpand:

              Boolean(progress) &&

              !(progress?.unlockedDistricts ?? ["D0"]).includes("D1") &&

              (progress?.mayorLevel ?? 1) >= d1Expansion.minMayorLevel &&

              developedD0 >= d1Expansion.minDevelopedZonesInPriorDistrict &&

              (progress?.completedQuestIds ?? progress?.questIds ?? []).includes(

                d1Expansion.mainQuestId

              ),

          }

        : null,

    };

  },

});


