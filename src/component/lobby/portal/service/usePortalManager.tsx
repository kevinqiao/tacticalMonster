import {
  PARTNER_GAME_REGISTRY,
  PARTNER_GAME_TYPES,
  type RegisteredPartnerGameType,
} from "@/convex/portal/convex/data/partnerGameRegistry";
import {
  portalTournamentIdForMode,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { useUserManager } from "host/service/UserManager";
import {
  registerConvexAuthClient,
  syncPlatformAuthTokenToClients,
} from "host/service/platformAuth/convexAuthRegistry";
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

import { portalErrorMessage } from "../shared/portalErrorMessage";

import { portalTournamentFns } from "./portalConvexFunctionRefs";
import { requestPortalAdCoin } from "./requestPortalAdCoin";
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
  /** 商家活动桌；Portal 每日限次展示需排除 */
  campaignId?: string;
  rank?: number | null;
  participantCount?: number;
  pointDelta?: number | null;
  weeklyPointsAfter?: number | null;
  /** 单人挑战目标分 */
  seedScoreThreshold?: number | null;
  /** 单人挑战是否达标 */
  challengeSuccess?: boolean | null;
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

export type PortalWeeklyLeagueTierView = {
  weekKey: string;
  weekEndsAt: number;
  enrolled: boolean;
  tierId: string;
  cohortNo: string | null;
  cohortRank: number | null;
  /** 设计容量（三区条） */
  cohortSize: number;
  /** 当前可见人数（名次分母） */
  cohortMemberCount: number;
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

export type PortalRedemptionProfileView = {
  region: string | null;
  verifiedEmail: string | null;
  verifiedPhone?: string | null;
  hasVerifiedContact: boolean;
  accountAgeDays: number;
  canChangeRegion: boolean;
  eligible: boolean;
  ineligibleReason: string | null;
};

export type PortalPlayerProfileView = {
  displayName: string | null;
  resolvedDisplayName: string;
  verifiedEmail: string | null;
  verifiedPhone: string | null;
  displayNameUpdatedAt: number | null;
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
  sortOrder?: number;
  shopSection?: string;
  skuKind?: "virtual" | "giftcard" | "voucher";
  region?: string;
  faceValueDisplay?: string;
  brandName?: string;
  brandLogoUrl?: string;
  locked?: boolean;
  lockReason?: string | null;
  voucherRewardText?: string;
  voucherValidityDays?: number;
};

export type PortalShopSkuRow = PortalShopSkuView;

export type PortalShopCatalogView = {
  coins: number;
  skus: PortalShopSkuView[];
  redemptionProfile?: PortalRedemptionProfileView | null;
};

export type PortalGiftCardOrderRow = {
  orderId: string;
  skuId: string;
  title: string;
  brandName?: string;
  faceValueDisplay: string;
  priceCoins: number;
  status: string;
  failureReason?: string;
  createdAt: number;
  fulfilledAt?: number;
  canRedeem: boolean;
  canResendEmail: boolean;
  hasCachedLink: boolean;
};

export type PortalBackpackItem = {
  itemId: string;
  skuId: string;
  title: string;
  rewardText: string;
  code: string;
  status: "owned" | "pending_use" | "redeemed" | "expired" | "void";
  expiresAt: number | null;
  useRequestedAt: number | null;
  redeemedAt: number | null;
  createdAt: number;
};

export type PortalModeDailyPlayQuota = {
  playsToday: number;
  maxPlaysPerDay: number;
  remainingPlaysToday: number;
};

export type PortalDailyPlayQuota = {
  solo: PortalModeDailyPlayQuota;
  multi: PortalModeDailyPlayQuota;
  dayResetsAt: number;
  dayInstanceKey: string;
  dayTimezone: string;
};

export type PortalTicketEntryOffer = {
  enabled: boolean;
  remaining: number;
  cap: number;
  usedToday: number;
  priceTickets: number;
};

export type PortalAdEntryOffer = {
  enabled: boolean;
  remaining: number;
  cap: number;
  usedToday: number;
  hasReadyGrant: boolean;
};

export type PortalAdCoinOffer = {
  enabled: boolean;
  remaining: number;
  cap: number;
  rewardAmount: number;
  watchedToday: number;
};

type PortalDataSnapshot = {
  cohortLeaderboard: PortalWeeklyLeaderboardRow[];
  weeklyLeagueTierView: PortalWeeklyLeagueTierView | null;
  playerWallet: PortalPlayerWallet | null;
  shopCatalog: PortalShopCatalogView | null;
  giftCardOrders: PortalGiftCardOrderRow[];
  backpackItems: PortalBackpackItem[];
  replayTokenCount: number;
  adReplayDailyRemaining: number | null;
  playerProfile: PortalPlayerProfileView | null;
  gameHistory: PortalGameHistoryRow[];
  openRunAssignments: OpenCasualRunAssignment[];
  matchQueueEntries: PortalMatchQueueEntry[];
  dailyPlayQuota: PortalDailyPlayQuota | null;
  ticketEntryOffer: { solo: PortalTicketEntryOffer; multi: PortalTicketEntryOffer } | null;
  adEntryOffer: { solo: PortalAdEntryOffer; multi: PortalAdEntryOffer } | null;
  adCoinOffer: PortalAdCoinOffer | null;
  weekEndsAt: number | null;
};

const emptyData = (): PortalDataSnapshot => ({
  cohortLeaderboard: [],
  weeklyLeagueTierView: null,
  playerWallet: null,
  shopCatalog: null,
  giftCardOrders: [],
  backpackItems: [],
  replayTokenCount: 0,
  adReplayDailyRemaining: null,
  playerProfile: null,
  gameHistory: [],
  openRunAssignments: [],
  matchQueueEntries: [],
  dailyPlayQuota: null,
  ticketEntryOffer: null,
  adEntryOffer: null,
  adCoinOffer: null,
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

export function portalGameDisplayName(gameType: RegisteredPartnerGameType): string {
  return PARTNER_GAME_REGISTRY[gameType].displayName;
}

type PortalContextValue = {
  convexUrl: string;
  gameType: RegisteredPartnerGameType | null;
  cohortLeaderboard: PortalWeeklyLeaderboardRow[];
  weeklyLeagueTierView: PortalWeeklyLeagueTierView | null;
  playerWallet: PortalPlayerWallet | null;
  shopCatalog: PortalShopCatalogView | null;
  giftCardOrders: PortalGiftCardOrderRow[];
  backpackItems: PortalBackpackItem[];
  replayTokenCount: number;
  adReplayDailyRemaining: number | null;
  playerProfile: PortalPlayerProfileView | null;
  gameHistory: PortalGameHistoryRow[];
  openRunAssignments: OpenCasualRunAssignment[];
  matchQueueEntries: PortalMatchQueueEntry[];
  dailyPlayQuota: PortalDailyPlayQuota | null;
  ticketEntryOffer: { solo: PortalTicketEntryOffer; multi: PortalTicketEntryOffer } | null;
  adEntryOffer: { solo: PortalAdEntryOffer; multi: PortalAdEntryOffer } | null;
  adCoinOffer: PortalAdCoinOffer | null;
  weekEndsAt: number | null;
  watchAdForCoins: () => Promise<
    | { ok: true; coinsGranted: number; remaining: number; rewardAmount: number }
    | { ok: false; error: string }
  >;
  joinTournament: (
    mode: "solo" | "multi",
    opts?: {
      partnerSlug?: string;
      campaignSlug?: string;
      adEntry?: boolean;
      ticketEntry?: boolean;
    }
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
  ) => Promise<
    | { ok: true; skuKind?: string; orderId?: string }
    | { ok: false; error: string }
  >;
  syncRedemptionProfile: (args: {
    verifiedEmail?: string;
    verifiedPhone?: string;
    redemptionRegion?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updatePortalDisplayName: (
    displayName: string
  ) => Promise<{ ok: boolean; error?: string; displayName?: string }>;
  redeemGiftCard: (
    orderId: string
  ) => Promise<{ ok: boolean; error?: string; rewardLink?: string }>;
  resendGiftCardEmail: (orderId: string) => Promise<{ ok: boolean; error?: string }>;
  requestUseBackpackVoucher: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
  cancelUseBackpackVoucher: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
  portalSessionReady: boolean;
  /** 本组排行弹层打开时开启排行轮询；关闭则只轮询段位栏 */
  setCohortLeaderboardPolling: (active: boolean) => void;
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
      mode?: "solo" | "multi";
      campaignRewardMode?: "pass_per_run" | "competitive_leaderboard" | null;
      score: number | null;
      rank: number | null;
      status: "open" | "finished" | "confirmed" | "settled" | "replaying";
      playedAt: number;
      startedAt: number;
      challengeSuccess?: boolean | null;
      seedScoreThreshold?: number | null;
      pointsDelta?: number | null;
      rewardLabel?: string | null;
      rewardSyncStatus?: "none" | "pending" | "synced" | "failed" | null;
      canOpenReport?: boolean;
    }>
  >;
  getCampaignPlayReport: (args: {
    matchId: string;
  }) => Promise<CampaignPlayReportPayload | null>;
};

/** Campaign 历史战报：单人得分明细 / 多人同桌表 */
export type CampaignPlayReportPayload = {
  reportKind: "solo_score" | "table";
  gameType: string;
  scoreReport?: import("@/component/battle/games/shared/casualGameScoreReportUI").CasualGameScoreReportUI;
  tableSummary?: import("@/component/battle/games/shared/casualAsyncTableSummaryUI").CasualAsyncTableSummaryUI;
  watchContext?: import("@/component/battle/games/shared/casualAsyncTableSummaryUI").CasualWatchContext | null;
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
  gameType: RegisteredPartnerGameType | null;
  children: React.ReactNode;
}> = ({ gameType, children }) => {
  const { user } = useUserManager();
  const uid = user?.uid;
  const [portalSessionReady, setPortalSessionReady] = useState(false);
  const [cohortLeaderboardPolling, setCohortLeaderboardPolling] = useState(false);
  const reconcileInFlightRef = useRef(new Set<string>());
  const historySettleInFlightRef = useRef(new Set<string>());
  const snapshot = useSyncExternalStore(subscribe, () => dataSnapshot, () => dataSnapshot);

  const ensureWeeklyLeagueMember = useCallback(async (gt: RegisteredPartnerGameType) => {
    const http = getHttp();
    if (!http) return;
    try {
      const res = (await http.mutation(portalTournamentFns.ensurePortalWeeklyLeagueMember, {
        gameType: gt,
      })) as { ok?: boolean; memberId?: string | null };
      if (!res?.ok || !res.memberId) {
        console.warn("[Portal] ensurePortalWeeklyLeagueMember not ok", res);
        return;
      }
      console.info("[Portal] ensurePortalWeeklyLeagueMember ok", {
        gameType: gt,
        memberId: res.memberId,
      });
    } catch (e) {
      console.warn("[Portal] ensurePortalWeeklyLeagueMember", e);
    }
  }, []);

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
      // Push JWT onto HttpClient before authedAction — PlatformAuthProvider may
      // not have synced yet when PortalProvider first mounts with a restored session.
      syncPlatformAuthTokenToClients(platformToken);
      try {
        const result = await http.action(portalTournamentFns.authenticatePlayer, {});
        if (result?.uid) {
          portalAuthFailedKey = "";
          setPortalSessionReady(true);
          // 鉴权成功后立刻入组（同 HttpClient / JWT），避免依赖二次 effect 或旧包未触发。
          if (gameType) {
            await ensureWeeklyLeagueMember(gameType);
          }
        } else {
          portalAuthFailedKey = key;
          setPortalSessionReady(false);
          console.warn("[Portal] authenticate returned no uid — check portal Convex auth.config / dev server");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // One retry after re-sync: first paint often races setAuth.
        if (!opts?.force && /unauthenticated/i.test(msg)) {
          syncPlatformAuthTokenToClients(platformToken);
          try {
            const retry = await http.action(portalTournamentFns.authenticatePlayer, {});
            if (retry?.uid) {
              portalAuthFailedKey = "";
              setPortalSessionReady(true);
              if (gameType) {
                await ensureWeeklyLeagueMember(gameType);
              }
              return;
            }
          } catch (retryErr) {
            console.error("[Portal] authenticate", retryErr);
            portalAuthFailedKey = key;
            setPortalSessionReady(false);
            return;
          }
        }
        console.error("[Portal] authenticate", e);
        portalAuthFailedKey = key;
        setPortalSessionReady(false);
      }
    });
  }, [user, gameType, ensureWeeklyLeagueMember]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    await authenticatePortal();
  }, [uid, authenticatePortal]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 已鉴权但 gameType 后到（或热更新后）时补一次入组。
  useEffect(() => {
    if (!portalSessionReady || !uid || !gameType) return;
    void ensureWeeklyLeagueMember(gameType);
  }, [gameType, portalSessionReady, uid, ensureWeeklyLeagueMember]);

  // Account / shop / backpack: only need uid (Campaign landing has no gameType).
  useEffect(() => {
    const live = getLive();
    if (!live || !uid) {
      patchData({
        playerWallet: null,
        shopCatalog: null,
        giftCardOrders: [],
        backpackItems: [],
        replayTokenCount: 0,
        adReplayDailyRemaining: null,
        playerProfile: null,
        ticketEntryOffer: null,
        adEntryOffer: null,
        adCoinOffer: null,
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
      portalTournamentFns.listMyGiftCardOrders,
      { limit: 20 },
      (rows) => {
        const r = rows as { orders?: PortalGiftCardOrderRow[] };
        patchData({ giftCardOrders: r.orders ?? [] });
      },
      "giftCardOrders"
    );
    sub(
      portalTournamentFns.listMyBackpackItems,
      {},
      (rows) => {
        patchData({
          backpackItems: Array.isArray(rows) ? (rows as PortalBackpackItem[]) : [],
        });
      },
      "backpackItems"
    );
    sub(
      portalTournamentFns.countUnusedReplayTokensForUid,
      {},
      (rows) => {
        const r = rows as { count?: number } | number | null;
        const raw = typeof r === "number" ? r : r?.count;
        const n =
          typeof raw === "number" && Number.isFinite(raw)
            ? Math.max(0, Math.floor(raw))
            : 0;
        patchData({ replayTokenCount: n });
      },
      "replayTokenCount"
    );
    sub(
      portalTournamentFns.getAdReplayDailyRemaining,
      {},
      (rows) => {
        const r = rows as {
          remaining?: number;
          enabled?: boolean;
        } | null;
        if (!r || r.enabled === false) {
          patchData({ adReplayDailyRemaining: null });
          return;
        }
        const n =
          typeof r.remaining === "number" && Number.isFinite(r.remaining)
            ? Math.max(0, Math.floor(r.remaining))
            : 0;
        patchData({ adReplayDailyRemaining: n });
      },
      "adReplayDailyRemaining"
    );
    sub(
      portalTournamentFns.getPortalPlayerProfile,
      {},
      (rows) => {
        patchData({
          playerProfile: (rows as PortalPlayerProfileView | null) ?? null,
        });
      },
      "playerProfile"
    );
    sub(
      portalTournamentFns.getTicketEntryOffer,
      {},
      (rows) =>
        patchData({
          ticketEntryOffer:
            (rows as { solo: PortalTicketEntryOffer; multi: PortalTicketEntryOffer } | null) ??
            null,
        }),
      "getTicketEntryOffer"
    );
    sub(
      portalTournamentFns.getAdEntryOffer,
      {},
      (rows) =>
        patchData({
          adEntryOffer:
            (rows as { solo: PortalAdEntryOffer; multi: PortalAdEntryOffer } | null) ?? null,
        }),
      "getAdEntryOffer"
    );
    sub(
      portalTournamentFns.getAdCoinOffer,
      {},
      (rows) => {
        const r = rows as PortalAdCoinOffer | null;
        if (!r || r.enabled === false) {
          patchData({ adCoinOffer: null });
          return;
        }
        patchData({
          adCoinOffer: {
            enabled: true,
            remaining: Math.max(0, Math.floor(r.remaining ?? 0)),
            cap: Math.max(0, Math.floor(r.cap ?? 0)),
            rewardAmount: Math.max(0, Math.floor(r.rewardAmount ?? 0)),
            watchedToday: Math.max(0, Math.floor(r.watchedToday ?? 0)),
          },
        });
      },
      "getAdCoinOffer"
    );

    return () => {
      for (const u of unsubs) u.unsubscribe();
    };
  }, [uid]);

  // Game / league surface: requires gameType (Portal lobby / playable campaign slides).
  useEffect(() => {
    const live = getLive();
    if (!live || !uid || !gameType) {
      patchData({
        weeklyLeagueTierView: null,
        cohortLeaderboard: [],
        gameHistory: [],
        openRunAssignments: [],
        matchQueueEntries: [],
        dailyPlayQuota: null,
        weekEndsAt: null,
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
      portalTournamentFns.getPortalWeeklyLeagueTierView,
      { gameType },
      (rows) => {
        const view = rows as PortalWeeklyLeagueTierView | null;
        patchData({
          weeklyLeagueTierView: view,
          weekEndsAt: view?.weekEndsAt ?? null,
        });
      },
      "weeklyLeagueTierView"
    );
    sub(
      portalTournamentFns.getPortalWeeklyLeagueCohortLeaderboard,
      { gameType, limit: 30 },
      (rows) => {
        const r = rows as {
          rows?: PortalWeeklyLeaderboardRow[];
          weekEndsAt?: number;
        };
        patchData({
          cohortLeaderboard: r.rows ?? [],
          ...(r.weekEndsAt != null ? { weekEndsAt: r.weekEndsAt } : {}),
        });
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
    sub(
      portalTournamentFns.getPortalDailyPlayQuota,
      { gameType },
      (rows) => {
        patchData({
          dailyPlayQuota: (rows as PortalDailyPlayQuota | null) ?? null,
        });
      },
      "getPortalDailyPlayQuota"
    );

    return () => {
      for (const u of unsubs) u.unsubscribe();
    };
  }, [uid, gameType]);

  /** 段位栏始终轮询；分组排行仅在弹层打开时轮询 */
  useEffect(() => {
    if (!portalSessionReady || !uid || !gameType) return;
    const http = getHttp();
    if (!http) return;

    const POLL_MS = 30_000;
    let cancelled = false;

    const pollWeeklyLeague = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const viewPromise = http.query(portalTournamentFns.getPortalWeeklyLeagueTierView, {
          gameType,
        });
        const boardPromise = cohortLeaderboardPolling
          ? http.query(portalTournamentFns.getPortalWeeklyLeagueCohortLeaderboard, {
              gameType,
              limit: 30,
            })
          : null;

        const [view, board] = await Promise.all([viewPromise, boardPromise]);
        if (cancelled) return;
        const v = view as PortalWeeklyLeagueTierView | null;
        const patch: Partial<PortalDataSnapshot> = {
          weeklyLeagueTierView: v,
          ...(v?.weekEndsAt != null ? { weekEndsAt: v.weekEndsAt } : {}),
        };
        if (board != null) {
          const r = board as {
            rows?: PortalWeeklyLeaderboardRow[];
            weekEndsAt?: number;
          };
          patch.cohortLeaderboard = r.rows ?? [];
          if (r.weekEndsAt != null) patch.weekEndsAt = r.weekEndsAt;
        }
        patchData(patch);
      } catch (e) {
        console.warn("[Portal] weekly league poll", e);
      }
    };

    void pollWeeklyLeague();

    const id = window.setInterval(() => {
      void pollWeeklyLeague();
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void pollWeeklyLeague();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [portalSessionReady, uid, gameType, cohortLeaderboardPolling]);

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
        })) as {
          ok?: boolean;
          error?: string;
          skuKind?: string;
          orderId?: string;
        };
        if (res?.ok) {
          return {
            ok: true as const,
            skuKind: res.skuKind,
            orderId: res.orderId,
          };
        }
        return { ok: false as const, error: res?.error ?? "purchase_failed" };
      } catch (e) {
        console.error("[Portal] purchasePortalShopSku", e);
        return { ok: false as const, error: "purchase_failed" };
      }
    },
    [uid]
  );

  const syncRedemptionProfile = useCallback(
    async (args: {
      verifiedEmail?: string;
      verifiedPhone?: string;
      redemptionRegion?: string;
    }) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false, error: "no_auth" };
      try {
        const res = (await http.mutation(portalTournamentFns.syncRedemptionProfile, args)) as {
          ok?: boolean;
          error?: string;
        };
        return { ok: Boolean(res?.ok), error: res?.error };
      } catch (e) {
        console.error("[Portal] syncRedemptionProfile", e);
        return { ok: false, error: "sync_failed" };
      }
    },
    [uid]
  );

  const updatePortalDisplayName = useCallback(
    async (displayName: string) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false, error: "no_auth" };
      try {
        const res = (await http.mutation(portalTournamentFns.updatePortalDisplayName, {
          displayName,
        })) as {
          ok?: boolean;
          error?: string;
          displayName?: string;
        };
        return {
          ok: Boolean(res?.ok),
          error: res?.error,
          displayName: res?.displayName,
        };
      } catch (e) {
        console.error("[Portal] updatePortalDisplayName", e);
        return { ok: false, error: "update_failed" };
      }
    },
    [uid]
  );

  const redeemGiftCard = useCallback(
    async (orderId: string) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false, error: "no_auth" };
      try {
        const cached = (await http.query(portalTournamentFns.getGiftCardRedemption, {
          orderId,
        })) as {
          ok?: boolean;
          error?: string;
          rewardLink?: string;
          needsRefresh?: boolean;
        };
        if (cached?.ok && cached.rewardLink) {
          return { ok: true, rewardLink: cached.rewardLink };
        }
        if (cached?.ok && cached.needsRefresh) {
          const refreshed = (await http.action(
            portalTournamentFns.refreshGiftCardRedemption,
            { orderId }
          )) as { ok?: boolean; error?: string; rewardLink?: string };
          if (refreshed?.ok && refreshed.rewardLink) {
            return { ok: true, rewardLink: refreshed.rewardLink };
          }
          return { ok: false, error: refreshed?.error ?? "refresh_failed" };
        }
        return { ok: false, error: cached?.error ?? "not_ready" };
      } catch (e) {
        console.error("[Portal] redeemGiftCard", e);
        return { ok: false, error: "redeem_failed" };
      }
    },
    [uid]
  );

  const resendGiftCardEmail = useCallback(
    async (orderId: string) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false, error: "no_auth" };
      try {
        const res = (await http.action(portalTournamentFns.resendGiftCardEmail, {
          orderId,
        })) as { ok?: boolean; error?: string };
        return { ok: Boolean(res?.ok), error: res?.error };
      } catch (e) {
        console.error("[Portal] resendGiftCardEmail", e);
        return { ok: false, error: "resend_failed" };
      }
    },
    [uid]
  );

  const requestUseBackpackVoucher = useCallback(
    async (itemId: string) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false, error: "no_auth" };
      try {
        const result = (await http.mutation(portalTournamentFns.requestUseBackpackVoucher, {
          itemId: itemId as never,
        })) as { ok?: boolean; error?: string };
        return { ok: Boolean(result?.ok), error: result?.error };
      } catch (e) {
        console.error("[Portal] requestUseBackpackVoucher", e);
        return { ok: false, error: "request_failed" };
      }
    },
    [uid]
  );

  const cancelUseBackpackVoucher = useCallback(
    async (itemId: string) => {
      const http = getHttp();
      if (!http || !uid) return { ok: false, error: "no_auth" };
      try {
        const result = (await http.mutation(portalTournamentFns.cancelUseBackpackVoucher, {
          itemId: itemId as never,
        })) as { ok?: boolean; error?: string };
        return { ok: Boolean(result?.ok), error: result?.error };
      } catch (e) {
        console.error("[Portal] cancelUseBackpackVoucher", e);
        return { ok: false, error: "cancel_failed" };
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
      opts?: {
        partnerSlug?: string;
        campaignSlug?: string;
        adEntry?: boolean;
        ticketEntry?: boolean;
      }
    ): Promise<ResolvedJoinTournamentOutcome> => {
      const http = getHttp();
      if (!http || !uid || !isPlatformAuthed(user)) {
        return { kind: "failed", error: portalErrorMessage("not_logged_in_or_no_backend") };
      }
      const isCampaignJoin = Boolean(opts?.partnerSlug && opts?.campaignSlug);
      const tournamentId =
        isCampaignJoin || !gameType
          ? undefined
          : portalTournamentIdForMode(gameType, mode);
      if (!isCampaignJoin && !tournamentId) {
        return { kind: "failed", error: portalErrorMessage("unknown_mode") };
      }
      try {
        await authenticatePortal({ force: true });
        const result = await http.action(portalTournamentFns.joinTournament, {
          ...(tournamentId ? { tournamentId } : {}),
          ...(isCampaignJoin
            ? {
                partnerSlug: opts!.partnerSlug,
                campaignSlug: opts!.campaignSlug,
              }
            : {}),
          ...(opts?.adEntry ? { adEntry: true } : {}),
          ...(opts?.ticketEntry ? { ticketEntry: true } : {}),
        });
        return resolveJoinTournamentOutcome(result);
      } catch (e) {
        console.error("[Portal] joinTournament", e);
        return { kind: "failed", error: portalErrorMessage("join_failed") };
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
          mode: "solo" | "multi";
          campaignRewardMode: "pass_per_run" | "competitive_leaderboard" | null;
          score: number | null;
          rank: number | null;
          status: "open" | "finished" | "confirmed" | "settled" | "replaying";
          playedAt: number;
          startedAt: number;
          challengeSuccess: boolean | null;
          seedScoreThreshold: number | null;
          pointsDelta: number | null;
          rewardLabel: string | null;
          rewardSyncStatus: "none" | "pending" | "synced" | "failed" | null;
          canOpenReport: boolean;
        }>;
      } catch (e) {
        console.warn("[Portal] listCampaignPlayHistory", e);
        return [];
      }
    },
    [uid]
  );

  const getCampaignPlayReport = useCallback(
    async (args: { matchId: string }): Promise<CampaignPlayReportPayload | null> => {
      const http = getHttp();
      if (!http || !uid || !args.matchId.trim()) return null;
      try {
        return ((await http.query(portalTournamentFns.getCampaignPlayReport, {
          matchId: args.matchId,
        })) ?? null) as CampaignPlayReportPayload | null;
      } catch (e) {
        console.warn("[Portal] getCampaignPlayReport", e);
        return null;
      }
    },
    [uid]
  );

  const watchAdForCoins = useCallback(async () => {
    if (!uid) return { ok: false as const, error: "no_auth" };
    return requestPortalAdCoin();
  }, [uid]);

  const value = useMemo<PortalContextValue>(
    () => ({
      convexUrl: PORTAL_CONVEX_URL,
      gameType,
      cohortLeaderboard: snapshot.cohortLeaderboard,
      weeklyLeagueTierView: snapshot.weeklyLeagueTierView,
      playerWallet: snapshot.playerWallet,
      shopCatalog: snapshot.shopCatalog,
      giftCardOrders: snapshot.giftCardOrders,
      backpackItems: snapshot.backpackItems,
      replayTokenCount: snapshot.replayTokenCount,
      adReplayDailyRemaining: snapshot.adReplayDailyRemaining,
      playerProfile: snapshot.playerProfile,
      gameHistory: snapshot.gameHistory,
      openRunAssignments: snapshot.openRunAssignments,
      matchQueueEntries: snapshot.matchQueueEntries,
      dailyPlayQuota: snapshot.dailyPlayQuota,
      ticketEntryOffer: snapshot.ticketEntryOffer,
      adEntryOffer: snapshot.adEntryOffer,
      adCoinOffer: snapshot.adCoinOffer,
      weekEndsAt: snapshot.weekEndsAt,
      watchAdForCoins,
      joinTournament,
      leaveCasualMatchQueue,
      reconcilePendingHistorySettlements,
      claimPortalWeeklyLeagueRewards,
      dismissPortalWeeklyLeagueClose,
      purchasePortalShopSku,
      syncRedemptionProfile,
      updatePortalDisplayName,
      redeemGiftCard,
      resendGiftCardEmail,
      requestUseBackpackVoucher,
      cancelUseBackpackVoucher,
      refresh,
      portalSessionReady,
      setCohortLeaderboardPolling,
      getCampaignDailyPlayQuota,
      getCampaignPlayHistory,
      getCampaignPlayReport,
    }),
    [
      gameType,
      snapshot,
      watchAdForCoins,
      joinTournament,
      leaveCasualMatchQueue,
      reconcilePendingHistorySettlements,
      claimPortalWeeklyLeagueRewards,
      dismissPortalWeeklyLeagueClose,
      purchasePortalShopSku,
      syncRedemptionProfile,
      updatePortalDisplayName,
      redeemGiftCard,
      resendGiftCardEmail,
      requestUseBackpackVoucher,
      cancelUseBackpackVoucher,
      refresh,
      portalSessionReady,
      setCohortLeaderboardPolling,
      getCampaignDailyPlayQuota,
      getCampaignPlayHistory,
      getCampaignPlayReport,
    ]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}
