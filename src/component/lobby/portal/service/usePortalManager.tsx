import {
  PORTAL_GAME_REGISTRY,
  PORTAL_GAME_TYPES,
  type RegisteredPortalGameType,
} from "@/convex/portal/convex/data/portalGameRegistry";
import {
  portalTournamentIdForMode,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { useUserManager } from "host/service/UserManager";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { CasualAsyncTableSummaryUI } from "@/component/battle/games/shared/casualAsyncTableSummaryUI";

import { portalTournamentFns } from "./portalConvexFunctionRefs";
import { portalAssignmentMatchesGameType } from "./portalOpenRunHelpers";
import { isOpenCasualRunExpired } from "../../casual/service/casualOpenRunReconcile";
import {
  resolveJoinTournamentOutcome,
  type ResolvedJoinTournamentOutcome,
} from "../../casual/service/casualJoinTournamentFlow";
import {
  casualPlayModalForKind,
  type CasualGameKind,
  type OpenCasualRunAssignment,
} from "../../casual/service/casualOpenRunAssignment";

const _portalUrlRaw = import.meta.env.VITE_CONVEX_URL_PORTAL;
/** 与 `src/convex/portal/.env.local` 中 CONVEX_URL 对齐；可被 VITE_CONVEX_URL_PORTAL 覆盖 */
const DEV_PORTAL_CONVEX_URL = "https://merry-skunk-952.convex.cloud";
export const PORTAL_CONVEX_URL =
  typeof _portalUrlRaw === "string" && _portalUrlRaw.trim() !== ""
    ? _portalUrlRaw.trim()
    : DEV_PORTAL_CONVEX_URL;

export type PortalGameHistoryRow = {
  entryId: string;
  runTournamentId?: string;
  tournamentId: string;
  title: string;
  gameType: string;
  matchType: string;
  score: number | null;
  submittedAt: number | null;
  entryStatus: "joined" | "submitted";
  /** 真人已交分，run 尚未完成结算 */
  settlementPending?: boolean;
  runStartedAt?: number;
  rank?: number | null;
  participantCount?: number;
  pointDelta?: number | null;
  weeklyPointsAfter?: number | null;
  tableSummary?: CasualAsyncTableSummaryUI;
};

export type PortalWeeklyLeaderboardRow = {
  rank: number;
  uid: string;
  points: number;
  matchCount: number;
  displayName: string;
  isBot?: boolean;
  botPersonaId?: string;
  avatarUrl?: string;
};

export type PortalMatchQueueEntry = {
  templateId: string;
  status: "waiting" | "claiming";
  waitingForPeer: boolean;
  expiresAt?: number;
  createdAt: number;
};

export type PortalMyWeeklyPoints = {
  weekKey: string;
  weekEndsAt: number;
  byMode: {
    solo: { points: number; matchCount: number; rank: number | null };
    multi: { points: number; matchCount: number; rank: number | null };
  };
  total: {
    points: number;
    matchCount: number;
    soloPoints: number;
    multiPoints: number;
    rank: number | null;
  };
};

export type PortalWeeklyLeagueTierView = {
  weekKey: string;
  weekEndsAt: number;
  enrolled: boolean;
  tierId: string;
  cohortNo: string | null;
  cohortRank: number | null;
  cohortSize: number;
  points: number;
  promoteTo: number;
  demoteFrom: number;
  projectedCoins: number | null;
  unreadCloseResult: boolean;
  closeWeekKey?: string;
  lastOutcome?: "promote" | "safe" | "demote";
  lastFinalRank?: number;
  unclaimedRewards?: PortalWeeklyLeagueUnclaimedRewards;
};

export type PortalWeeklyLeagueUnclaimedRewards = {
  weekKey: string;
  coins: number;
  outcome?: "promote" | "safe" | "demote";
  finalRank?: number;
};

export type PortalPlayerWallet = {
  coins: number;
  gems: number;
};

export type PortalShopSkuView = {
  skuId: string;
  title: string;
  description: string;
  priceCoins: number;
  grantReplayTokenCount: number;
  weeklyPurchaseLimit: number | null;
  purchasedThisWeek: number;
  remainingThisWeek: number | null;
};

export type PortalShopCatalogView = {
  coins: number;
  skus: PortalShopSkuView[];
};

type PortalDataSnapshot = {
  totalLeaderboard: PortalWeeklyLeaderboardRow[];
  cohortLeaderboard: PortalWeeklyLeaderboardRow[];
  weeklyLeagueTierView: PortalWeeklyLeagueTierView | null;
  playerWallet: PortalPlayerWallet | null;
  shopCatalog: PortalShopCatalogView | null;
  myWeeklyPoints: PortalMyWeeklyPoints | null;
  gameHistory: PortalGameHistoryRow[];
  openRunAssignments: OpenCasualRunAssignment[];
  matchQueueEntries: PortalMatchQueueEntry[];
  weekEndsAt: number | null;
};

const emptyData = (): PortalDataSnapshot => ({
  totalLeaderboard: [],
  cohortLeaderboard: [],
  weeklyLeagueTierView: null,
  playerWallet: null,
  shopCatalog: null,
  myWeeklyPoints: null,
  gameHistory: [],
  openRunAssignments: [],
  matchQueueEntries: [],
  weekEndsAt: null,
});

let dataSnapshot: PortalDataSnapshot = emptyData();
const listeners = new Set<() => void>();

function patchData(p: Partial<PortalDataSnapshot>) {
  dataSnapshot = { ...dataSnapshot, ...p };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export { isValidPortalGameType } from "./portalGameTypeGuards";

export function portalGameDisplayName(gameType: RegisteredPortalGameType): string {
  return PORTAL_GAME_REGISTRY[gameType].displayName;
}

type PortalContextValue = {
  convexUrl: string;
  gameType: RegisteredPortalGameType | null;
  totalLeaderboard: PortalWeeklyLeaderboardRow[];
  cohortLeaderboard: PortalWeeklyLeaderboardRow[];
  weeklyLeagueTierView: PortalWeeklyLeagueTierView | null;
  playerWallet: PortalPlayerWallet | null;
  shopCatalog: PortalShopCatalogView | null;
  myWeeklyPoints: PortalMyWeeklyPoints | null;
  gameHistory: PortalGameHistoryRow[];
  openRunAssignments: OpenCasualRunAssignment[];
  matchQueueEntries: PortalMatchQueueEntry[];
  weekEndsAt: number | null;
  joinTournament: (
    mode: "solo" | "multi",
    opts?: { merchantSlug?: string; campaignSlug?: string; sessionPartnerId?: number }
  ) => Promise<ResolvedJoinTournamentOutcome>;
  leaveCasualMatchQueue: (
    templateId?: string
  ) => Promise<{ ok: true; removed?: number } | { ok: false; error: string }>;
  reconcilePendingHistorySettlements: () => Promise<void>;
  claimPortalWeeklyLeagueRewards: () => Promise<
    | { ok: true; granted?: { coins?: number }; weekKey?: string }
    | { ok: false; error: string }
  >;
  dismissPortalWeeklyLeagueClose: () => Promise<{ ok: boolean }>;
  purchasePortalShopSku: (
    skuId: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  refresh: () => Promise<void>;
  portalSessionReady: boolean;
  getCampaignDailyPlayQuota: (args: {
    campaignId: string;
    maxPlaysPerDay?: number;
    dayTimezone?: string;
  }) => Promise<{
    playsToday: number;
    remainingPlaysToday?: number;
    dayResetsAt: number;
    dayTimezone?: string;
  } | null>;
  getCampaignPlayHistory: (args: {
    campaignId: string;
    limit?: number;
  }) => Promise<
    Array<{
      matchId: string;
      runTournamentId: string;
      gameType: string;
      score: number | null;
      rank: number | null;
      status: "open" | "finished" | "confirmed" | "settled" | "replaying";
      playedAt: number;
      startedAt: number;
    }>
  >;
};

const PortalContext = createContext<PortalContextValue | null>(null);

/** 串行化 `authenticate` action，避免并发写同一 `portal_players` 触发 OCC */
let portalAuthenticateChain: Promise<void> = Promise.resolve();

function enqueuePortalAuthenticate(run: () => Promise<void>): Promise<void> {
  const next = portalAuthenticateChain.then(run);
  portalAuthenticateChain = next.catch(() => {});
  return next;
}

let portalAuthFailedKey = "";

let httpSingleton: ConvexHttpClient | null = null;
let liveSingleton: ConvexClient | null = null;

function getHttp(): ConvexHttpClient | null {
  if (!PORTAL_CONVEX_URL) return null;
  if (!httpSingleton) {
    httpSingleton = new ConvexHttpClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(httpSingleton);
  }
  return httpSingleton;
}

function getLive(): ConvexClient | null {
  if (!PORTAL_CONVEX_URL) return null;
  if (!liveSingleton) {
    liveSingleton = new ConvexClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(liveSingleton);
  }
  return liveSingleton;
}

export function portalPlayModalForGameType(gameType: CasualGameKind) {
  return casualPlayModalForKind(gameType);
}

export const PortalProvider: React.FC<{
  gameType: RegisteredPortalGameType | null;
  children: React.ReactNode;
}> = ({ gameType, children }) => {
  const { user } = useUserManager();
  const uid = user?.uid;
  const [portalSessionReady, setPortalSessionReady] = useState(false);
  const reconcileInFlightRef = useRef(new Set<string>());
  const historySettleInFlightRef = useRef(new Set<string>());
  const snapshot = useSyncExternalStore(subscribe, () => dataSnapshot, () => dataSnapshot);

  const authenticatePortal = useCallback(async (opts?: { force?: boolean }) => {
    const http = getHttp();
    if (!http || !isPlatformAuthed(user)) {
      setPortalSessionReady(false);
      return;
    }
    const platformToken = user!.platformAccessToken!;
    const key = `${user!.uid}:${platformToken}`;
    if (!opts?.force && portalAuthFailedKey === key) {
      setPortalSessionReady(false);
      return;
    }
    await enqueuePortalAuthenticate(async () => {
      try {
        const result = await http.action(portalTournamentFns.authenticatePlayer, {});
        if (result?.uid) {
          portalAuthFailedKey = "";
          setPortalSessionReady(true);
        } else {
          portalAuthFailedKey = key;
          setPortalSessionReady(false);
          console.warn("[Portal] authenticate returned no uid — check portal Convex auth.config / dev server");
        }
      } catch (e) {
        console.error("[Portal] authenticate", e);
        portalAuthFailedKey = key;
        setPortalSessionReady(false);
      }
    });
  }, [user]);

  const refresh = useCallback(async () => {
    if (!uid || !gameType) return;
    await authenticatePortal();
  }, [uid, gameType, authenticatePortal]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const live = getLive();
    if (!live || !gameType || !portalSessionReady || !uid) return;
    void live
      .mutation(portalTournamentFns.ensurePortalWeeklyLeagueMember, { gameType })
      .catch((e) => console.warn("[Portal] ensurePortalWeeklyLeagueMember", e));
  }, [gameType, portalSessionReady, uid]);

  useEffect(() => {
    const live = getLive();
    if (!live || !gameType) return;
    void live
      .mutation(portalTournamentFns.ensureWeeklyBoardBotsForGame, { gameType })
      .catch((e) => console.warn("[Portal] ensureWeeklyBoardBots", e));
    void live
      .mutation(portalTournamentFns.ensureWeeklyTotalPointsForGame, { gameType })
      .catch((e) => console.warn("[Portal] ensureWeeklyTotalPoints", e));
  }, [gameType]);

  useEffect(() => {
    const live = getLive();
    if (!live || !gameType) return;

    const unsubs: Array<{ unsubscribe: () => void }> = [];
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
        (err) => console.error(`[Portal] ${label}`, err)
      );
      unsubs.push(h);
    };

    sub(
      portalTournamentFns.getPortalWeeklyTotalLeaderboard,
      { gameType, limit: 50 },
      (rows) => {
        const r = rows as { rows?: PortalWeeklyLeaderboardRow[]; weekEndsAt?: number };
        patchData({
          totalLeaderboard: r.rows ?? [],
          weekEndsAt: r.weekEndsAt ?? null,
        });
      },
      "totalLeaderboard"
    );

    return () => {
      for (const u of unsubs) u.unsubscribe();
    };
  }, [gameType]);

  useEffect(() => {
    const live = getLive();
    if (!live || !uid || !gameType) {
      patchData({
        myWeeklyPoints: null,
        weeklyLeagueTierView: null,
        playerWallet: null,
        shopCatalog: null,
        cohortLeaderboard: [],
        gameHistory: [],
        openRunAssignments: [],
        matchQueueEntries: [],
      });
      return;
    }
    const unsubs: Array<{ unsubscribe: () => void }> = [];
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
        (err) => console.error(`[Portal] ${label}`, err)
      );
      unsubs.push(h);
    };

    sub(
      portalTournamentFns.getMyWeeklyPoints,
      { gameType },
      (rows) => {
        patchData({ myWeeklyPoints: rows as PortalDataSnapshot["myWeeklyPoints"] });
      },
      "myWeeklyPoints"
    );
    sub(
      portalTournamentFns.getPortalWeeklyLeagueTierView,
      { gameType },
      (rows) => {
        patchData({
          weeklyLeagueTierView: rows as PortalWeeklyLeagueTierView | null,
        });
      },
      "weeklyLeagueTierView"
    );
    sub(
      portalTournamentFns.getPortalPlayerWallet,
      {},
      (rows) => {
        patchData({ playerWallet: rows as PortalPlayerWallet | null });
      },
      "playerWallet"
    );
    sub(
      portalTournamentFns.listPortalShopSkus,
      {},
      (rows) => {
        patchData({ shopCatalog: rows as PortalShopCatalogView | null });
      },
      "shopCatalog"
    );
    sub(
      portalTournamentFns.getPortalWeeklyLeagueCohortLeaderboard,
      { gameType, limit: 50 },
      (rows) => {
        const r = rows as { rows?: PortalWeeklyLeaderboardRow[] };
        patchData({ cohortLeaderboard: r.rows ?? [] });
      },
      "cohortLeaderboard"
    );
    sub(
      portalTournamentFns.gameHistory,
      { gameType, limit: 40 },
      (rows) => {
        patchData({ gameHistory: (rows as PortalGameHistoryRow[]) ?? [] });
      },
      "gameHistory"
    );
    sub(
      portalTournamentFns.listOpenCasualRunAssignments,
      {},
      (rows) => {
        patchData({
          openRunAssignments: Array.isArray(rows) ? (rows as OpenCasualRunAssignment[]) : [],
        });
      },
      "listOpenCasualRunAssignments"
    );
    sub(
      portalTournamentFns.listCasualMatchQueueForUid,
      {},
      (rows) => {
        patchData({
          matchQueueEntries: Array.isArray(rows)
            ? (rows as PortalMatchQueueEntry[])
            : [],
        });
      },
      "listCasualMatchQueueForUid"
    );

    return () => {
      for (const u of unsubs) u.unsubscribe();
    };
  }, [uid, gameType]);

  useEffect(() => {
    const http = getHttp();
    if (!http || !uid || !gameType) return;
    const expired = snapshot.openRunAssignments.filter(
      (a) =>
        portalAssignmentMatchesGameType(a, gameType) && isOpenCasualRunExpired(a)
    );
    if (expired.length === 0) return;
    const key = `${uid}:${gameType}`;
    if (reconcileInFlightRef.current.has(key)) return;
    reconcileInFlightRef.current.add(key);
    void http
      .action(portalTournamentFns.reconcileExpiredOpenCasualRuns, {
        gameType,
        limit: expired.length,
      })
      .catch((e) => console.warn("[Portal] reconcileExpiredOpenCasualRuns", e))
      .finally(() => {
        reconcileInFlightRef.current.delete(key);
      });
  }, [uid, gameType, snapshot.openRunAssignments]);

  const claimPortalWeeklyLeagueRewards = useCallback(async () => {
    const http = getHttp();
    if (!http || !uid || !gameType) {
      return { ok: false as const, error: "no_auth" };
    }
    const weekKey =
      snapshot.weeklyLeagueTierView?.unclaimedRewards?.weekKey ??
      snapshot.weeklyLeagueTierView?.closeWeekKey;
    try {
      const res = (await http.mutation(portalTournamentFns.claimPortalWeeklyLeagueRewards, {
        gameType,
        ...(weekKey ? { weekKey } : {}),
      })) as {
        ok?: boolean;
        error?: string;
        granted?: { coins?: number };
        weekKey?: string;
      };
      if (res?.ok) {
        return {
          ok: true as const,
          granted: res.granted,
          weekKey: res.weekKey,
        };
      }
      return { ok: false as const, error: res?.error ?? "claim_failed" };
    } catch (e) {
      console.error("[Portal] claimPortalWeeklyLeagueRewards", e);
      return { ok: false as const, error: "claim_failed" };
    }
  }, [
    uid,
    gameType,
    snapshot.weeklyLeagueTierView?.unclaimedRewards?.weekKey,
    snapshot.weeklyLeagueTierView?.closeWeekKey,
  ]);

  const dismissPortalWeeklyLeagueClose = useCallback(async () => {
    const http = getHttp();
    if (!http || !uid || !gameType) return { ok: false };
    const weekKey =
      snapshot.weeklyLeagueTierView?.closeWeekKey ??
      snapshot.weeklyLeagueTierView?.unclaimedRewards?.weekKey;
    try {
      const res = (await http.mutation(portalTournamentFns.dismissPortalWeeklyLeagueClose, {
        gameType,
        ...(weekKey ? { weekKey } : {}),
      })) as { ok?: boolean };
      return { ok: Boolean(res?.ok) };
    } catch (e) {
      console.error("[Portal] dismissPortalWeeklyLeagueClose", e);
      return { ok: false };
    }
  }, [
    uid,
    gameType,
    snapshot.weeklyLeagueTierView?.closeWeekKey,
    snapshot.weeklyLeagueTierView?.unclaimedRewards?.weekKey,
  ]);

  const purchasePortalShopSku = useCallback(
    async (skuId: string) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false as const, error: "no_auth" };
      try {
        const res = (await http.mutation(portalTournamentFns.purchasePortalShopSku, {
          skuId,
        })) as { ok?: boolean; error?: string };
        if (res?.ok) return { ok: true as const };
        return { ok: false as const, error: res?.error ?? "purchase_failed" };
      } catch (e) {
        console.error("[Portal] purchasePortalShopSku", e);
        return { ok: false as const, error: "purchase_failed" };
      }
    },
    [uid]
  );

  const reconcilePendingHistorySettlements = useCallback(async () => {
    const http = getHttp();
    if (!http || !uid || !gameType) return;
    const key = `${uid}:${gameType}`;
    if (historySettleInFlightRef.current.has(key)) return;
    historySettleInFlightRef.current.add(key);
    try {
      await http.mutation(portalTournamentFns.reconcilePendingCasualHistorySettlements, {
        gameType,
        limit: 20,
      });
    } catch (e) {
      console.warn("[Portal] reconcilePendingHistorySettlements", e);
    } finally {
      historySettleInFlightRef.current.delete(key);
    }
  }, [uid, gameType]);

  const leaveCasualMatchQueue = useCallback(
    async (templateId?: string) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false as const, error: "no_auth" };
      try {
        const res = await http.mutation(portalTournamentFns.leaveCasualMatchQueue, {
          ...(templateId?.trim() ? { templateId: templateId.trim() } : {}),
        });
        const r = res as { ok?: boolean; error?: string; removed?: number };
        if (r?.ok) {
          const scope = templateId?.trim();
          patchData({
            matchQueueEntries: dataSnapshot.matchQueueEntries.filter(
              (e) => e.status !== "waiting" || (scope ? e.templateId !== scope : false)
            ),
          });
          return { ok: true as const, removed: r.removed };
        }
        return { ok: false as const, error: r?.error ?? "leave_failed" };
      } catch (e) {
        console.error("[Portal] leaveCasualMatchQueue", e);
        return { ok: false as const, error: "leave_failed" };
      }
    },
    [uid]
  );

  const joinTournament = useCallback(
    async (
      mode: "solo" | "multi",
      opts?: { merchantSlug?: string; campaignSlug?: string; sessionPartnerId?: number }
    ): Promise<ResolvedJoinTournamentOutcome> => {
      const http = getHttp();
      if (!http || !uid || !isPlatformAuthed(user)) {
        return { kind: "failed", error: "未登录或未配置 Portal 后端" };
      }
      const isCampaignJoin = Boolean(opts?.merchantSlug && opts?.campaignSlug);
      const tournamentId =
        isCampaignJoin || !gameType
          ? undefined
          : portalTournamentIdForMode(gameType, mode);
      if (!isCampaignJoin && !tournamentId) {
        return { kind: "failed", error: "未知模式" };
      }
      try {
        await authenticatePortal({ force: true });
        const result = await http.action(portalTournamentFns.joinTournament, {
          ...(tournamentId ? { tournamentId } : {}),
          ...(isCampaignJoin
            ? {
                merchantSlug: opts!.merchantSlug,
                campaignSlug: opts!.campaignSlug,
                ...(opts?.sessionPartnerId != null
                  ? { sessionPartnerId: opts.sessionPartnerId }
                  : {}),
              }
            : {}),
        });
        return resolveJoinTournamentOutcome(result);
      } catch (e) {
        console.error("[Portal] joinTournament", e);
        return { kind: "failed", error: "加入失败" };
      }
    },
    [uid, user?.platformAccessToken, gameType, authenticatePortal]
  );

  const getCampaignDailyPlayQuota = useCallback(
    async (args: { campaignId: string; maxPlaysPerDay?: number; dayTimezone?: string }) => {
      const http = getHttp();
      if (!http || !uid) return null;
      try {
        return (await http.query(portalTournamentFns.getCampaignDailyPlayQuota, {
          campaignId: args.campaignId,
          ...(args.maxPlaysPerDay != null ? { maxPlaysPerDay: args.maxPlaysPerDay } : {}),
          ...(args.dayTimezone ? { dayTimezone: args.dayTimezone } : {}),
        })) as {
          playsToday: number;
          remainingPlaysToday?: number;
          dayResetsAt: number;
          dayTimezone?: string;
        };
      } catch (e) {
        console.warn("[Portal] getCampaignDailyPlayQuota", e);
        return null;
      }
    },
    [uid]
  );

  const getCampaignPlayHistory = useCallback(
    async (args: { campaignId: string; limit?: number }) => {
      const http = getHttp();
      if (!http || !uid) return [];
      try {
        return ((await http.query(portalTournamentFns.listCampaignPlayHistory, {
          campaignId: args.campaignId,
          ...(args.limit != null ? { limit: args.limit } : {}),
        })) ?? []) as Array<{
          matchId: string;
          runTournamentId: string;
          gameType: string;
          score: number | null;
          rank: number | null;
          status: "open" | "finished" | "confirmed" | "settled" | "replaying";
          playedAt: number;
          startedAt: number;
        }>;
      } catch (e) {
        console.warn("[Portal] listCampaignPlayHistory", e);
        return [];
      }
    },
    [uid]
  );

  const value = useMemo<PortalContextValue>(
    () => ({
      convexUrl: PORTAL_CONVEX_URL,
      gameType,
      totalLeaderboard: snapshot.totalLeaderboard,
      cohortLeaderboard: snapshot.cohortLeaderboard,
      weeklyLeagueTierView: snapshot.weeklyLeagueTierView,
      playerWallet: snapshot.playerWallet,
      shopCatalog: snapshot.shopCatalog,
      myWeeklyPoints: snapshot.myWeeklyPoints,
      gameHistory: snapshot.gameHistory,
      openRunAssignments: snapshot.openRunAssignments,
      matchQueueEntries: snapshot.matchQueueEntries,
      weekEndsAt: snapshot.weekEndsAt ?? snapshot.myWeeklyPoints?.weekEndsAt ?? null,
      joinTournament,
      leaveCasualMatchQueue,
      reconcilePendingHistorySettlements,
      claimPortalWeeklyLeagueRewards,
      dismissPortalWeeklyLeagueClose,
      purchasePortalShopSku,
      refresh,
      portalSessionReady,
      getCampaignDailyPlayQuota,
      getCampaignPlayHistory,
    }),
    [
      gameType,
      snapshot,
      joinTournament,
      leaveCasualMatchQueue,
      reconcilePendingHistorySettlements,
      claimPortalWeeklyLeagueRewards,
      dismissPortalWeeklyLeagueClose,
      purchasePortalShopSku,
      refresh,
      portalSessionReady,
      getCampaignDailyPlayQuota,
      getCampaignPlayHistory,
    ]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}
