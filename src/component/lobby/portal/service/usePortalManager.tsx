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
};

type PortalDataSnapshot = {
  soloLeaderboard: PortalWeeklyLeaderboardRow[];
  multiLeaderboard: PortalWeeklyLeaderboardRow[];
  myWeeklyPoints: PortalMyWeeklyPoints | null;
  gameHistory: PortalGameHistoryRow[];
  openRunAssignments: OpenCasualRunAssignment[];
  matchQueueEntries: PortalMatchQueueEntry[];
  weekEndsAt: number | null;
};

const emptyData = (): PortalDataSnapshot => ({
  soloLeaderboard: [],
  multiLeaderboard: [],
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

export function isValidPortalGameType(value: string): value is RegisteredPortalGameType {
  return (PORTAL_GAME_TYPES as readonly string[]).includes(value);
}

export function portalGameDisplayName(gameType: RegisteredPortalGameType): string {
  return PORTAL_GAME_REGISTRY[gameType].displayName;
}

type PortalContextValue = {
  convexUrl: string;
  gameType: RegisteredPortalGameType | null;
  soloLeaderboard: PortalWeeklyLeaderboardRow[];
  multiLeaderboard: PortalWeeklyLeaderboardRow[];
  myWeeklyPoints: PortalMyWeeklyPoints | null;
  gameHistory: PortalGameHistoryRow[];
  openRunAssignments: OpenCasualRunAssignment[];
  matchQueueEntries: PortalMatchQueueEntry[];
  weekEndsAt: number | null;
  joinTournament: (mode: "solo" | "multi") => Promise<ResolvedJoinTournamentOutcome>;
  leaveCasualMatchQueue: (
    templateId?: string
  ) => Promise<{ ok: true; removed?: number } | { ok: false; error: string }>;
  reconcilePendingHistorySettlements: () => Promise<void>;
  refresh: () => Promise<void>;
  portalSessionReady: boolean;
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
let portalAuthReauthPromptedKey = "";

let httpSingleton: ConvexHttpClient | null = null;
let liveSingleton: ConvexClient | null = null;

function getHttp(): ConvexHttpClient | null {
  if (!PORTAL_CONVEX_URL) return null;
  if (!httpSingleton) httpSingleton = new ConvexHttpClient(PORTAL_CONVEX_URL);
  return httpSingleton;
}

function getLive(): ConvexClient | null {
  if (!PORTAL_CONVEX_URL) return null;
  if (!liveSingleton) liveSingleton = new ConvexClient(PORTAL_CONVEX_URL);
  return liveSingleton;
}

export function portalPlayModalForGameType(gameType: CasualGameKind) {
  return casualPlayModalForKind(gameType);
}

export const PortalProvider: React.FC<{
  gameType: RegisteredPortalGameType | null;
  children: React.ReactNode;
}> = ({ gameType, children }) => {
  const { user, askAuth } = useUserManager();
  const uid = user?.uid;
  const [portalSessionReady, setPortalSessionReady] = useState(false);
  const reconcileInFlightRef = useRef(new Set<string>());
  const historySettleInFlightRef = useRef(new Set<string>());
  const snapshot = useSyncExternalStore(subscribe, () => dataSnapshot, () => dataSnapshot);

  const authenticatePortal = useCallback(async (opts?: { force?: boolean }) => {
    const http = getHttp();
    if (!http || !user?.uid || !user?.token) {
      setPortalSessionReady(false);
      return;
    }
    const key = `${user.uid}:${user.token}`;
    if (!opts?.force && portalAuthFailedKey === key) {
      setPortalSessionReady(false);
      return;
    }
    await enqueuePortalAuthenticate(async () => {
      try {
        const result = await http.action(portalTournamentFns.authenticatePlayer, {
          uid: user.uid,
          token: user.token,
        });
        if (result?.uid) {
          portalAuthFailedKey = "";
          portalAuthReauthPromptedKey = "";
          setPortalSessionReady(true);
        } else {
          portalAuthFailedKey = key;
          setPortalSessionReady(false);
          if (portalAuthReauthPromptedKey !== key) {
            portalAuthReauthPromptedKey = key;
            askAuth({});
          }
        }
      } catch (e) {
        console.error("[Portal] authenticate", e);
        portalAuthFailedKey = key;
        setPortalSessionReady(false);
        if (portalAuthReauthPromptedKey !== key) {
          portalAuthReauthPromptedKey = key;
          askAuth({});
        }
      }
    });
  }, [user?.uid, user?.token, askAuth]);

  const refresh = useCallback(async () => {
    if (!uid || !gameType) return;
    await authenticatePortal();
  }, [uid, gameType, authenticatePortal]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const live = getLive();
    if (!live || !gameType) return;
    void live
      .mutation(portalTournamentFns.ensureWeeklyBoardBotsForGame, { gameType })
      .catch((e) => console.warn("[Portal] ensureWeeklyBoardBots", e));
  }, [gameType]);

  useEffect(() => {
    const live = getLive();
    if (!live || !uid || !gameType) {
      patchData(emptyData());
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
      portalTournamentFns.getWeeklyLeaderboard,
      { gameType, mode: "solo", limit: 20 },
      (rows) => {
        const r = rows as { rows?: PortalWeeklyLeaderboardRow[]; weekEndsAt?: number };
        patchData({
          soloLeaderboard: r.rows ?? [],
          weekEndsAt: r.weekEndsAt ?? null,
        });
      },
      "soloLeaderboard"
    );
    sub(
      portalTournamentFns.getWeeklyLeaderboard,
      { gameType, mode: "multi", limit: 20 },
      (rows) => {
        const r = rows as { rows?: PortalWeeklyLeaderboardRow[] };
        patchData({ multiLeaderboard: r.rows ?? [] });
      },
      "multiLeaderboard"
    );
    sub(
      portalTournamentFns.getMyWeeklyPoints,
      { uid, gameType },
      (rows) => {
        patchData({ myWeeklyPoints: rows as PortalDataSnapshot["myWeeklyPoints"] });
      },
      "myWeeklyPoints"
    );
    sub(
      portalTournamentFns.gameHistory,
      { uid, gameType, limit: 40 },
      (rows) => {
        patchData({ gameHistory: (rows as PortalGameHistoryRow[]) ?? [] });
      },
      "gameHistory"
    );
    sub(
      portalTournamentFns.listOpenCasualRunAssignments,
      { uid },
      (rows) => {
        patchData({
          openRunAssignments: Array.isArray(rows) ? (rows as OpenCasualRunAssignment[]) : [],
        });
      },
      "listOpenCasualRunAssignments"
    );
    sub(
      portalTournamentFns.listCasualMatchQueueForUid,
      { uid },
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
        uid,
        gameType,
        limit: expired.length,
      })
      .catch((e) => console.warn("[Portal] reconcileExpiredOpenCasualRuns", e))
      .finally(() => {
        reconcileInFlightRef.current.delete(key);
      });
  }, [uid, gameType, snapshot.openRunAssignments]);

  const reconcilePendingHistorySettlements = useCallback(async () => {
    const http = getHttp();
    if (!http || !uid || !gameType) return;
    const key = `${uid}:${gameType}`;
    if (historySettleInFlightRef.current.has(key)) return;
    historySettleInFlightRef.current.add(key);
    try {
      await http.mutation(portalTournamentFns.reconcilePendingCasualHistorySettlements, {
        uid,
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
          uid,
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
    async (mode: "solo" | "multi"): Promise<ResolvedJoinTournamentOutcome> => {
      const http = getHttp();
      if (!http || !uid || !gameType || !user?.token) {
        return { kind: "failed", error: "未登录或未配置 Portal 后端" };
      }
      const tournamentId = portalTournamentIdForMode(gameType, mode);
      if (!tournamentId) {
        return { kind: "failed", error: "未知模式" };
      }
      try {
        await authenticatePortal({ force: true });
        const result = await http.action(portalTournamentFns.joinTournament, {
          uid,
          tournamentId,
        });
        return resolveJoinTournamentOutcome(result);
      } catch (e) {
        console.error("[Portal] joinTournament", e);
        return { kind: "failed", error: "加入失败" };
      }
    },
    [uid, user?.token, gameType, authenticatePortal]
  );

  const value = useMemo<PortalContextValue>(
    () => ({
      convexUrl: PORTAL_CONVEX_URL,
      gameType,
      soloLeaderboard: snapshot.soloLeaderboard,
      multiLeaderboard: snapshot.multiLeaderboard,
      myWeeklyPoints: snapshot.myWeeklyPoints,
      gameHistory: snapshot.gameHistory,
      openRunAssignments: snapshot.openRunAssignments,
      matchQueueEntries: snapshot.matchQueueEntries,
      weekEndsAt: snapshot.weekEndsAt ?? snapshot.myWeeklyPoints?.weekEndsAt ?? null,
      joinTournament,
      leaveCasualMatchQueue,
      reconcilePendingHistorySettlements,
      refresh,
      portalSessionReady,
    }),
    [
      gameType,
      snapshot,
      joinTournament,
      leaveCasualMatchQueue,
      reconcilePendingHistorySettlements,
      refresh,
      portalSessionReady,
    ]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}
