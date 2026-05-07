import type { SeasonShelfSku } from "@/convex/casualPlatform/convex/data/casualSeasonShelfCatalog";
import { api as casualPlatformApi } from "@/convex/casualPlatform/convex/_generated/api";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { useUserManager } from "host/service/UserManager";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import type { CasualActivityPublicRow } from "./casualActivityTypes";
import { getMockCasualActivitiesForUiDemo, shouldUseMockCasualActivities } from "./casualActivityMock";

const CASUAL_CONVEX_URL = import.meta.env.VITE_CONVEX_URL_CASUAL ?? "https://amicable-alpaca-980.convex.cloud";

export interface CasualPlayerSummary {
  uid?: string;
  coins?: number;
  gems?: number;
  seasonXp?: number;
  seasonVouchers?: number;
  seasonChallengePoints?: number;
}

function casualPlayerSummaryFromAuth(result: unknown): CasualPlayerSummary | null {
  if (result == null || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const pickNum = (key: string): number | undefined => {
    const v = r[key];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  const uid = r.uid;
  return {
    ...(typeof uid === "string" ? { uid } : {}),
    coins: pickNum("coins"),
    gems: pickNum("gems"),
    seasonXp: pickNum("seasonXp"),
    seasonVouchers: pickNum("seasonVouchers"),
    seasonChallengePoints: pickNum("seasonChallengePoints"),
  };
}

export interface CasualSubmitScoreResult {
  ok: boolean;
  error?: string;
}

export interface CasualPlatformValue {
  convexUrl: string;
  casualPlayer: CasualPlayerSummary | null;
  activities: CasualActivityPublicRow[];
  tournaments: Array<{
    tournamentId: string;
    title: string;
    gameId: string;
    matchType: string;
    status: string;
  }>;
  seasons: Array<{
    seasonId: string;
    name: string;
    startsAt: number;
    endsAt: number;
    active: boolean;
  }>;
  passProgress: {
    uid: string;
    seasonId: string;
    level: number;
    xp: number;
    tracksPurchased?: { standard?: boolean; deluxe?: boolean };
    claimed?: Array<{ track: "free" | "standard" | "deluxe"; level: number }>;
  } | null;
  shopSkus: Array<{
    skuId: string;
    title: string;
    skuKind?: "virtual" | "iap";
    iapPriceLabel?: string;
    priceCoins?: number;
    priceGems?: number;
    grantCoins?: number;
    grantGems?: number;
  }>;
  /** Convex `listSeasonShelf`，与静态 `SEASON_SHELF_SKUS` 同源 */
  seasonShelfSkus: SeasonShelfSku[];
  missions: Array<{
    taskId: string;
    title: string;
    target: number;
    progress: number;
    completed: boolean;
    completedAt?: number;
    tier?: string;
    claimed?: boolean;
    /** 服务端当前周期键：`d:` / `w:` / `s:` */
    periodKey?: string;
  }>;
  refreshCasualPlayer: () => Promise<void>;
  joinTournament: (
    tournamentId: string
  ) => Promise<{
    ok: boolean;
    entryId?: string;
    error?: string;
    vouchersCharged?: number;
    coinsCharged?: number;
    gemsCharged?: number;
    activityIds?: string[];
  } | null>;
  fetchLeaderboard: (
    tournamentId: string,
    limit?: number
  ) => Promise<Array<{ rank: number; uid: string; score: number; submittedAt?: number }>>;
  fetchMainSeasonLeaderboard: (
    seasonId: string,
    limit?: number
  ) => Promise<Array<{ rank: number; uid: string; points: number }>>;
  fetchCArenaLeaderboard: (
    seasonId: string,
    limit?: number
  ) => Promise<Array<{ rank: number; uid: string; points: number }>>;
  submitCasualRun: (input: {
    tournamentId: string;
    gameId: string;
    score: number;
    externalGameId?: string;
  }) => Promise<CasualSubmitScoreResult>;
  claimSeasonMission: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
  claimPassLevel: (input: {
    seasonId: string;
    track: "free" | "standard" | "deluxe";
    level: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  purchaseShopSku: (skuId: string) => Promise<{
    ok: boolean;
    error?: string;
    activityIds?: string[];
  }>;
  /** 法币 IAP 成功后发放钻石（须支付渠道唯一 paymentRef）；活动修正见 `iapGrantGems*` */
  fulfillIapShopPurchase: (
    skuId: string,
    paymentRef: string
  ) => Promise<{
    ok: boolean;
    error?: string;
    gemsGranted?: number;
    baseGems?: number;
    activityIds?: string[];
  }>;
  redeemSeasonShelfSku: (skuId: string) => Promise<{
    ok: boolean;
    error?: string;
    activityIds?: string[];
    vouchersCharged?: number;
    challengePointsCharged?: number;
    gemsCharged?: number;
  }>;
  openFixedChest: (chestId: string) => Promise<{ ok: boolean; error?: string; grants?: unknown }>;
  devUnlockPassTrack: (input: {
    seasonId: string;
    track: "standard" | "deluxe";
  }) => Promise<{ ok: boolean; error?: string }>;
}

type CasualDataSnapshot = Pick<
  CasualPlatformValue,
  | "convexUrl"
  | "casualPlayer"
  | "activities"
  | "tournaments"
  | "seasons"
  | "passProgress"
  | "missions"
  | "shopSkus"
  | "seasonShelfSkus"
>;

function emptyData(): CasualDataSnapshot {
  return {
    convexUrl: CASUAL_CONVEX_URL,
    casualPlayer: null,
    activities: [],
    tournaments: [],
    seasons: [],
    passProgress: null,
    missions: [],
    shopSkus: [],
    seasonShelfSkus: [],
  };
}

let dataSnapshot: CasualDataSnapshot = emptyData();
const listeners = new Set<() => void>();
let storeRefCount = 0;

function subscribeStore(cb: () => void) {
  storeRefCount++;
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    storeRefCount--;
    if (storeRefCount <= 0) {
      storeRefCount = 0;
      stopLiveSubscriptions();
      lastLiveKey = "__init__";
    }
  };
}

function emitStore() {
  for (const l of listeners) l();
}

function patchData(partial: Partial<CasualDataSnapshot>) {
  dataSnapshot = { ...dataSnapshot, ...partial };
  emitStore();
}

function getDataSnapshot(): CasualDataSnapshot {
  return dataSnapshot;
}

function getServerDataSnapshot(): CasualDataSnapshot {
  return emptyData();
}

let httpSingleton: ConvexHttpClient | null = null;
let liveSingleton: ConvexClient | null = null;

function getCasualHttpClient(): ConvexHttpClient | null {
  if (!CASUAL_CONVEX_URL) return null;
  if (!httpSingleton) httpSingleton = new ConvexHttpClient(CASUAL_CONVEX_URL);
  return httpSingleton;
}

function getCasualLiveClient(): ConvexClient | null {
  if (!CASUAL_CONVEX_URL) return null;
  if (!liveSingleton) liveSingleton = new ConvexClient(CASUAL_CONVEX_URL);
  return liveSingleton;
}

let liveUnsubs: Array<{ unsubscribe: () => void }> = [];
let lastLiveKey = "__init__";

function stopLiveSubscriptions() {
  for (const s of liveUnsubs) s.unsubscribe();
  liveUnsubs = [];
}

function startLiveSubscriptions(uid: string | undefined) {
  stopLiveSubscriptions();
  const live = getCasualLiveClient();
  if (!live) {
    patchData({
      tournaments: [],
      seasons: [],
      passProgress: null,
      missions: [],
      shopSkus: [],
      seasonShelfSkus: [],
      activities: [],
    });
    return;
  }

  const sub = (
    ref: Parameters<ConvexClient["onUpdate"]>[0],
    args: Record<string, unknown>,
    onVal: (v: unknown) => void,
    label: string
  ) => {
    const h = live.onUpdate(
      ref,
      args as Parameters<ConvexClient["onUpdate"]>[1],
      (rows) => onVal(rows),
      (err) => console.error(`[CasualPlatform] ${label}`, err)
    );
    liveUnsubs.push(h);
  };

  sub(
    casualPlatformApi.service.casualTournamentService.listTournaments,
    {},
    (rows) => patchData({ tournaments: (rows as CasualPlatformValue["tournaments"]) ?? [] }),
    "listTournaments"
  );

  sub(
    casualPlatformApi.service.casualSeasonService.listSeasons,
    {},
    (rows) => patchData({ seasons: (rows as CasualPlatformValue["seasons"]) ?? [] }),
    "listSeasons"
  );

  sub(
    casualPlatformApi.service.casualShopService.listActiveShopSkus,
    {},
    (rows) => patchData({ shopSkus: (rows as CasualPlatformValue["shopSkus"]) ?? [] }),
    "listActiveShopSkus"
  );

  sub(
    casualPlatformApi.service.casualActivityService.listActiveActivities,
    {},
    (rows) => patchData({ activities: (rows as CasualActivityPublicRow[]) ?? [] }),
    "listActiveActivities"
  );

  sub(
    casualPlatformApi.service.casualSeasonShelfService.listSeasonShelf,
    {},
    (rows) => patchData({ seasonShelfSkus: (rows as SeasonShelfSku[]) ?? [] }),
    "listSeasonShelf"
  );

  if (uid) {
    sub(
      casualPlatformApi.service.casualSeasonService.getPassProgress,
      { uid },
      (row) => patchData({ passProgress: (row as CasualPlatformValue["passProgress"]) ?? null }),
      "getPassProgress"
    );
    sub(
      casualPlatformApi.service.casualTaskService.listSeasonMissions,
      { uid },
      (rows) => patchData({ missions: (rows as CasualPlatformValue["missions"]) ?? [] }),
      "listSeasonMissions"
    );
  } else {
    patchData({ passProgress: null, missions: [] });
  }
}

function syncLive(uid: string | undefined) {
  const key = uid ?? "";
  if (key === lastLiveKey) return;
  lastLiveKey = key;
  startLiveSubscriptions(uid);
}

/**
 * 单例 Convex + 集中订阅；任何页面调用 `useCasualPlatform()` 即可（无需 Provider）。
 */
export function useCasualPlatform(): CasualPlatformValue {
  const { user } = useUserManager();
  const uid = user?.uid;
  const token = user?.token;

  useEffect(() => {
    syncLive(uid);
  }, [uid]);

  const snap = useSyncExternalStore(subscribeStore, getDataSnapshot, getServerDataSnapshot);

  const refreshCasualPlayer = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid || !user?.token) {
      patchData({ casualPlayer: null });
      return;
    }
    try {
      const result = await http.action(casualPlatformApi.service.auth.authenticate, {
        uid: user.uid,
        token: user.token,
      });
      patchData({ casualPlayer: casualPlayerSummaryFromAuth(result) });
    } catch (e) {
      console.error("[CasualPlatform] authenticate", e);
      patchData({ casualPlayer: null });
    }
  }, [user?.uid, user?.token]);

  useEffect(() => {
    void refreshCasualPlayer();
  }, [refreshCasualPlayer]);

  const joinTournament = useCallback(
    async (tournamentId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return null;
      try {
        return await http.mutation(casualPlatformApi.service.casualTournamentService.joinTournament, {
          uid: user.uid,
          tournamentId,
        });
      } catch (e) {
        console.error("[CasualPlatform] joinTournament", e);
        return { ok: false as const, error: "join_failed" };
      }
    },
    [user?.uid]
  );

  const fetchLeaderboard = useCallback(async (tournamentId: string, limit?: number) => {
    const http = getCasualHttpClient();
    if (!http) return [];
    try {
      return await http.query(casualPlatformApi.service.casualTournamentService.leaderboard, {
        tournamentId,
        limit,
      });
    } catch (e) {
      console.error("[CasualPlatform] leaderboard", e);
      return [];
    }
  }, []);

  const fetchMainSeasonLeaderboard = useCallback(async (seasonId: string, limit?: number) => {
    const http = getCasualHttpClient();
    if (!http) return [];
    try {
      return await http.query(casualPlatformApi.service.casualSeasonService.mainSeasonLeaderboard, {
        seasonId,
        limit,
      });
    } catch (e) {
      console.error("[CasualPlatform] mainSeasonLeaderboard", e);
      return [];
    }
  }, []);

  const fetchCArenaLeaderboard = useCallback(async (seasonId: string, limit?: number) => {
    const http = getCasualHttpClient();
    if (!http) return [];
    try {
      return await http.query(casualPlatformApi.service.casualSeasonService.cArenaLeaderboard, {
        seasonId,
        limit,
      });
    } catch (e) {
      console.error("[CasualPlatform] cArenaLeaderboard", e);
      return [];
    }
  }, []);

  const submitCasualRun = useCallback(
    async (input: {
      tournamentId: string;
      gameId: string;
      score: number;
      externalGameId?: string;
    }) => {
      const http = getCasualHttpClient();
      if (!http || !user?.token) {
        return { ok: false, error: "no_auth" };
      }
      try {
        const res = await http.action(casualPlatformApi.service.casualTournamentActions.submitScore, {
          token: user.token,
          tournamentId: input.tournamentId,
          gameId: input.gameId,
          score: input.score,
          externalGameId: input.externalGameId,
        });
        if (res?.ok) return { ok: true };
        return { ok: false, error: res?.error ?? "submit_failed" };
      } catch (e) {
        console.error("[CasualPlatform] submitCasualRun", e);
        return { ok: false, error: "submit_failed" };
      }
    },
    [user?.token]
  );

  const claimSeasonMission = useCallback(
    async (taskId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.casualTaskService.claimSeasonMission, {
          uid: user.uid,
          taskId,
        });
      } catch (e) {
        console.error("[CasualPlatform] claimSeasonMission", e);
        return { ok: false, error: "claim_failed" };
      }
    },
    [user?.uid]
  );

  const claimPassLevel = useCallback(
    async (input: { seasonId: string; track: "free" | "standard" | "deluxe"; level: number }) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.casualSeasonService.claimPassLevel, {
          uid: user.uid,
          ...input,
        });
      } catch (e) {
        console.error("[CasualPlatform] claimPassLevel", e);
        return { ok: false, error: "claim_failed" };
      }
    },
    [user?.uid]
  );

  const purchaseShopSku = useCallback(
    async (skuId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.casualShopService.purchaseSku, {
          uid: user.uid,
          skuId,
        });
      } catch (e) {
        console.error("[CasualPlatform] purchaseShopSku", e);
        return { ok: false, error: "purchase_failed" };
      }
    },
    [user?.uid]
  );

  const fulfillIapShopPurchase = useCallback(
    async (skuId: string, paymentRef: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.casualShopService.fulfillIapShopPurchase, {
          uid: user.uid,
          skuId,
          paymentRef,
        });
      } catch (e) {
        console.error("[CasualPlatform] fulfillIapShopPurchase", e);
        return { ok: false, error: "purchase_failed" };
      }
    },
    [user?.uid]
  );

  const redeemSeasonShelfSku = useCallback(
    async (skuId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.casualSeasonShelfService.redeemSeasonShelfSku, {
          uid: user.uid,
          skuId,
        });
      } catch (e) {
        console.error("[CasualPlatform] redeemSeasonShelfSku", e);
        return { ok: false, error: "redeem_failed" };
      }
    },
    [user?.uid]
  );

  const openFixedChest = useCallback(
    async (chestId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.casualFixedChestService.openFixedChest, {
          uid: user.uid,
          chestId,
        });
      } catch (e) {
        console.error("[CasualPlatform] openFixedChest", e);
        return { ok: false, error: "open_failed" };
      }
    },
    [user?.uid]
  );

  const devUnlockPassTrack = useCallback(
    async (input: { seasonId: string; track: "standard" | "deluxe" }) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.casualSeasonService.devUnlockPassTrack, {
          uid: user.uid,
          ...input,
        });
      } catch (e) {
        console.error("[CasualPlatform] devUnlockPassTrack", e);
        return { ok: false, error: "unlock_failed" };
      }
    },
    [user?.uid]
  );

  const activitiesView = shouldUseMockCasualActivities()
    ? getMockCasualActivitiesForUiDemo()
    : snap.activities;

  return useMemo(
    () => ({
      ...snap,
      activities: activitiesView,
      refreshCasualPlayer,
      joinTournament,
      fetchLeaderboard,
      fetchMainSeasonLeaderboard,
      fetchCArenaLeaderboard,
      submitCasualRun,
      claimSeasonMission,
      claimPassLevel,
      purchaseShopSku,
      fulfillIapShopPurchase,
      redeemSeasonShelfSku,
      openFixedChest,
      devUnlockPassTrack,
    }),
    [
      snap,
      activitiesView,
      refreshCasualPlayer,
      joinTournament,
      fetchLeaderboard,
      fetchMainSeasonLeaderboard,
      fetchCArenaLeaderboard,
      submitCasualRun,
      claimSeasonMission,
      claimPassLevel,
      purchaseShopSku,
      fulfillIapShopPurchase,
      redeemSeasonShelfSku,
      openFixedChest,
      devUnlockPassTrack,
    ]
  );
}
