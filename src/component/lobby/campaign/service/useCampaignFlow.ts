import type { RegisteredPortalGameType } from "@/convex/portal/convex/data/portalGameRegistry";
import { ConvexClient } from "convex/browser";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import i18n from "@/i18n";
import { useModalManager } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useTranslation } from "react-i18next";

import {
  casualGameKindFromGameType,
  modalDataForOpenAssignment,
  type OpenCasualRunAssignment,
} from "../../casual/service/casualOpenRunAssignment";
import { CASUAL_MATCH_OPEN_TIMEOUT_MS } from "../../casual/service/useAwaitOpenCasualRunAssignment";
import { joinEntryErrorMessage } from "../../casual/view/shared/casualEconomyUi";
import {
  portalPlayModalForGameType,
  usePortal,
} from "../../portal/service/usePortalManager";
import {
  findCampaignAwaitOpenAssignment,
  pickPortalMatchQueueForGameType,
  pickPortalOpenAssignmentForCampaignMode,
  type CampaignAwaitOpenRunWatch,
} from "../../portal/service/portalOpenRunHelpers";
import {
  countActiveCampaignCoupons,
  isCampaignCouponLimitReached,
  latestIssuedCampaignCoupon,
  remainingCampaignCouponSlots,
  sortCampaignCouponsNewestFirst,
} from "../shared/campaignCouponProgress";
import {
  getCampaignTimeRemainingView,
  isCampaignEnded,
  isCampaignNotStarted,
  isCampaignPlayable,
} from "../shared/campaignActivity";
import type { CampaignCouponView, CampaignPlayHistoryEntry } from "../shared/campaignTypes";
import { applyMerchantTheme } from "./applyMerchantTheme";
import { campaignErrorMessage } from "../shared/campaignErrorMessage";
import { merchantCampaignFns } from "./campaignConvexFunctionRefs";
import type { CampaignPublicView } from "./useMerchantCampaignManager";
import { MERCHANT_CONVEX_URL, useMerchantCampaign } from "./useMerchantCampaignManager";

/** 活动榜 Bot 分数按 `Date.now()` 现算；Convex 订阅仅在 DB 变更时触发，需定时 poll */
const CAMPAIGN_LEADERBOARD_POLL_MS = 45_000;
const CAMPAIGN_ACTIVITY_TICK_MS = 1_000;

let merchantLiveSingleton: ConvexClient | null = null;

function getMerchantLive(): ConvexClient | null {
  if (!MERCHANT_CONVEX_URL) return null;
  if (!merchantLiveSingleton) {
    merchantLiveSingleton = new ConvexClient(MERCHANT_CONVEX_URL);
    registerConvexAuthClient(merchantLiveSingleton);
  }
  return merchantLiveSingleton;
}

function formatPeriod(startsAt: number, endsAt: number): string {
  const locale = i18n.language;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

function flowT(key: string, params?: Record<string, string | number>) {
  return i18n.t(key, { ns: "campaign.errors", ...params });
}

async function waitForCouponCountIncrease(
  fetchMyCoupons: (campaignId: string) => Promise<CampaignCouponView[]>,
  campaignId: string,
  previousCount: number,
  attempts = 20,
  delayMs = 500
): Promise<CampaignCouponView | null> {
  for (let i = 0; i < attempts; i += 1) {
    const rows = await fetchMyCoupons(campaignId);
    const activeCount = countActiveCampaignCoupons(rows);
    if (activeCount > previousCount) {
      return latestIssuedCampaignCoupon(rows);
    }
    await new Promise((r) => window.setTimeout(r, delayMs));
  }
  return null;
}

export function useCampaignFlow(args: {
  merchantSlug: string;
  campaignSlug: string;
  campaignPublic: CampaignPublicView | null;
  loadingPublic: boolean;
}) {
  const { user, askAuth } = useUserManager();
  const { openModal, modals } = useModalManager();
  const portal = usePortal();
  const merchant = useMerchantCampaign();

  const { i18n: i18nInst } = useTranslation();
  const uid = user?.uid;
  const authed = Boolean(uid && isPlatformAuthed(user));
  const campaign = args.campaignPublic?.campaign ?? null;
  const gameType = (campaign?.gameType ?? null) as RegisteredPortalGameType | null;
  const mode = campaign?.mode ?? "solo";
  const isPassMode = campaign?.rewardModel === "pass_per_run";
  const hasLeaderboard = campaign?.hasLeaderboard ?? false;
  const maxCouponsPerPlayer = campaign?.playLimits?.maxCouponsPerPlayer ?? 1;
  const maxPlaysPerDay = campaign?.playLimits?.maxPlaysPerDay;
  const dayTimezone = campaign?.playLimits?.dayTimezone ?? "Asia/Shanghai";

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), CAMPAIGN_ACTIVITY_TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!campaign) return;
    const schedule = (targetMs: number) => {
      const delay = targetMs - Date.now();
      if (delay <= 0 || delay > 7 * 24 * 3600 * 1000) return null;
      return window.setTimeout(() => setNowMs(Date.now()), delay + 100);
    };
    const startTimer = schedule(campaign.startsAt);
    const endTimer = schedule(campaign.endsAt);
    return () => {
      if (startTimer != null) window.clearTimeout(startTimer);
      if (endTimer != null) window.clearTimeout(endTimer);
    };
  }, [campaign?.endsAt, campaign?.startsAt]);

  const campaignEnded = campaign ? isCampaignEnded(campaign, nowMs) : false;
  const campaignNotStarted = campaign ? isCampaignNotStarted(campaign, nowMs) : false;
  const campaignPlayable = campaign ? isCampaignPlayable(campaign, nowMs) : false;
  const showLeaderboard = hasLeaderboard && !campaignNotStarted;
  const timeRemaining = useMemo(
    () => (campaign ? getCampaignTimeRemainingView(campaign, nowMs) : null),
    [campaign, nowMs, i18nInst.language]
  );

  const periodLabel = useMemo(
    () => (campaign ? formatPeriod(campaign.startsAt, campaign.endsAt) : ""),
    [campaign, i18nInst.language]
  );

  const [joining, setJoining] = useState(false);
  const [settlingAfterGame, setSettlingAfterGame] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [myCoupons, setMyCoupons] = useState<CampaignCouponView[]>([]);
  const [freshCoupon, setFreshCoupon] = useState<CampaignCouponView | null>(null);
  const [leaderboard, setLeaderboard] = useState<unknown[]>([]);
  const [settlementStatus, setSettlementStatus] = useState(
    campaign?.settlement?.status ?? "pending"
  );
  const [awaitingMatch, setAwaitingMatch] = useState<CampaignAwaitOpenRunWatch | null>(null);
  const [leavingMatch, setLeavingMatch] = useState(false);
  const [playsToday, setPlaysToday] = useState(0);
  const [remainingPlaysToday, setRemainingPlaysToday] = useState<number | undefined>(undefined);
  const [playHistory, setPlayHistory] = useState<CampaignPlayHistoryEntry[]>([]);

  const playStartedAtRef = useRef<number | null>(null);
  const waitingForGameCloseRef = useRef(false);
  const playModalRef = useRef<string | null>(null);
  const claimedBeforeGameRef = useRef(0);
  const awaitSettledRef = useRef(false);

  const claimedCount = useMemo(() => countActiveCampaignCoupons(myCoupons), [myCoupons]);
  const remainingChallenges = useMemo(
    () => remainingCampaignCouponSlots(claimedCount, maxCouponsPerPlayer),
    [claimedCount, maxCouponsPerPlayer]
  );
  const couponLimitReached = useMemo(
    () => isCampaignCouponLimitReached(claimedCount, maxCouponsPerPlayer),
    [claimedCount, maxCouponsPerPlayer]
  );
  const dailyLimitReached = useMemo(
    () =>
      maxPlaysPerDay != null &&
      maxPlaysPerDay >= 1 &&
      remainingPlaysToday != null &&
      remainingPlaysToday <= 0,
    [maxPlaysPerDay, remainingPlaysToday]
  );
  const canChallenge = Boolean(
    campaignPlayable &&
      !dailyLimitReached &&
      (!isPassMode || !couponLimitReached)
  );
  const sortedCoupons = useMemo(() => sortCampaignCouponsNewestFirst(myCoupons), [myCoupons]);
  const latestCoupon = useMemo(() => sortedCoupons[0] ?? null, [sortedCoupons]);

  const matchQueue = useMemo(() => {
    if (!gameType) return [];
    return pickPortalMatchQueueForGameType(portal.matchQueueEntries, gameType);
  }, [portal.matchQueueEntries, gameType]);

  const queueWaiting = matchQueue.some((e) => e.status === "waiting");
  const queueClaiming = matchQueue.some((e) => e.status === "claiming");
  const primaryQueueEntry = matchQueue[0];
  const matchOverlayOpen =
    mode === "multi" && (awaitingMatch != null || queueWaiting || queueClaiming);

  const playModalName = gameType ? portalPlayModalForGameType(gameType) : null;
  const playModalOpen = Boolean(
    playModalName && modals.some((m) => m.name === playModalName)
  );
  const gameSessionActive =
    playModalOpen || joining || settlingAfterGame || matchOverlayOpen;

  const refreshPlayHistory = useCallback(async () => {
    if (!campaign?.campaignId || !uid || !portal.portalSessionReady) {
      setPlayHistory([]);
      return [];
    }
    const rows = await portal.getCampaignPlayHistory({ campaignId: campaign.campaignId });
    setPlayHistory(rows);
    return rows;
  }, [campaign?.campaignId, portal, uid, portal.portalSessionReady]);

  useEffect(() => {
    void refreshPlayHistory();
  }, [refreshPlayHistory]);

  const refreshCoupons = useCallback(async () => {
    if (!campaign?.campaignId) {
      setMyCoupons([]);
      return [];
    }
    const rows = await merchant.fetchMyCoupons(campaign.campaignId);
    setMyCoupons(rows);
    return rows;
  }, [campaign?.campaignId, merchant]);

  const refreshDailyQuota = useCallback(async () => {
    if (!campaign?.campaignId || !uid || !portal.portalSessionReady) {
      setPlaysToday(0);
      setRemainingPlaysToday(undefined);
      return;
    }
    const quota = await portal.getCampaignDailyPlayQuota({
      campaignId: campaign.campaignId,
      ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
      dayTimezone,
    });
    if (!quota) {
      return;
    }
    setPlaysToday(quota.playsToday);
    setRemainingPlaysToday(quota.remainingPlaysToday);
  }, [campaign?.campaignId, dayTimezone, maxPlaysPerDay, portal, uid, portal.portalSessionReady]);

  const refreshLeaderboard = useCallback(async () => {
    if (!campaign?.campaignId || !hasLeaderboard || campaignNotStarted) {
      setLeaderboard([]);
      return;
    }
    const rows = await merchant.fetchLeaderboard(campaign.campaignId, true);
    setLeaderboard(rows);
  }, [campaign?.campaignId, campaignNotStarted, hasLeaderboard, merchant]);

  const openCampaignAssignment = useCallback(
    (hit: OpenCasualRunAssignment) => {
      if (!gameType || !campaign || hit.campaignId !== campaign.campaignId) return;
      const modalName = portalPlayModalForGameType(gameType);
      playStartedAtRef.current = Date.now();
      playModalRef.current = modalName;
      waitingForGameCloseRef.current = true;
      openModal({
        name: modalName,
        data: modalDataForOpenAssignment(hit),
      });
    },
    [campaign, gameType, openModal]
  );

  useEffect(() => {
    if (!uid || !isPlatformAuthed(user)) {
      setMyCoupons([]);
      return;
    }
    void refreshCoupons();
  }, [refreshCoupons, uid, user]);

  useEffect(() => {
    void refreshDailyQuota();
  }, [refreshDailyQuota]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  /** 真人入榜等 DB 变更：Convex 订阅即时刷新 */
  useEffect(() => {
    if (!campaign?.campaignId || !hasLeaderboard || campaignNotStarted) return;
    const live = getMerchantLive();
    if (!live) return;

    void live
      .mutation(merchantCampaignFns.ensureCampaignBoardBotsForLeaderboard, {
        campaignId: campaign.campaignId,
      })
      .catch((e) => console.warn("[Campaign] ensureCampaignBoardBots", e));

    const handle = live.onUpdate(
      merchantCampaignFns.getCampaignLeaderboard,
      { campaignId: campaign.campaignId, limit: 20 },
      (rows) => setLeaderboard((rows as unknown[]) ?? []),
      (err) => console.error("[Campaign] leaderboard subscription", err)
    );
    return () => handle.unsubscribe();
  }, [campaign?.campaignId, campaignNotStarted, hasLeaderboard]);

  /** Bot 分数随时间缓升：定时 poll 触发服务端 `Date.now()` 重算 */
  useEffect(() => {
    if (!campaign?.campaignId || !hasLeaderboard || campaignNotStarted || campaignEnded) return;
    const tick = () => void refreshLeaderboard();
    const id = window.setInterval(tick, CAMPAIGN_LEADERBOARD_POLL_MS);
    return () => window.clearInterval(id);
  }, [campaign?.campaignId, campaignEnded, campaignNotStarted, hasLeaderboard, refreshLeaderboard]);

  useEffect(() => {
    if (!campaign?.campaignId || !hasLeaderboard || !authed) return;
    if (!campaignEnded && campaign.status !== "ended") return;
    void (async () => {
      const result = (await merchant.triggerLeaderboardSettlement(
        campaign.campaignId
      )) as { ok?: boolean };
      if (result?.ok) {
        setSettlementStatus("done");
        await refreshCoupons();
        await refreshLeaderboard();
      }
    })();
  }, [
    campaign?.campaignId,
    campaign?.status,
    campaignEnded,
    authed,
    hasLeaderboard,
    merchant,
    refreshCoupons,
    refreshLeaderboard,
  ]);

  useEffect(() => {
    return applyMerchantTheme(args.campaignPublic?.theme ?? null);
  }, [args.campaignPublic?.theme]);

  useEffect(() => {
    awaitSettledRef.current = false;
  }, [awaitingMatch?.templateId, awaitingMatch?.campaignId]);

  useEffect(() => {
    if (!awaitingMatch || awaitSettledRef.current) return;
    const hit = findCampaignAwaitOpenAssignment(portal.openRunAssignments, awaitingMatch);
    if (!hit) return;
    awaitSettledRef.current = true;
    setAwaitingMatch(null);
    setNote(null);
    openCampaignAssignment(hit);
  }, [awaitingMatch, openCampaignAssignment, portal.openRunAssignments]);

  useEffect(() => {
    if (!awaitingMatch) return;
    const id = window.setTimeout(() => {
      if (awaitSettledRef.current) return;
      awaitSettledRef.current = true;
      setAwaitingMatch(null);
      setNote(flowT("matchTimeout"));
    }, CASUAL_MATCH_OPEN_TIMEOUT_MS + 15_000);
    return () => window.clearTimeout(id);
  }, [awaitingMatch]);

  useEffect(() => {
    if (mode !== "multi" || !campaign || !gameType) return;
    const entry = primaryQueueEntry;
    if (!entry || (entry.status !== "waiting" && entry.status !== "claiming")) return;
    setAwaitingMatch({
      templateId: entry.templateId,
      gameKind: casualGameKindFromGameType(gameType),
      campaignId: campaign.campaignId,
    });
  }, [campaign, gameType, mode, primaryQueueEntry?.status, primaryQueueEntry?.templateId]);

  const leaveMatchQueue = useCallback(async () => {
    if (leavingMatch || !queueWaiting) return;
    setLeavingMatch(true);
    try {
      const res = await portal.leaveCasualMatchQueue(primaryQueueEntry?.templateId);
      setAwaitingMatch(null);
      if (res.ok) {
        setNote(null);
      } else if (res.error === "cannot_leave_claiming") {
        setNote(flowT("creatingMatch"));
      } else if (res.error === "not_in_queue") {
        setNote(flowT("notInQueue"));
      } else {
        setNote(flowT("leaveFailed", { code: res.error ?? "" }));
      }
    } finally {
      setLeavingMatch(false);
    }
  }, [leavingMatch, portal.leaveCasualMatchQueue, primaryQueueEntry?.templateId, queueWaiting]);

  const checkCouponAfterGame = useCallback(async () => {
    if (!campaign?.campaignId) return;
    setSettlingAfterGame(true);
    try {
      await portal.refresh();

      if (isPassMode) {
        const newCoupon = await waitForCouponCountIncrease(
          merchant.fetchMyCoupons,
          campaign.campaignId,
          claimedBeforeGameRef.current
        );
        const rows = await refreshCoupons();
        const activeCount = countActiveCampaignCoupons(rows);
        const remaining = remainingCampaignCouponSlots(activeCount, maxCouponsPerPlayer);

        if (newCoupon) {
          setFreshCoupon(newCoupon);
          setNote(null);
          return;
        }

        if (activeCount > claimedBeforeGameRef.current) {
          setFreshCoupon(latestIssuedCampaignCoupon(rows));
          setNote(null);
          return;
        }

        if (remaining <= 0) {
          setNote(flowT("couponLimitReached"));
          return;
        }

        setNote(flowT("noCouponThisRun", { remaining }));
        return;
      }

      await refreshLeaderboard();
      await refreshCoupons();
      setNote(null);
    } finally {
      await refreshDailyQuota();
      await refreshPlayHistory();
      setSettlingAfterGame(false);
    }
  }, [
    campaign?.campaignId,
    isPassMode,
    maxCouponsPerPlayer,
    merchant,
    portal,
    refreshCoupons,
    refreshDailyQuota,
    refreshLeaderboard,
    refreshPlayHistory,
  ]);

  useEffect(() => {
    const modalName = playModalRef.current;
    if (!modalName || !waitingForGameCloseRef.current) return;
    if (modals.some((m) => m.name === modalName)) return;
    waitingForGameCloseRef.current = false;
    playModalRef.current = null;
    void checkCouponAfterGame();
  }, [checkCouponAfterGame, modals]);

  const startPlay = useCallback(async () => {
    if (!campaign || !gameType) return;
    if (!uid || !isPlatformAuthed(user)) {
      askAuth({});
      setNote(flowT("signInRequired"));
      return;
    }
    if (!campaignPlayable) {
      setNote(campaignEnded ? flowT("campaignEnded") : flowT("campaignNotOpen"));
      return;
    }
    if (isPassMode && couponLimitReached) {
      setNote(flowT("couponLimitWithMax", { max: maxCouponsPerPlayer }));
      return;
    }
    if (dailyLimitReached) {
      setNote(flowT("dailyPlayLimitReached"));
      return;
    }
    if (!portal.portalSessionReady) {
      setNote(flowT("syncingSession"));
      return;
    }
    if (mode === "multi" && matchOverlayOpen) {
      setNote(flowT("matchingInProgress"));
      return;
    }

    claimedBeforeGameRef.current = claimedCount;

    const campaignOpen = pickPortalOpenAssignmentForCampaignMode(
      portal.openRunAssignments,
      gameType,
      mode,
      campaign.campaignId
    );
    if (campaignOpen) {
      openCampaignAssignment(campaignOpen);
      return;
    }

    setJoining(true);
    setNote(null);
    try {
      const outcome = await portal.joinTournament(mode, {
        merchantSlug: args.merchantSlug,
        campaignSlug: args.campaignSlug,
      });
      if (outcome.kind === "ready") {
        openCampaignAssignment({
          templateId: outcome.templateId,
          gameId: outcome.gameId,
          matchId: outcome.matchId,
          runTournamentId: outcome.runTournamentId,
          createdAt: Date.now(),
          campaignId: campaign.campaignId,
        });
        await refreshDailyQuota();
        return;
      }
      if (outcome.kind === "queued") {
        setAwaitingMatch({
          templateId: outcome.templateId,
          gameKind: casualGameKindFromGameType(gameType),
          campaignId: campaign.campaignId,
        });
        setNote(null);
        return;
      }
      if (outcome.kind === "failed") {
        const code = outcome.errorCode ?? outcome.error;
        if (code === "coupon_limit_reached") {
          setNote(campaignErrorMessage("coupon_limit_reached"));
          await refreshCoupons();
        } else if (code === "partner_mismatch" || code === "partner_session_required") {
          setNote(campaignErrorMessage(code));
        } else if (code === "daily_play_limit_reached") {
          setNote(flowT("dailyPlayLimitReached"));
          await refreshDailyQuota();
        } else {
          setNote(
            outcome.error ?? joinEntryErrorMessage(code) ?? flowT("joinFailed")
          );
        }
      }
    } finally {
      setJoining(false);
    }
  }, [
    askAuth,
    args.campaignSlug,
    args.merchantSlug,
    campaign,
    campaignEnded,
    campaignPlayable,
    claimedCount,
    couponLimitReached,
    dailyLimitReached,
    gameType,
    isPassMode,
    matchOverlayOpen,
    maxCouponsPerPlayer,
    mode,
    openCampaignAssignment,
    portal.joinTournament,
    portal.openRunAssignments,
    portal.portalSessionReady,
    user?.partner,
    refreshCoupons,
    refreshDailyQuota,
    uid,
    user?.platformAccessToken,
  ]);

  const hasClaimed = claimedCount > 0;

  return {
    authed,
    joining,
    settlingAfterGame,
    note,
    campaign,
    campaignEnded,
    campaignNotStarted,
    campaignPlayable,
    timeRemaining,
    isPassMode,
    hasLeaderboard,
    showLeaderboard,
    settlementStatus,
    merchantInfo: args.campaignPublic?.merchant ?? null,
    periodLabel,
    myCoupons: sortedCoupons,
    latestCoupon,
    freshCoupon,
    showCouponPanel: Boolean(isPassMode && freshCoupon),
    hasClaimed,
    maxCouponsPerPlayer,
    maxPlaysPerDay,
    dayTimezone,
    claimedCount,
    remainingChallenges,
    couponLimitReached,
    playsToday,
    remainingPlaysToday,
    dailyLimitReached,
    canChallenge,
    matchOverlayOpen,
    gameSessionActive,
    matchOverlayPhase: queueClaiming ? ("claiming" as const) : ("waiting" as const),
    matchWaitingForPeer:
      awaitingMatch != null && !queueWaiting && !queueClaiming
        ? true
        : (primaryQueueEntry?.waitingForPeer ?? false),
    leavingMatch,
    leaveMatchQueue,
    leaderboard,
    playHistory,
    refreshPlayHistory,
    loadingPublic: args.loadingPublic,
    startPlay,
    dismissFreshCoupon: () => setFreshCoupon(null),
    signIn: () => askAuth({}),
  };
}
