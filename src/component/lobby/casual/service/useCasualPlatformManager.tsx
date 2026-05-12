import type { SeasonShelfSku } from "@/convex/casualPlatform/convex/data/casualSeasonShelfCatalog";
import type { Id } from "@/convex/casualPlatform/convex/_generated/dataModel";
import { api as casualPlatformApi } from "@/convex/casualPlatform/convex/_generated/api";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { useUserManager } from "host/service/UserManager";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import type { CasualActivityPublicRow } from "./casualActivityTypes";
import { getMockCasualActivitiesForUiDemo, shouldUseMockCasualActivities } from "./casualActivityMock";
import { casualInstanceFns, casualTournamentFns } from "./casualConvexFunctionRefs";

const _casualUrlRaw = import.meta.env.VITE_CONVEX_URL_CASUAL;
const CASUAL_CONVEX_URL =
  typeof _casualUrlRaw === "string" && _casualUrlRaw.trim() !== ""
    ? _casualUrlRaw.trim()
    : "https://amicable-alpaca-980.convex.cloud";

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

export interface CasualGameHistoryRow {
  entryId: string;
  /** `casual_run_tournaments` 文档 id（本场 join 实例） */
  runTournamentId?: string;
  tournamentId: string;
  title: string;
  gameId: string;
  matchType: string;
  score: number | null;
  submittedAt: number | null;
  entryStatus: "joined" | "submitted";
  /** run 创建时间（与 casual_run_tournaments.createdAt 对齐） */
  runStartedAt?: number;
  /** 结算名次（Solitaire 含虚拟对手重算；其它玩法用 `casual_run_player_matches.rank`） */
  rank?: number | null;
  /** 本场总人数（`casual_run_player_matches`：真人 + 机器人） */
  participantCount?: number;
  /** 有待领取的 `pendingRunRewards` 且未领取 */
  canClaimReward?: boolean;
  pendingRunRewards?: {
    coins?: number;
    gems?: number;
    seasonChallengePoints?: number;
    seasonVoucher?: number;
  } | null;
  rewardsClaimedAt?: number | null;
  /** 周期型锦标：本局所属桶 key（若有） */
  periodInstanceKey?: string;
  /** 周期型锦标模板 */
  periodTournament?: boolean;
}

/** `listInstancePendingRewards`：周期结束后待领（`casual_instance_player_state`） */
export interface CasualInstanceClaimRow {
  instancePlayerStateId: string;
  templateId: string;
  title: string;
  instanceKey: string;
  finalRank: number | null;
  aggregatedScore: number | null;
  canClaim: boolean;
  pendingInstanceRewards?: {
    coins?: number;
    gems?: number;
    seasonChallengePoints?: number;
    seasonVoucher?: number;
  };
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
    instanceScope?: string;
    scoreAggregation?: string;
    entryBilling?: string;
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
    /** 当季赛事券余额（`casual_pass_progress`，与 authenticate 快照一致） */
    seasonVouchers?: number;
    seasonChallengePoints?: number;
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
  /** Convex `listSeasonShelf`（按激活赛季映射 `_s{n}` SKU；前端离线兜底见 `seasonShelfSkusForSeasonId`） */
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
  /** `getCheckinStreak`：7 日连签进度（与签到条 UI 对齐） */
  checkinStreak: {
    streakCount: number;
    lastClaimPeriodKey?: string;
    upcomingDayInCycle: number;
  } | null;
  /** `service.tournament.casualTournamentService.gameHistory`（按 `casual_run_player_tournaments` / run 实例）实时订阅 */
  gameHistory: CasualGameHistoryRow[];
  /** 周期型锦标周期结束待领奖励 */
  instancePendingClaims: CasualInstanceClaimRow[];
  refreshCasualPlayer: () => Promise<void>;
  /** HTTP 拉取通行证进度（领取后订阅偶发滞后时用） */
  refreshPassProgress: () => Promise<void>;
  refreshSeasonMissions: () => Promise<void>;
  refreshCheckinStreak: () => Promise<void>;
  joinTournament: (
    tournamentId: string
  ) => Promise<
    | {
        ok: true;
        runTournamentId: string;
        matchId: string;
        gameId: string;
        templateId: string;
        vouchersCharged?: number;
        coinsCharged?: number;
        gemsCharged?: number;
        activityIds?: string[];
      }
    | { ok: true; queued: true; templateId: string }
    | { ok: false; error?: string }
    | null
  >;
  /** 匹配队列已开出对局时拉取 `gameId`（轮询直至出现 `open` 行） */
  fetchOpenCasualRunAssignments: () => Promise<
    Array<{
      templateId: string;
      gameId: string;
      gameType?: string;
      matchId: string;
      runTournamentId: string;
      createdAt: number;
    }>
  >;
  fetchLeaderboard: (
    tournamentId: string,
    limit?: number,
    instanceKey?: string
  ) => Promise<Array<{ rank: number; uid: string; score: number; submittedAt?: number }>>;
  fetchGameHistory: (limit?: number) => Promise<CasualGameHistoryRow[]>;
  /** 历史页领取异步 run 结算奖励（`casual_run_player_tournaments.pendingRunRewards`） */
  claimCasualRunRewards: (
    playerTournamentId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  claimCasualInstanceRewards: (
    instancePlayerStateId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  fetchMainSeasonLeaderboard: (
    seasonId: string,
    limit?: number
  ) => Promise<Array<{ rank: number; uid: string; points: number }>>;
  fetchCArenaLeaderboard: (
    seasonId: string,
    limit?: number
  ) => Promise<Array<{ rank: number; uid: string; points: number }>>;
  /** 已禁用：run 结算仅允许各游戏 Convex `submitCasualPlatformRun` → casual ingest */
  submitCasualRun: (input: {
    tournamentId: string;
    gameId: string;
    score: number;
    externalGameId?: string;
  }) => Promise<CasualSubmitScoreResult>;
  claimSeasonMission: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
  touchDailyLoginMission: () => Promise<{ ok: boolean; error?: string }>;
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
  | "checkinStreak"
  | "shopSkus"
  | "seasonShelfSkus"
  | "gameHistory"
  | "instancePendingClaims"
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
    checkinStreak: null,
    shopSkus: [],
    seasonShelfSkus: [],
    gameHistory: [],
    instancePendingClaims: [],
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

/** 串行化 `authenticate` action，避免并发写同一 `casual_players` 触发 OCC */
let casualAuthenticateChain: Promise<void> = Promise.resolve();

function enqueueCasualAuthenticate(run: () => Promise<void>): Promise<void> {
  const next = casualAuthenticateChain.then(run);
  casualAuthenticateChain = next.catch(() => {});
  return next;
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
      checkinStreak: null,
      shopSkus: [],
      seasonShelfSkus: [],
      activities: [],
      gameHistory: [],
      instancePendingClaims: [],
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
    casualTournamentFns.listTournaments,
    {},
    (rows) => patchData({ tournaments: (rows as CasualPlatformValue["tournaments"]) ?? [] }),
    "listTournaments"
  );

  sub(
    casualPlatformApi.service.season.casualSeasonService.listSeasons,
    {},
    (rows) => patchData({ seasons: (rows as CasualPlatformValue["seasons"]) ?? [] }),
    "listSeasons"
  );

  sub(
    casualPlatformApi.service.shop.casualShopService.listActiveShopSkus,
    {},
    (rows) => patchData({ shopSkus: (rows as CasualPlatformValue["shopSkus"]) ?? [] }),
    "listActiveShopSkus"
  );

  sub(
    casualPlatformApi.service.activity.casualActivityService.listActiveActivities,
    {},
    (rows) => patchData({ activities: (rows as CasualActivityPublicRow[]) ?? [] }),
    "listActiveActivities"
  );

  sub(
    casualPlatformApi.service.season.casualSeasonShelfService.listSeasonShelf,
    {},
    (rows) => patchData({ seasonShelfSkus: (rows as SeasonShelfSku[]) ?? [] }),
    "listSeasonShelf"
  );

  if (uid) {
    sub(
      casualPlatformApi.service.season.casualSeasonService.getPassProgress,
      { uid },
      (row) => patchData({ passProgress: (row as CasualPlatformValue["passProgress"]) ?? null }),
      "getPassProgress"
    );
    sub(
      casualPlatformApi.service.task.casualTaskService.listSeasonMissions,
      { uid },
      (rows) => patchData({ missions: (rows as CasualPlatformValue["missions"]) ?? [] }),
      "listSeasonMissions"
    );
    sub(
      casualPlatformApi.service.task.casualTaskService.getCheckinStreak,
      { uid },
      (row) =>
        patchData({
          checkinStreak: (row as CasualPlatformValue["checkinStreak"]) ?? null,
        }),
      "getCheckinStreak"
    );
    sub(
      casualTournamentFns.gameHistory,
      { uid, limit: 50 },
      (rows) =>
        patchData({
          gameHistory: Array.isArray(rows) ? (rows as CasualGameHistoryRow[]) : [],
        }),
      "gameHistory"
    );
    sub(
      casualInstanceFns.listInstancePendingRewards,
      { uid, limit: 20 },
      (rows) =>
        patchData({
          instancePendingClaims: Array.isArray(rows) ? (rows as CasualInstanceClaimRow[]) : [],
        }),
      "listInstancePendingRewards"
    );
  } else {
    patchData({
      passProgress: null,
      missions: [],
      checkinStreak: null,
      gameHistory: [],
      instancePendingClaims: [],
    });
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
    await enqueueCasualAuthenticate(async () => {
      try {
        const result = await http.action(casualPlatformApi.service.auth.casualAuth.authenticate, {
          uid: user.uid,
          token: user.token,
        });
        patchData({ casualPlayer: casualPlayerSummaryFromAuth(result) });
      } catch (e) {
        console.error("[CasualPlatform] authenticate", e);
        patchData({ casualPlayer: null });
      }
    });
  }, [user?.uid, user?.token]);

  useEffect(() => {
    void refreshCasualPlayer();
  }, [refreshCasualPlayer]);

  const refreshPassProgress = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) {
      patchData({ passProgress: null });
      return;
    }
    try {
      const row = await http.query(casualPlatformApi.service.season.casualSeasonService.getPassProgress, {
        uid: user.uid,
      });
      patchData({ passProgress: (row as CasualPlatformValue["passProgress"]) ?? null });
    } catch (e) {
      console.error("[CasualPlatform] getPassProgress refresh", e);
    }
  }, [user?.uid]);

  const refreshSeasonMissions = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return;
    try {
      const rows = await http.query(casualPlatformApi.service.task.casualTaskService.listSeasonMissions, {
        uid: user.uid,
      });
      patchData({ missions: (rows as CasualPlatformValue["missions"]) ?? [] });
    } catch (e) {
      console.error("[CasualPlatform] listSeasonMissions refresh", e);
    }
  }, [user?.uid]);

  const refreshCheckinStreak = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return;
    try {
      const row = await http.query(casualPlatformApi.service.task.casualTaskService.getCheckinStreak, {
        uid: user.uid,
      });
      patchData({ checkinStreak: (row as CasualPlatformValue["checkinStreak"]) ?? null });
    } catch (e) {
      console.error("[CasualPlatform] getCheckinStreak refresh", e);
    }
  }, [user?.uid]);

  const joinTournament = useCallback(
    async (tournamentId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return null;
      try {
        return await http.mutation(casualTournamentFns.joinTournament, {
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

  const fetchLeaderboard = useCallback(async (tournamentId: string, limit?: number, instanceKey?: string) => {
    const http = getCasualHttpClient();
    if (!http) return [];
    try {
      return await http.query(casualTournamentFns.leaderboard, {
        tournamentId,
        limit,
        ...(instanceKey ? { instanceKey } : {}),
      });
    } catch (e) {
      console.error("[CasualPlatform] leaderboard", e);
      return [];
    }
  }, []);

  const fetchGameHistory = useCallback(async (limit?: number) => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return [];
    try {
      return await http.query(casualTournamentFns.gameHistory, {
        uid: user.uid,
        limit,
      });
    } catch (e) {
      console.error("[CasualPlatform] gameHistory", e);
      return [];
    }
  }, [user?.uid]);

  const fetchOpenCasualRunAssignments = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return [];
    try {
      return await http.query(casualTournamentFns.listOpenCasualRunAssignments, {
        uid: user.uid,
      });
    } catch (e) {
      console.error("[CasualPlatform] listOpenCasualRunAssignments", e);
      return [];
    }
  }, [user?.uid]);

  const claimCasualRunRewards = useCallback(
    async (playerTournamentId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false as const, error: "no_auth" };
      try {
        const res = await http.mutation(casualTournamentFns.claimCasualRunRewards, {
          uid: user.uid,
          playerTournamentId: playerTournamentId as Id<"casual_run_player_tournaments">,
        });
        const r = res as { ok?: boolean; error?: string };
        if (r?.ok) {
          void refreshCasualPlayer();
        }
        return r?.ok ? { ok: true as const } : { ok: false as const, error: r?.error ?? "claim_failed" };
      } catch (e) {
        console.error("[CasualPlatform] claimCasualRunRewards", e);
        return { ok: false as const, error: "claim_failed" };
      }
    },
    [user?.uid, refreshCasualPlayer]
  );

  const claimCasualInstanceRewards = useCallback(
    async (instancePlayerStateId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false as const, error: "no_auth" };
      try {
        const res = await http.mutation(
          casualInstanceFns.claimCasualInstanceRewards,
          {
            uid: user.uid,
            instancePlayerStateId: instancePlayerStateId as Id<"casual_instance_player_state">,
          }
        );
        const r = res as { ok?: boolean; error?: string };
        if (r?.ok) {
          void refreshCasualPlayer();
        }
        return r?.ok ? { ok: true as const } : { ok: false as const, error: r?.error ?? "claim_failed" };
      } catch (e) {
        console.error("[CasualPlatform] claimCasualInstanceRewards", e);
        return { ok: false as const, error: "claim_failed" };
      }
    },
    [user?.uid, refreshCasualPlayer]
  );

  const fetchMainSeasonLeaderboard = useCallback(async (seasonId: string, limit?: number) => {
    const http = getCasualHttpClient();
    if (!http) return [];
    try {
      return await http.query(casualPlatformApi.service.season.casualSeasonService.mainSeasonLeaderboard, {
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
      return await http.query(casualPlatformApi.service.season.casualSeasonService.cArenaLeaderboard, {
        seasonId,
        limit,
      });
    } catch (e) {
      console.error("[CasualPlatform] cArenaLeaderboard", e);
      return [];
    }
  }, []);

  const submitCasualRun = useCallback(async (_input: {
    tournamentId: string;
    gameId: string;
    score: number;
    externalGameId?: string;
  }) => {
    return {
      ok: false as const,
      error: "casual_run_settlement_disabled_use_game_bridge",
    };
  }, []);

  const claimSeasonMission = useCallback(
    async (taskId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.task.casualTaskService.claimSeasonMission, {
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

  const touchDailyLoginMission = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return { ok: false, error: "no_auth" };
    try {
      return await http.mutation(casualPlatformApi.service.task.casualTaskService.touchDailyLoginMission, {
        uid: user.uid,
      });
    } catch (e) {
      console.error("[CasualPlatform] touchDailyLoginMission", e);
      return { ok: false, error: "touch_failed" };
    }
  }, [user?.uid]);

  const claimPassLevel = useCallback(
    async (input: { seasonId: string; track: "free" | "standard" | "deluxe"; level: number }) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualPlatformApi.service.season.casualSeasonService.claimPassLevel, {
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
        return await http.mutation((casualPlatformApi.service.shop.casualShopService as any).purchaseSku, {
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
        return await http.mutation((casualPlatformApi.service.shop.casualShopService as any).fulfillIapShopPurchase, {
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
        return await http.mutation((casualPlatformApi.service.season.casualSeasonShelfService as any).redeemSeasonShelfSku, {
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
        return await http.mutation(casualPlatformApi.service.chest.casualFixedChestService.openFixedChest, {
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
        return await http.mutation(casualPlatformApi.service.season.casualSeasonService.devUnlockPassTrack, {
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
      refreshPassProgress,
      refreshSeasonMissions,
      refreshCheckinStreak,
      joinTournament,
      fetchLeaderboard,
      fetchGameHistory,
      fetchOpenCasualRunAssignments,
      claimCasualRunRewards,
      claimCasualInstanceRewards,
      fetchMainSeasonLeaderboard,
      fetchCArenaLeaderboard,
      submitCasualRun,
      claimSeasonMission,
      touchDailyLoginMission,
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
      refreshPassProgress,
      refreshSeasonMissions,
      refreshCheckinStreak,
      joinTournament,
      fetchLeaderboard,
      fetchGameHistory,
      fetchOpenCasualRunAssignments,
      claimCasualRunRewards,
      claimCasualInstanceRewards,
      fetchMainSeasonLeaderboard,
      fetchCArenaLeaderboard,
      submitCasualRun,
      claimSeasonMission,
      touchDailyLoginMission,
      claimPassLevel,
      purchaseShopSku,
      fulfillIapShopPurchase,
      redeemSeasonShelfSku,
      openFixedChest,
      devUnlockPassTrack,
    ]
  );
}
