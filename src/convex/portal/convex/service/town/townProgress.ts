import { v } from "convex/values";

import { authedQuery } from "../../custom/session";
import { getPlayerWalletBalances } from "../economy/portalWalletDao";
import { buildingsForDistricts } from "../../data/portalTownVenueCatalog";
import { readTownProgress, townProgressView } from "./townProgressStore";
import { resolveTownTermInfo } from "./townTermInfo";
import { listTownZones, zoneView } from "./zoneService";
import {
  computeCollectableFromOps,
  districtDevelopedLevel,
  districtOpView,
  resolveDistrictOps,
} from "./districtOps";
import { DISTRICTS, TERM_PASS, type DistrictId } from "./zoneEconomyConfig";
import { prosperityMilestonesForScore } from "./prosperityMilestonesConfig";
import { coinTableBonusView, resolveCoinGamesThisWeek } from "./coinWeekProgress";
import { entertainmentBonusView, resolveShowdownGamesThisWeek } from "./showdownWeekProgress";
import { resolveTownSessionScope, toTownScopedCtx } from "./portalTownService";
import { buildTermPassView } from "./termPass";
import { buildGameCodex, buildGameOpsView } from "./gameOps";

/** Town shell progress + wallet + districts for Hall and Mayor's Office. */
export const getProgress = authedQuery({
  args: {
    townSlug: v.optional(v.string()),
  },
  handler: async (ctx, { townSlug }) => {
    const scope = await resolveTownSessionScope(ctx, ctx.uid, townSlug);
    if (!scope) {
      throw new Error("town_unavailable");
    }

    const townCtx = { ...toTownScopedCtx(ctx, scope), templateId: scope.templateId };
    const progress = await readTownProgress(townCtx);
    const wallet = await getPlayerWalletBalances(ctx, ctx.uid, scope.playScopeKey);
    const zones = await listTownZones(townCtx);
    const ops = resolveDistrictOps(progress, zones);
    const d0Level = districtDevelopedLevel(ops, "D0");
    const d1Level = districtDevelopedLevel(ops, "D1");

    const showdownGamesThisWeek = resolveShowdownGamesThisWeek(progress);
    const coinGamesThisWeek = resolveCoinGamesThisWeek(progress);
    const unlockedDistricts = progress?.unlockedDistricts ?? ["D0"];

    const zoneViews = zones.map((z) =>
      zoneView(
        z,
        z.districtId as DistrictId,
        z.districtId === "D0" ? (d0Level > 0 ? 1 : 0) : d1Level > 0 ? 1 : 0,
        showdownGamesThisWeek,
        coinGamesThisWeek
      )
    );

    const collectable = await computeCollectableFromOps(
      townCtx,
      ops,
      showdownGamesThisWeek,
      Date.now(),
      coinGamesThisWeek
    );

    const hasEntertainmentZone = ops.D0?.type === "entertainment" || ops.D1?.type === "entertainment";
    const hasCommercialZone = ops.D0?.type === "commercial" || ops.D1?.type === "commercial";
    const developedCommercial = (ops.D0?.type === "commercial" ? 1 : 0) + (ops.D1?.type === "commercial" ? 1 : 0);

    const visibleBuildings = buildingsForDistricts(unlockedDistricts);
    const d1Expansion = DISTRICTS.D1.expansion;
    const prosperityScore = progress?.prosperityScore ?? 0;
    const termPass = buildTermPassView(progress);
    const gameOps = buildGameOpsView(progress, ops);
    const gameCodex = buildGameCodex(progress, ops);

    const districtViews = (["D0", "D1"] as DistrictId[]).map((id) =>
      districtOpView(id, ops[id] ?? { level: 0 }, unlockedDistricts.includes(id), showdownGamesThisWeek, coinGamesThisWeek)
    );

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
      districtOps: districtViews,
      collectablePassive: collectable.capped,
      collectablePassiveRaw: collectable.raw,
      passiveRatePerHour: collectable.ratePerHour,
      townLevy: {
        active: collectable.active,
        ready: collectable.capped > 0,
        payout: collectable.payout,
        collectable: collectable.capped,
        remainingMs: collectable.remainingMs,
        readyAt: collectable.readyAt,
        cappedByWeekly: false,
        ratePerHour: collectable.ratePerHour,
        dripping: collectable.remainingMs > 0,
      },
      showdownGamesThisWeek,
      entertainmentBonus: entertainmentBonusView(showdownGamesThisWeek),
      hasEntertainmentZone,
      coinGamesThisWeek,
      coinTableBonus: coinTableBonusView(coinGamesThisWeek),
      hasCommercialZone,
      developedCommercial,
      developedZonesD0: d0Level,
      developedZonesD1: d1Level,
      districtLevels: { D0: d0Level, D1: d1Level },
      prosperityMilestones: prosperityMilestonesForScore(prosperityScore),
      termPass,
      gameOps,
      gameCodex,
      ownedTitles: (progress?.ownedTitles ?? []).map((id) => {
        const reward = TERM_PASS.rewards.find((row) => row.titleId === id);
        if (reward?.title) return reward.title;
        if (id.startsWith("ops_")) return id.slice(4).replace(/_/g, " ");
        return id;
      }),
      d1Expansion: d1Expansion
        ? {
            minMayorLevel: d1Expansion.minMayorLevel,
            minPriorDistrictLevel: d1Expansion.minPriorDistrictLevel,
            minDevelopedZones: d1Expansion.minPriorDistrictLevel,
            questId: d1Expansion.mainQuestId,
            feeCoins: d1Expansion.expansionFeeCoins,
            questComplete: (progress?.completedQuestIds ?? progress?.questIds ?? []).includes(
              d1Expansion.mainQuestId
            ),
            unlocked: unlockedDistricts.includes("D1"),
            canExpand:
              Boolean(progress) &&
              !unlockedDistricts.includes("D1") &&
              (progress?.mayorLevel ?? 1) >= d1Expansion.minMayorLevel &&
              d0Level >= d1Expansion.minPriorDistrictLevel &&
              (progress?.completedQuestIds ?? progress?.questIds ?? []).includes(d1Expansion.mainQuestId),
          }
        : null,
    };
  },
});
