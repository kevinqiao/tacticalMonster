import { api as casualPlatformApi } from "@/convex/casualPlatform/convex/_generated/api";
import type { Id } from "@/convex/casualPlatform/convex/_generated/dataModel";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { useUserManager } from "host/service/UserManager";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import type { CasualActivityPublicRow } from "./casualActivityTypes";
import { getMockCasualActivitiesForUiDemo, shouldUseMockCasualActivities } from "./casualActivityMock";
import type { OpenCasualRunAssignment } from "./casualOpenRunAssignment";
import { casualInstanceFns, casualSkinFns, casualTournamentFns } from "./casualConvexFunctionRefs";
import type { TriathlonSessionProgress } from "component/battle/games/shared/casualTriathlonSubmitFlow";

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
  };
}

import type { CasualAsyncTableSummaryUI } from '@/component/battle/games/shared/casualAsyncTableSummaryUI';

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
  gameType: string;
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
    seasonVoucher?: number;
  } | null;
  rewardsClaimedAt?: number | null;
  /** 周期型锦标：本局所属桶 key（若有） */
  periodInstanceKey?: string;
  /** 周期型锦标模板 */
  periodTournament?: boolean;
  /** `score_tier_pending`：单条 `claimCasualScoreTierPendingReward`，多档合并行 `claimCasualScoreTierPendingRewardsBatch`；`instance_close_pending`：`claimCasualInstanceRewards`；否则 `claimCasualRunRewards` */
  historyRewardKind?: "run_pending" | "score_tier_pending" | "instance_close_pending";
  /** 分档阈值（仅单档一行 `score_tier_pending`） */
  scoreTierMinScore?: number;
  /** 多档合并行：各档阈值（与 `title` 中分档文案一致） */
  scoreTierMinScores?: number[];
  /** 多档合并行待领：对应 `casual_score_tier_pending` 文档 id（一次性领取）；单档行省略 */
  scoreTierPendingIds?: string[];
  /** 对局 `gameId`（`game_${matchId}_${uid}`），仅 `score_tier_pending` */
  matchGameId?: string;
  /** match_3：历史页对局报告（含各对手/补位 watchContext） */
  tableSummary?: CasualAsyncTableSummaryUI;
}

/** @deprecated 周期关桶记录已并入 `gameHistory`（`historyRewardKind === "instance_close_pending"`）；仍可从 Convex `listInstancePendingRewards` 查询。 */
export interface CasualInstanceClaimRow {
  instancePlayerStateId: string;
  templateId: string;
  title: string;
  instanceKey: string;
  matchType?: string;
  finalRank: number | null;
  aggregatedScore: number | null;
  canClaim: boolean;
  pendingInstanceRewards?: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  };
  /** 已领取周期奖励的时间（毫秒） */
  rewardsClaimedAt?: number | null;
  /** 该周期桶结束时间（与实例 `endsAt` 一致） */
  periodEndedAt?: number;
}

export interface CasualPlatformValue {
  convexUrl: string;
  casualPlayer: CasualPlayerSummary | null;
  activities: CasualActivityPublicRow[];
  tournaments: Array<{
    tournamentId: string;
    title: string;
    gameType: string;
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
    tracksPurchased?: { standard?: boolean; deluxe?: boolean };
    claimed?: Array<{ track: "free" | "standard" | "deluxe"; level: number }>;
  } | null;
  /** @deprecated 赛季天梯 UI 已替换为周联赛 */
  seasonLadderSnapshot: {
    seasonId: string;
    points: number;
    tierId: string;
    rankInTier: number;
    tierSize: number;
  } | null;
  /** 周联赛快照（cohort 排名 / 当周 XP） */
  weeklyLeagueSnapshot: {
    weekKey: string;
    leagueTierId: string;
    peakLeagueTier: string;
    weeklyLeagueXp: number;
    cohortRank: number;
    cohortSize: number;
    unreadCloseResult: boolean;
    pendingRewards?: {
      coins?: number;
      gems?: number;
      seasonVoucher?: number;
    };
    lastOutcome?: "promote" | "safe" | "demote";
  } | null;
  shopSkus: Array<{
    skuId: string;
    title: string;
    skuKind?: "virtual" | "iap" | "skin";
    iapPriceLabel?: string;
    priceCoins?: number;
    priceGems?: number;
    grantCoins?: number;
    grantGems?: number;
    grantSkinId?: string;
    grantReplayTokenCount?: number;
  }>;
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
  /** `service.tournament.casualTournamentService.gameHistory`：非周期 run、周期分档预发奖、周期桶关桶待领（同一列表） */
  gameHistory: CasualGameHistoryRow[];
  /** `listOpenCasualRunAssignments`：Convex live 订阅，匹配开出 `open` 对局时自动更新 */
  openRunAssignments: OpenCasualRunAssignment[];
  /** `listCasualMatchQueueForUid`：匹配排队中（`waiting` / `claiming`） */
  matchQueueEntries: Array<{
    templateId: string;
    status: "waiting" | "claiming";
    waitingForPeer: boolean;
    expiresAt?: number;
    createdAt: number;
  }>;
  refreshCasualPlayer: () => Promise<void>;
  /** HTTP 拉取通行证进度（领取后订阅偶发滞后时用） */
  refreshPassProgress: () => Promise<void>;
  refreshSeasonMissions: () => Promise<void>;
  refreshCheckinStreak: () => Promise<void>;
  joinTournament: (
    tournamentId: string,
    opts?: { dailySoloCostAck?: true }
  ) => Promise<import("./casualJoinTournamentFlow").CasualJoinTournamentMutationResult>;
  /** 与 join 一致的入场扣费预览（有消耗时 Play 先弹窗） */
  fetchJoinEntryChargePreview: (tournamentId: string) => Promise<
    | {
        ok: true;
        willChargeEntry: boolean;
        dueCoins: number;
        dueGems: number;
        dueVouchers: number;
        entryKind: "none" | "coins" | "gems" | "seasonVouchers";
      }
    | { ok: false; error: string }
    | null
  >;
  /** partial 同桌榜轮询（bot matching/playing → scored） */
  fetchCasualTableSummaryForGame: (
    matchGameId: string
  ) => Promise<import("../../battle/games/shared/casualAsyncTableSummaryUI").CasualAsyncTableSummaryUI | null>;
  /** 一次性 HTTP 读开放 run（并写入 store）；日常请用 `openRunAssignments` 订阅 */
  fetchOpenCasualRunAssignments: () => Promise<OpenCasualRunAssignment[]>;
  /** 三场合战：已完成局分数 + 当前 open 局（重进 session 恢复累计分） */
  fetchTriathlonSessionProgress: (
    matchGameId: string
  ) => Promise<TriathlonSessionProgress | null>;
  /** 退出匹配队列（仅 `waiting`；`claiming` 时返回 `cannot_leave_claiming`） */
  leaveCasualMatchQueue: (
    templateId?: string
  ) => Promise<{ ok: true; removed?: number } | { ok: false; error: string }>;
  fetchLeaderboard: (
    tournamentId: string,
    limit?: number,
    instanceKey?: string
  ) => Promise<Array<{ rank: number; uid: string; score: number; submittedAt?: number }>>;
  /** 当前周期桶内本人聚合分与名次（周期型模板；与榜同源） */
  fetchPeriodInstanceSelfStanding: (
    tournamentId: string,
    uid: string
  ) => Promise<{
    instanceKey: string | null;
    myBestScore: number | null;
    myRank: number | null;
  }>;
  fetchGameHistory: (limit?: number) => Promise<CasualGameHistoryRow[]>;
  /** 历史页领取异步 run 结算奖励（`casual_run_player_tournaments.pendingRunRewards`） */
  claimCasualRunRewards: (
    playerTournamentId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  /** 历史页领取周期场分档预发奖（`casual_score_tier_pending`，单条） */
  claimCasualScoreTierPendingReward: (
    pendingRewardId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  /** 历史页同一局多档合并领取 */
  claimCasualScoreTierPendingRewardsBatch: (
    pendingRewardIds: string[]
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
  /** 指定 `gameId` 在本赛季的累计积分榜（`seasonId` 可省略，用当前激活赛季） */
  fetchGameSeasonLeaderboard: (
    seasonId: string | undefined,
    gameId: string,
    limit?: number
  ) => Promise<Array<{ rank: number; uid: string; points: number }>>;
  fetchWeeklyLeagueCohort: () => Promise<{
    members: Array<{
      uid: string;
      weeklyLeagueXp: number;
      rank: number;
      isBot?: boolean;
      rowState?: "active" | "matching";
    }>;
    matching: { total: number; bots: number; humans: number };
  }>;
  ensureWeeklyLeagueMember: () => Promise<{ ok: boolean }>;
  claimWeeklyLeagueRewards: () => Promise<{ ok: boolean; error?: string }>;
  dismissWeeklyLeagueClose: () => Promise<{ ok: boolean }>;
  listPlayerAchievements: () => Promise<{
    achievements: Array<{ achievementId: string; unlockedAt: number }>;
    peakLeagueTier: string;
    seasonPeakLeagueTier?: string;
  } | null>;
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
  /** 放弃再战并确认成绩；A 场单人桌会立即最终结算 */
  confirmCasualRunWithoutReplay: (matchGameId: string) => Promise<{
    ok: boolean;
    error?: string;
    confirmed?: boolean;
    finalized?: boolean;
    pendingOthers?: boolean;
    deduped?: boolean;
  }>;
  /** 把配表中新 SKU 补进 DB（如再战令）；打开商店时会自动调用 */
  syncShopCatalogSkus: () => Promise<{ ok: boolean; seeded?: boolean; inserted?: number }>;
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
  openFixedChest: (chestId: string) => Promise<{ ok: boolean; error?: string; grants?: unknown }>;
  devUnlockPassTrack: (input: {
    seasonId: string;
    track: "standard" | "deluxe";
  }) => Promise<{ ok: boolean; error?: string }>;
  skinState: CasualPlayerSkinState | null;
  equipSkin: (input: { slot: string; skinId: string }) => Promise<{ ok: boolean; error?: string }>;
  refreshSkinState: () => Promise<void>;
}

export interface CasualSkinEntitlements {
  seasonId: string;
  uiTier: "free" | "standard" | "deluxe";
  townLayer: "none" | "env" | "accent" | "facade" | "full";
  townVariant: "standard" | "deluxe";
  passLevel: number;
  cssThemeKey: string;
}

export interface CasualPlayerSkinState {
  seasonId: string;
  owned: Array<{ skinId: string; grantedAt: number; source: string; seasonId?: string }>;
  effectiveOwned: string[];
  equipped: Record<string, string>;
  entitlements: CasualSkinEntitlements;
  catalog: Array<{
    skinId: string;
    name: string;
    type: string;
    seasonId?: string;
    appliesToGameIds: string[];
  }>;
}

type CasualDataSnapshot = Pick<
  CasualPlatformValue,
  | "convexUrl"
  | "casualPlayer"
  | "activities"
  | "tournaments"
  | "seasons"
  | "passProgress"
  | "seasonLadderSnapshot"
  | "weeklyLeagueSnapshot"
  | "missions"
  | "checkinStreak"
  | "shopSkus"
  | "gameHistory"
  | "openRunAssignments"
  | "matchQueueEntries"
  | "skinState"
>;

function emptyData(): CasualDataSnapshot {
  return {
    convexUrl: CASUAL_CONVEX_URL,
    casualPlayer: null,
    activities: [],
    tournaments: [],
    seasons: [],
    passProgress: null,
    seasonLadderSnapshot: null,
    weeklyLeagueSnapshot: null,
    missions: [],
    checkinStreak: null,
    shopSkus: [],
    gameHistory: [],
    openRunAssignments: [],
    matchQueueEntries: [],
    skinState: null,
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

/**
 * Join mutation 已扣费且返回 `coinsCharged` 等时，下一次 `authenticate` 拉取前先把本地 HUD/Play 余额对齐，
 * 避免「已确认扣费但界面仍是旧数」的观感（尤其 `openModal` 遮挡前的一帧）。
 */
function applyLocalWalletAfterJoinDeduction(meta: {
  coinsCharged?: number;
  gemsCharged?: number;
  vouchersCharged?: number;
}) {
  const { casualPlayer: prev, passProgress: pp } = getDataSnapshot();
  if (prev) {
    const nextPlayer = { ...prev };
    let playerDirty = false;
    if (typeof meta.coinsCharged === "number" && meta.coinsCharged > 0) {
      nextPlayer.coins = Math.max(0, (nextPlayer.coins ?? 0) - meta.coinsCharged);
      playerDirty = true;
    }
    if (typeof meta.gemsCharged === "number" && meta.gemsCharged > 0) {
      nextPlayer.gems = Math.max(0, (nextPlayer.gems ?? 0) - meta.gemsCharged);
      playerDirty = true;
    }
    if (playerDirty) {
      patchData({ casualPlayer: nextPlayer });
    }
  }
  if (pp && typeof meta.vouchersCharged === "number" && meta.vouchersCharged > 0) {
    patchData({
      passProgress: {
        ...pp,
        seasonVouchers: Math.max(0, (pp.seasonVouchers ?? 0) - meta.vouchersCharged),
      },
    });
  }
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
      activities: [],
      gameHistory: [],
      openRunAssignments: [],
      matchQueueEntries: [],
      skinState: null,
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

  if (uid) {
    sub(
      casualPlatformApi.service.season.casualSeasonService.getPassProgress,
      { uid },
      (row) => patchData({ passProgress: (row as CasualPlatformValue["passProgress"]) ?? null }),
      "getPassProgress"
    );
    sub(
      casualPlatformApi.service.weeklyLeague.casualWeeklyLeagueQueries.getWeeklyLeagueSnapshot,
      { uid },
      (row) =>
        patchData({
          weeklyLeagueSnapshot: (row as CasualPlatformValue["weeklyLeagueSnapshot"]) ?? null,
        }),
      "getWeeklyLeagueSnapshot"
    );
    sub(
      casualPlatformApi.service.season.casualSeasonService.getSeasonLadderSnapshot,
      { uid },
      (row) =>
        patchData({
          seasonLadderSnapshot: (row as CasualPlatformValue["seasonLadderSnapshot"]) ?? null,
        }),
      "getSeasonLadderSnapshot"
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
      casualTournamentFns.listOpenCasualRunAssignments,
      { uid },
      (rows) =>
        patchData({
          openRunAssignments: Array.isArray(rows) ? (rows as OpenCasualRunAssignment[]) : [],
        }),
      "listOpenCasualRunAssignments"
    );
    sub(
      casualTournamentFns.listCasualMatchQueueForUid,
      { uid },
      (rows) =>
        patchData({
          matchQueueEntries: Array.isArray(rows)
            ? (rows as CasualPlatformValue["matchQueueEntries"])
            : [],
        }),
      "listCasualMatchQueueForUid"
    );
    sub(
      casualSkinFns.getPlayerSkinState,
      { uid },
      (row) => patchData({ skinState: (row as CasualPlayerSkinState) ?? null }),
      "getPlayerSkinState"
    );
  } else {
    patchData({
      passProgress: null,
      weeklyLeagueSnapshot: null,
      seasonLadderSnapshot: null,
      missions: [],
      checkinStreak: null,
      gameHistory: [],
      openRunAssignments: [],
      matchQueueEntries: [],
      skinState: null,
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
    async (tournamentId: string, opts?: { dailySoloCostAck?: true }) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return null;
      try {
        const result = await http.action(casualTournamentFns.joinTournament, {
          uid: user.uid,
          tournamentId,
          ...(opts?.dailySoloCostAck ? { dailySoloCostAck: true as const } : {}),
        });
        if (result?.ok === true && result.queued === false) {
          const m = result as {
            coinsCharged?: number;
            gemsCharged?: number;
            vouchersCharged?: number;
          };
          if (
            (typeof m.coinsCharged === "number" && m.coinsCharged > 0) ||
            (typeof m.gemsCharged === "number" && m.gemsCharged > 0) ||
            (typeof m.vouchersCharged === "number" && m.vouchersCharged > 0)
          ) {
            applyLocalWalletAfterJoinDeduction(m);
          }
        }
        return result;
      } catch (e) {
        console.error("[CasualPlatform] joinTournament", e);
        return { ok: false as const, error: "join_failed" };
      }
    },
    [user?.uid]
  );

  const fetchJoinEntryChargePreview = useCallback(
    async (tournamentId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return null;
      try {
        return await http.query(casualTournamentFns.previewJoinEntryCharge, {
          uid: user.uid,
          tournamentId,
        });
      } catch (e) {
        console.error("[CasualPlatform] previewJoinEntryCharge", e);
        return { ok: false as const, error: "preview_failed" };
      }
    },
    [user?.uid]
  );

  const fetchCasualTableSummaryForGame = useCallback(
    async (matchGameId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return null;
      try {
        const row = await http.query(casualTournamentFns.getCasualAsyncTableSummaryForGame, {
          uid: user.uid,
          matchGameId,
        });
        if (!row || typeof row !== "object" || !Array.isArray((row as { rows?: unknown }).rows)) {
          return null;
        }
        return row as import("../../battle/games/shared/casualAsyncTableSummaryUI").CasualAsyncTableSummaryUI;
      } catch (e) {
        console.warn("[CasualPlatform] getCasualAsyncTableSummaryForGame", e);
        return null;
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

  const fetchPeriodInstanceSelfStanding = useCallback(
    async (tournamentId: string, uid: string) => {
      const http = getCasualHttpClient();
      if (!http) {
        return { instanceKey: null, myBestScore: null, myRank: null };
      }
      try {
        const row = await http.query(casualTournamentFns.periodInstanceSelfStanding, {
          tournamentId,
          uid,
        });
        const r = row as {
          instanceKey?: string | null;
          myBestScore?: number | null;
          myRank?: number | null;
        };
        return {
          instanceKey: r?.instanceKey ?? null,
          myBestScore: typeof r?.myBestScore === "number" ? r.myBestScore : null,
          myRank: typeof r?.myRank === "number" ? r.myRank : null,
        };
      } catch (e) {
        console.error("[CasualPlatform] periodInstanceSelfStanding", e);
        return { instanceKey: null, myBestScore: null, myRank: null };
      }
    },
    []
  );

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
      const rows = await http.query(casualTournamentFns.listOpenCasualRunAssignments, {
        uid: user.uid,
      });
      const list = Array.isArray(rows) ? (rows as OpenCasualRunAssignment[]) : [];
      patchData({ openRunAssignments: list });
      return list;
    } catch (e) {
      console.error("[CasualPlatform] listOpenCasualRunAssignments", e);
      return [];
    }
  }, [user?.uid]);

  const fetchTriathlonSessionProgress = useCallback(
    async (matchGameId: string): Promise<TriathlonSessionProgress | null> => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid || !matchGameId.trim()) return null;
      try {
        const row = await http.query(casualTournamentFns.getTriathlonSessionProgress, {
          uid: user.uid,
          matchGameId: matchGameId.trim(),
        });
        return (row as TriathlonSessionProgress | null) ?? null;
      } catch (e) {
        console.error("[CasualPlatform] getTriathlonSessionProgress", e);
        return null;
      }
    },
    [user?.uid]
  );

  const leaveCasualMatchQueue = useCallback(
    async (templateId?: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false as const, error: "no_auth" };
      try {
        const res = await http.mutation(casualTournamentFns.leaveCasualMatchQueue, {
          uid: user.uid,
          ...(templateId?.trim() ? { templateId: templateId.trim() } : {}),
        });
        const r = res as { ok?: boolean; error?: string; removed?: number };
        if (r?.ok) {
          const scope = templateId?.trim();
          patchData({
            matchQueueEntries: getDataSnapshot().matchQueueEntries.filter(
              (e) => e.status !== "waiting" || (scope ? e.templateId !== scope : false)
            ),
          });
          return { ok: true as const, removed: r.removed };
        }
        return { ok: false as const, error: r?.error ?? "leave_failed" };
      } catch (e) {
        console.error("[CasualPlatform] leaveCasualMatchQueue", e);
        return { ok: false as const, error: "leave_failed" };
      }
    },
    [user?.uid]
  );

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

  const claimCasualScoreTierPendingRewardsBatch = useCallback(
    async (pendingRewardIds: string[]) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false as const, error: "no_auth" };
      if (pendingRewardIds.length === 0) return { ok: false as const, error: "empty_batch" };
      try {
        const res = await http.mutation(casualTournamentFns.claimCasualScoreTierPendingRewardsBatch, {
          uid: user.uid,
          pendingRewardIds: pendingRewardIds as Id<"casual_score_tier_pending">[],
        });
        const r = res as { ok?: boolean; error?: string };
        if (r?.ok) {
          void refreshCasualPlayer();
        }
        return r?.ok ? { ok: true as const } : { ok: false as const, error: r?.error ?? "claim_failed" };
      } catch (e) {
        console.error("[CasualPlatform] claimCasualScoreTierPendingRewardsBatch", e);
        return { ok: false as const, error: "claim_failed" };
      }
    },
    [user?.uid, refreshCasualPlayer]
  );

  const claimCasualScoreTierPendingReward = useCallback(
    async (pendingRewardId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false as const, error: "no_auth" };
      try {
        const res = await http.mutation(casualTournamentFns.claimCasualScoreTierPendingReward, {
          uid: user.uid,
          pendingRewardId: pendingRewardId as Id<"casual_score_tier_pending">,
        });
        const r = res as { ok?: boolean; error?: string };
        if (r?.ok) {
          void refreshCasualPlayer();
        }
        return r?.ok ? { ok: true as const } : { ok: false as const, error: r?.error ?? "claim_failed" };
      } catch (e) {
        console.error("[CasualPlatform] claimCasualScoreTierPendingReward", e);
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
      const rows = await http.query(
        casualPlatformApi.service.season.casualSeasonService.seasonLadderLeaderboard,
        { seasonId, limit }
      );
      return (rows as Array<{ rank: number; uid: string; points: number }>).map((r) => ({
        rank: r.rank,
        uid: r.uid,
        points: r.points,
      }));
    } catch (e) {
      console.error("[CasualPlatform] seasonLadderLeaderboard", e);
      return [];
    }
  }, []);

  const fetchCArenaLeaderboard = useCallback(async (_seasonId: string, limit?: number) => {
    const http = getCasualHttpClient();
    if (!http) return [];
    try {
      const rows = await http.query(casualTournamentFns.leaderboard, {
        tournamentId: "casual_async_c_bb",
        limit,
      });
      const list = rows as Array<{ rank?: number; uid: string; score: number }>;
      return list.map((r, i) => ({
        rank: typeof r.rank === "number" ? r.rank : i + 1,
        uid: r.uid,
        points: r.score,
      }));
    } catch (e) {
      console.error("[CasualPlatform] leaderboard (C arena template)", e);
      return [];
    }
  }, []);

  const fetchGameSeasonLeaderboard = useCallback(
    async (seasonId: string | undefined, _gameId: string, limit?: number) => {
      const http = getCasualHttpClient();
      if (!http) return [];
      try {
        const rows = await http.query(
          casualPlatformApi.service.season.casualSeasonService.seasonLadderLeaderboard,
          {
            seasonId: seasonId?.trim() ? seasonId : undefined,
            limit,
          }
        );
        return (rows as Array<{ rank: number; uid: string; points: number }>).map((r) => ({
          rank: r.rank,
          uid: r.uid,
          points: r.points,
        }));
      } catch (e) {
        console.error("[CasualPlatform] seasonLadderLeaderboard", e);
        return [];
      }
    },
    []
  );

  const fetchWeeklyLeagueCohort = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) {
      return { members: [], matching: { total: 0, bots: 0, humans: 0 } };
    }
    try {
      const res = await http.query(
        casualPlatformApi.service.weeklyLeague.casualWeeklyLeagueQueries.listWeeklyLeagueCohort,
        { uid: user.uid }
      );
      const payload = res as {
        members?: Array<{
          uid: string;
          weeklyLeagueXp: number;
          rank: number;
          isBot?: boolean;
          rowState?: "active" | "matching";
        }>;
        matching?: { total: number; bots: number; humans: number };
      };
      return {
        members: Array.isArray(payload.members) ? payload.members : [],
        matching: payload.matching ?? { total: 0, bots: 0, humans: 0 },
      };
    } catch (e) {
      console.error("[CasualPlatform] listWeeklyLeagueCohort", e);
      return { members: [], matching: { total: 0, bots: 0, humans: 0 } };
    }
  }, [user?.uid]);

  const ensureWeeklyLeagueMember = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return { ok: false };
    try {
      const r = await http.mutation(
        casualPlatformApi.service.weeklyLeague.casualWeeklyLeagueQueries.ensureWeeklyLeagueMemberMutation,
        { uid: user.uid }
      );
      return (r as { ok?: boolean }) ?? { ok: false };
    } catch (e) {
      console.error("[CasualPlatform] ensureWeeklyLeagueMember", e);
      return { ok: false };
    }
  }, [user?.uid]);

  const claimWeeklyLeagueRewards = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return { ok: false, error: "not_authenticated" };
    try {
      const r = await http.mutation(
        casualPlatformApi.service.weeklyLeague.casualWeeklyLeagueQueries.claimWeeklyLeagueRewards,
        { uid: user.uid }
      );
      await refreshCasualPlayer();
      return r as { ok: boolean; error?: string };
    } catch (e) {
      console.error("[CasualPlatform] claimWeeklyLeagueRewards", e);
      return { ok: false, error: "claim_failed" };
    }
  }, [user?.uid, refreshCasualPlayer]);

  const dismissWeeklyLeagueClose = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return { ok: false };
    try {
      return (await http.mutation(
        casualPlatformApi.service.weeklyLeague.casualWeeklyLeagueQueries.dismissWeeklyLeagueClose,
        { uid: user.uid }
      )) as { ok: boolean };
    } catch (e) {
      console.error("[CasualPlatform] dismissWeeklyLeagueClose", e);
      return { ok: false };
    }
  }, [user?.uid]);

  const listPlayerAchievements = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) return null;
    try {
      return (await http.query(
        casualPlatformApi.service.achievement.casualAchievementService.listPlayerAchievements,
        { uid: user.uid }
      )) as {
        achievements: Array<{ achievementId: string; unlockedAt: number }>;
        peakLeagueTier: string;
        seasonPeakLeagueTier?: string;
      };
    } catch (e) {
      console.error("[CasualPlatform] listPlayerAchievements", e);
      return null;
    }
  }, [user?.uid]);

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

  const confirmCasualRunWithoutReplay = useCallback(
    async (matchGameId: string) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        return await http.mutation(casualTournamentFns.confirmCasualRunWithoutReplay, {
          uid: user.uid,
          matchGameId,
        });
      } catch (e) {
        console.error("[CasualPlatform] confirmCasualRunWithoutReplay", e);
        return { ok: false, error: "confirm_failed" };
      }
    },
    [user?.uid]
  );

  const syncShopCatalogSkus = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http) return { ok: false };
    try {
      return await http.mutation(casualPlatformApi.service.shop.casualShopService.syncShopCatalogSkus, {});
    } catch (e) {
      console.error("[CasualPlatform] syncShopCatalogSkus", e);
      return { ok: false };
    }
  }, []);

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

  const refreshSkinState = useCallback(async () => {
    const http = getCasualHttpClient();
    if (!http || !user?.uid) {
      patchData({ skinState: null });
      return;
    }
    try {
      const row = await http.query(casualSkinFns.getPlayerSkinState, { uid: user.uid });
      patchData({ skinState: (row as CasualPlayerSkinState) ?? null });
    } catch (e) {
      console.error("[CasualPlatform] getPlayerSkinState refresh", e);
    }
  }, [user?.uid]);

  const equipSkin = useCallback(
    async (input: { slot: string; skinId: string }) => {
      const http = getCasualHttpClient();
      if (!http || !user?.uid) return { ok: false, error: "no_auth" };
      try {
        const res = await http.mutation(casualSkinFns.equipSkin, {
          uid: user.uid,
          slot: input.slot,
          skinId: input.skinId,
        });
        const r = res as { ok?: boolean; error?: string };
        if (r?.ok) void refreshSkinState();
        return r?.ok ? { ok: true } : { ok: false, error: r?.error ?? "equip_failed" };
      } catch (e) {
        console.error("[CasualPlatform] equipSkin", e);
        return { ok: false, error: "equip_failed" };
      }
    },
    [user?.uid, refreshSkinState]
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
      fetchJoinEntryChargePreview,
      fetchCasualTableSummaryForGame,
      fetchLeaderboard,
      fetchPeriodInstanceSelfStanding,
      fetchGameHistory,
      fetchOpenCasualRunAssignments,
      fetchTriathlonSessionProgress,
      leaveCasualMatchQueue,
      claimCasualRunRewards,
      claimCasualScoreTierPendingReward,
      claimCasualScoreTierPendingRewardsBatch,
      claimCasualInstanceRewards,
      fetchMainSeasonLeaderboard,
      fetchCArenaLeaderboard,
      fetchGameSeasonLeaderboard,
      fetchWeeklyLeagueCohort,
      ensureWeeklyLeagueMember,
      claimWeeklyLeagueRewards,
      dismissWeeklyLeagueClose,
      listPlayerAchievements,
      submitCasualRun,
      claimSeasonMission,
      touchDailyLoginMission,
      claimPassLevel,
      confirmCasualRunWithoutReplay,
      syncShopCatalogSkus,
      purchaseShopSku,
      fulfillIapShopPurchase,
      openFixedChest,
      devUnlockPassTrack,
      equipSkin,
      refreshSkinState,
    }),
    [
      snap,
      activitiesView,
      refreshCasualPlayer,
      refreshPassProgress,
      refreshSeasonMissions,
      refreshCheckinStreak,
      joinTournament,
      fetchJoinEntryChargePreview,
      fetchCasualTableSummaryForGame,
      fetchLeaderboard,
      fetchPeriodInstanceSelfStanding,
      fetchGameHistory,
      fetchOpenCasualRunAssignments,
      fetchTriathlonSessionProgress,
      leaveCasualMatchQueue,
      claimCasualRunRewards,
      claimCasualScoreTierPendingReward,
      claimCasualScoreTierPendingRewardsBatch,
      claimCasualInstanceRewards,
      fetchMainSeasonLeaderboard,
      fetchCArenaLeaderboard,
      fetchGameSeasonLeaderboard,
      fetchWeeklyLeagueCohort,
      ensureWeeklyLeagueMember,
      claimWeeklyLeagueRewards,
      dismissWeeklyLeagueClose,
      listPlayerAchievements,
      submitCasualRun,
      claimSeasonMission,
      touchDailyLoginMission,
      claimPassLevel,
      confirmCasualRunWithoutReplay,
      syncShopCatalogSkus,
      purchaseShopSku,
      fulfillIapShopPurchase,
      openFixedChest,
      devUnlockPassTrack,
      equipSkin,
      refreshSkinState,
    ]
  );
}
