import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getPortalDailyPlayLimits } from "@/convex/portal/convex/data/portalDailyPlayLimits";
import {
  getPortalTournamentDefinition,
  portalTournamentIdForMode,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import { getPortalAdPhase, setPortalAdPhase } from "host/service/ads/display/portalAdPhase";
import { isPortalAdCoinClientSurfaceEnabled } from "host/service/ads/rewarded/portalAdCoinSurface";
import { useModalManager } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";

import {
  assignmentMatchesAwaitWatch,
  hasAnyOpenCasualRunAssignment,
  modalDataForOpenAssignment,
  type OpenCasualRunAssignment,
} from "../../casual/service/casualOpenRunAssignment";
import { joinEntryErrorMessage } from "../../casual/view/shared/casualEconomyUi";
import {
  CASUAL_MATCH_OPEN_TIMEOUT_MS,
  type AwaitOpenCasualRunMatchWatch,
  useAwaitOpenCasualRunAssignment,
} from "../../casual/service/useAwaitOpenCasualRunAssignment";
import { usePortalHistoryReport } from "../PortalHistoryReportOverlays";
import { requestPortalAdEntry } from "../service/requestPortalAdEntry";
import {
  portalPlayModalForGameType,
  usePortal,
} from "../service/usePortalManager";
import {
  pickActivePortalOpenAssignmentsForGameType,
  pickPortalOpenAssignmentForMode,
  pickPortalOpenAssignmentsForGameType,
  pickPortalMatchQueueForGameType,
} from "../service/portalOpenRunHelpers";

import {
  campaignFlowErrorMessage,
  portalFlowMessage,
} from "../shared/portalErrorMessage";
import { leaveMatchQueueErrorText } from "./portalGame3DFormatters";
import { countPortalModePlaysToday } from "./portalDailyPlayQuotaClient";
import { resolvePortalWeeklyCloseDisplay } from "./portalWeeklyCloseDisplay";
import { portalTierDisplayLabel, type PortalTierId } from "./portalGame3DTheme";
import type {
  Portal3DRulesAnchor,
  Portal3DTierInfo,
} from "./PortalGame3DInner";

export type Portal3DPanelModal = "lb" | "history" | null;

export function usePortalGame3DController({ visible }: { visible: number }) {
  const portal = usePortal();
  const { user, askAuth, cancelAuth, logout } = useUserManager();
  const { openModal, modals } = useModalManager();
  const historyReport = usePortalHistoryReport();
  /** 刷新后若有进行中对局，自动打开一次（避免再点「继续」） */
  const autoResumeOpenRunRef = useRef(false);

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);

  const signOut = useCallback(() => {
    cancelAuth();
    void logout();
  }, [cancelAuth, logout]);

  const authed = Boolean(isPlatformAuthed(user) && portal.portalSessionReady);
  const [joining, setJoining] = useState<"solo" | "multi" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const showNote = useCallback((message: string | null) => {
    setNote(message);
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 4000);
    return () => window.clearTimeout(t);
  }, [note]);
  const [awaitingMatch, setAwaitingMatch] = useState<AwaitOpenCasualRunMatchWatch | null>(
    null
  );
  const [leavingMatch, setLeavingMatch] = useState(false);
  const [panelModal, setPanelModal] = useState<Portal3DPanelModal>(null);
  const [rulesModalOpen, setRulesModalOpen] =
    useState<Portal3DRulesAnchor | null>(null);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [giftCardOrdersModalOpen, setGiftCardOrdersModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [weeklyCloseModalOpen, setWeeklyCloseModalOpen] = useState(false);
  const weeklyCloseShownRef = useRef<string | null>(null);

  useEffect(() => {
    portal.setCohortLeaderboardPolling(panelModal === "lb");
    return () => portal.setCohortLeaderboardPolling(false);
  }, [panelModal, portal]);

  const openAssignments = useMemo(() => {
    if (!portal.gameType) return [];
    return pickPortalOpenAssignmentsForGameType(
      portal.openRunAssignments,
      portal.gameType
    );
  }, [portal.openRunAssignments, portal.gameType]);

  const soloOpenAssignment = useMemo(() => {
    if (!portal.gameType) return undefined;
    return pickPortalOpenAssignmentForMode(
      portal.openRunAssignments,
      portal.gameType,
      "solo"
    );
  }, [portal.gameType, portal.openRunAssignments]);

  const multiOpenAssignment = useMemo(() => {
    if (!portal.gameType) return undefined;
    return pickPortalOpenAssignmentForMode(
      portal.openRunAssignments,
      portal.gameType,
      "multi"
    );
  }, [portal.gameType, portal.openRunAssignments]);

  const matchQueue = useMemo(() => {
    if (!portal.gameType) return [];
    return pickPortalMatchQueueForGameType(portal.matchQueueEntries, portal.gameType);
  }, [portal.matchQueueEntries, portal.gameType]);

  const queueWaiting = matchQueue.some((e) => e.status === "waiting");
  const queueClaiming = matchQueue.some((e) => e.status === "claiming");
  const primaryQueueEntry = matchQueue[0];
  const primaryQueueTitle = primaryQueueEntry
    ? getPortalTournamentDefinition(primaryQueueEntry.templateId)?.title ??
      primaryQueueEntry.templateId
    : "";

  const hasGlobalOpenRun = hasAnyOpenCasualRunAssignment(portal.openRunAssignments);
  const hasOpenRun = openAssignments.length > 0;
  const matchOverlayOpen =
    awaitingMatch != null || queueWaiting || queueClaiming;

  useEffect(() => {
    if (visible === 0) return;
    if (matchOverlayOpen) {
      setPortalAdPhase("matchmaking");
      return;
    }
    if (getPortalAdPhase() === "matchmaking") {
      setPortalAdPhase("lobby");
    }
  }, [visible, matchOverlayOpen]);

  const dailyPlayLimits = getPortalDailyPlayLimits();
  const soloMaxPlaysPerDay =
    portal.dailyPlayQuota?.solo.maxPlaysPerDay ?? dailyPlayLimits.solo;
  const multiMaxPlaysPerDay =
    portal.dailyPlayQuota?.multi.maxPlaysPerDay ?? dailyPlayLimits.multi;
  const clientSoloPlays = portal.gameType
    ? countPortalModePlaysToday({
        gameHistory: portal.gameHistory,
        openAssignments: portal.openRunAssignments,
        gameType: portal.gameType,
        mode: "solo",
      })
    : 0;
  const clientMultiPlays = portal.gameType
    ? countPortalModePlaysToday({
        gameHistory: portal.gameHistory,
        openAssignments: portal.openRunAssignments,
        gameType: portal.gameType,
        mode: "multi",
      })
    : 0;
  /**
   * 今日已挑战（免费 + 广告入场 + 门票入场）。
   * 取服务端与战绩推算的较大值；服务端 0 时 `??` 不会回退，故用 Math.max。
   */
  const soloPlaysToday = Math.max(
    portal.dailyPlayQuota?.solo.playsToday ?? 0,
    clientSoloPlays
  );
  const multiPlaysToday = Math.max(
    portal.dailyPlayQuota?.multi.playsToday ?? 0,
    clientMultiPlays
  );
  /** 免费档用尽 → 切到广告/门票入场 CTA（上限仍是免费 cap，与 assert 的 free 段一致） */
  const soloDailyExhausted = authed && soloPlaysToday >= soloMaxPlaysPerDay;
  const multiDailyExhausted = authed && multiPlaysToday >= multiMaxPlaysPerDay;
  const soloAdEntryAvailable =
    portal.adEntryOffer?.solo.enabled === true &&
    ((portal.adEntryOffer.solo.remaining ?? 0) > 0 ||
      portal.adEntryOffer.solo.hasReadyGrant === true);
  const multiAdEntryAvailable =
    portal.adEntryOffer?.multi.enabled === true &&
    ((portal.adEntryOffer.multi.remaining ?? 0) > 0 ||
      portal.adEntryOffer.multi.hasReadyGrant === true);
  const soloTicketEntryAvailable =
    portal.ticketEntryOffer?.solo.enabled === true &&
    (portal.ticketEntryOffer.solo.remaining ?? 0) > 0;
  const multiTicketEntryAvailable =
    portal.ticketEntryOffer?.multi.enabled === true &&
    (portal.ticketEntryOffer.multi.remaining ?? 0) > 0;

  const soloJoinBlocked =
    matchOverlayOpen ||
    (hasGlobalOpenRun && soloOpenAssignment == null) ||
    (soloDailyExhausted &&
      !soloAdEntryAvailable &&
      !soloTicketEntryAvailable &&
      soloOpenAssignment == null);
  const multiJoinBlocked =
    matchOverlayOpen ||
    (hasGlobalOpenRun && multiOpenAssignment == null) ||
    (multiDailyExhausted &&
      !multiAdEntryAvailable &&
      !multiTicketEntryAvailable &&
      multiOpenAssignment == null);

  const openAssignment = useCallback(
    (hit: OpenCasualRunAssignment) => {
      if (!portal.gameType) return;
      setPanelModal(null);
      openModal({
        name: portalPlayModalForGameType(portal.gameType),
        data: modalDataForOpenAssignment(hit),
      });
    },
    [openModal, portal.gameType]
  );

  useEffect(() => {
    if (autoResumeOpenRunRef.current) return;
    if (visible === 0 || !authed || !portal.gameType) return;
    // 排队/匹配中交给既有 await 流程；周结算弹窗打开时等关掉后再进
    if (matchOverlayOpen || weeklyCloseModalOpen) return;

    const playModalName = portalPlayModalForGameType(portal.gameType);
    if (modals.some((m) => m.name === playModalName)) {
      autoResumeOpenRunRef.current = true;
      return;
    }

    const resume =
      pickActivePortalOpenAssignmentsForGameType(
        portal.openRunAssignments,
        portal.gameType
      )[0] ??
      soloOpenAssignment ??
      multiOpenAssignment;
    if (!resume) return;

    autoResumeOpenRunRef.current = true;
    openAssignment(resume);
  }, [
    visible,
    authed,
    portal.gameType,
    portal.openRunAssignments,
    soloOpenAssignment,
    multiOpenAssignment,
    matchOverlayOpen,
    weeklyCloseModalOpen,
    modals,
    openAssignment,
  ]);

  const league = portal.weeklyLeagueTierView;
  const cohortLeaderboard = portal.cohortLeaderboard;
  const leaderboardRows = cohortLeaderboard;

  const tierView: Portal3DTierInfo = useMemo(() => {
    const tierId = (league?.tierId as PortalTierId) ?? "bronze";
    const { tierLabel, division } = portalTierDisplayLabel(tierId);
    return {
      tierId,
      tierLabel,
      division,
      cohortNo: league?.cohortNo ?? null,
      rank: league?.cohortRank ?? null,
      cohortSize: league?.cohortSize ?? 30,
      cohortMemberCount: league?.cohortMemberCount ?? 0,
      points: league?.points ?? 0,
      projectedCoins: league?.projectedCoins ?? null,
      promoteTo: league?.promoteTo ?? 8,
      demoteFrom: league?.demoteFrom ?? 23,
    };
  }, [league]);

  const unclaimedRewards = league?.unclaimedRewards ?? null;
  const weeklyCloseDisplay = useMemo(
    () => resolvePortalWeeklyCloseDisplay(league),
    [league]
  );

  const openWeeklyCloseModal = useCallback(() => {
    setWeeklyCloseModalOpen(true);
  }, []);

  useEffect(() => {
    if (visible === 0 || !league?.unreadCloseResult) return;
    const key = league.closeWeekKey ?? league.weekKey;
    if (weeklyCloseShownRef.current === key) return;
    weeklyCloseShownRef.current = key;
    setWeeklyCloseModalOpen(true);
  }, [visible, league?.unreadCloseResult, league?.closeWeekKey, league?.weekKey]);

  useAwaitOpenCasualRunAssignment({
    watch: awaitingMatch,
    enabled: visible !== 0 && awaitingMatch != null,
    timeoutMs: CASUAL_MATCH_OPEN_TIMEOUT_MS + 15_000,
    openRunAssignments: portal.openRunAssignments,
    onMatched: (hit) => {
      setAwaitingMatch(null);
      setNote(null);
      openAssignment(hit);
    },
    onTimeout: () => {
      setAwaitingMatch(null);
      setNote(campaignFlowErrorMessage("matchTimeout"));
    },
  });

  useEffect(() => {
    const entry = primaryQueueEntry;
    if (!portal.gameType) return;
    if (entry && (entry.status === "waiting" || entry.status === "claiming")) {
      setAwaitingMatch({
        templateId: entry.templateId,
        gameKind: portal.gameType,
      });
    }
  }, [portal.gameType, primaryQueueEntry?.templateId, primaryQueueEntry?.status]);

  useEffect(() => {
    if (visible === 0 || panelModal !== "history") return;
    void portal.reconcilePendingHistorySettlements();
  }, [visible, panelModal, portal.reconcilePendingHistorySettlements]);

  useEffect(() => {
    if (user?.uid || panelModal !== "history") return;
    setPanelModal(null);
  }, [user?.uid, panelModal]);

  useEffect(() => {
    if (!awaitingMatch || !portal.gameType) return;
    const hit = portal.openRunAssignments.find((a) =>
      assignmentMatchesAwaitWatch(a, awaitingMatch)
    );
    if (!hit) return;
    setAwaitingMatch(null);
    setNote(null);
    openAssignment(hit);
  }, [awaitingMatch, portal.gameType, portal.openRunAssignments, openAssignment]);

  const handleLeaveMatchQueue = useCallback(async () => {
    if (leavingMatch || !queueWaiting) return;
    setLeavingMatch(true);
    try {
      const res = await portal.leaveCasualMatchQueue(primaryQueueEntry?.templateId);
      setAwaitingMatch(null);
      if (res.ok) {
        setNote(null);
      } else {
        setNote(leaveMatchQueueErrorText(res.error));
      }
    } finally {
      setLeavingMatch(false);
    }
  }, [
    leavingMatch,
    portal.leaveCasualMatchQueue,
    primaryQueueEntry?.templateId,
    queueWaiting,
  ]);

  const handleJoin = useCallback(
    async (mode: "solo" | "multi") => {
      if (!authed) {
        askAuth({});
        setNote(portalFlowMessage("signInToChallenge"));
        return;
      }
      if (!portal.portalSessionReady) {
        setNote(campaignFlowErrorMessage("syncingSession"));
        return;
      }

      const resumeAssignment =
        mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
      if (resumeAssignment) {
        openAssignment(resumeAssignment);
        return;
      }

      if (hasGlobalOpenRun) {
        setNote(joinEntryErrorMessage("already_in_open_match"));
        return;
      }

      if (mode === "multi" && queueWaiting) {
        setNote(portalFlowMessage("alreadyInQueue"));
        return;
      }
      if (mode === "multi" && multiJoinBlocked && !queueWaiting) {
        setNote(
          multiDailyExhausted && !multiOpenAssignment
            ? joinEntryErrorMessage("daily_play_limit_reached")
            : campaignFlowErrorMessage("matchingInProgress")
        );
        return;
      }
      if (mode === "solo" && soloJoinBlocked) {
        setNote(
          soloDailyExhausted && !soloOpenAssignment
            ? joinEntryErrorMessage("daily_play_limit_reached")
            : campaignFlowErrorMessage("matchingInProgress")
        );
        return;
      }

      setJoining(mode);
      setNote(null);
      try {
        const freeExhausted =
          mode === "solo" ? soloDailyExhausted : multiDailyExhausted;
        const adAvailable =
          mode === "solo" ? soloAdEntryAvailable : multiAdEntryAvailable;
        const ticketAvailable =
          mode === "solo" ? soloTicketEntryAvailable : multiTicketEntryAvailable;
        const hasReadyGrant =
          mode === "solo"
            ? portal.adEntryOffer?.solo.hasReadyGrant === true
            : portal.adEntryOffer?.multi.hasReadyGrant === true;

        let adEntry = false;
        let ticketEntry = false;
        if (freeExhausted) {
          if (adAvailable) {
            if (!hasReadyGrant) {
              const templateId = portal.gameType
                ? portalTournamentIdForMode(portal.gameType, mode)
                : null;
              if (!templateId) {
                setNote(joinEntryErrorMessage("unknown_tournament"));
                return;
              }
              const ad = await requestPortalAdEntry({ mode, templateId });
              if (!ad.ok) {
                setNote(joinEntryErrorMessage(ad.error));
                return;
              }
            }
            adEntry = true;
          } else if (ticketAvailable) {
            ticketEntry = true;
          }
        }

        const outcome = await portal.joinTournament(mode, {
          ...(adEntry ? { adEntry: true } : {}),
          ...(ticketEntry ? { ticketEntry: true } : {}),
        });
        if (outcome.kind === "ready") {
          openModal({
            name: portalPlayModalForGameType(portal.gameType!),
            data: {
              casualTournamentId: outcome.templateId,
              casualMatchGameId: outcome.gameId,
              casualSessionKey: `${outcome.gameId}:${Date.now()}`,
            },
          });
        } else if (outcome.kind === "queued") {
          setAwaitingMatch({
            templateId: outcome.templateId,
            gameKind: portal.gameType!,
          });
        } else if (
          outcome.error === joinEntryErrorMessage("already_in_open_match")
        ) {
          const fallback =
            mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
          if (fallback) {
            openAssignment(fallback);
          } else {
            setNote(outcome.error);
          }
        } else {
          setNote(outcome.error);
        }
      } finally {
        setJoining(null);
      }
    },
    [
      askAuth,
      authed,
      hasGlobalOpenRun,
      multiAdEntryAvailable,
      multiDailyExhausted,
      multiJoinBlocked,
      multiOpenAssignment,
      multiTicketEntryAvailable,
      openAssignment,
      openModal,
      portal.adEntryOffer,
      portal.gameType,
      portal.joinTournament,
      portal.portalSessionReady,
      queueWaiting,
      soloAdEntryAvailable,
      soloDailyExhausted,
      soloJoinBlocked,
      soloOpenAssignment,
      soloTicketEntryAvailable,
    ]
  );

  const adCoinClientEnabled =
    authed &&
    isPortalAdCoinClientSurfaceEnabled() &&
    portal.adCoinOffer?.enabled === true;

  return {
    portal,
    visible,
    authed,
    user,
    userEmail: user?.email,
    userPhone: user?.phone,
    signIn,
    signOut,
    adCoinClientEnabled,
    joining,
    note,
    showNote,
    leavingMatch,
    panelModal,
    setPanelModal,
    rulesModalOpen,
    setRulesModalOpen,
    shopModalOpen,
    setShopModalOpen,
    giftCardOrdersModalOpen,
    setGiftCardOrdersModalOpen,
    accountModalOpen,
    setAccountModalOpen,
    weeklyCloseModalOpen,
    setWeeklyCloseModalOpen,
    openAssignments,
    soloOpenAssignment,
    multiOpenAssignment,
    soloJoinBlocked,
    multiJoinBlocked,
    soloPlaysToday,
    multiPlaysToday,
    soloMaxPlaysPerDay,
    multiMaxPlaysPerDay,
    soloDailyExhausted,
    multiDailyExhausted,
    soloAdEntryAvailable,
    multiAdEntryAvailable,
    soloTicketEntryAvailable,
    multiTicketEntryAvailable,
    soloTicketEntryPrice: portal.ticketEntryOffer?.solo.priceTickets,
    multiTicketEntryPrice: portal.ticketEntryOffer?.multi.priceTickets,
    soloTicketEntryRemaining: portal.ticketEntryOffer?.solo.remaining,
    multiTicketEntryRemaining: portal.ticketEntryOffer?.multi.remaining,
    queueWaiting,
    queueClaiming,
    hasOpenRun,
    matchOverlayOpen,
    primaryQueueEntry,
    primaryQueueTitle,
    handleJoin,
    handleLeaveMatchQueue,
    openAssignment,
    cohortLeaderboard,
    leaderboardRows,
    tierView,
    unclaimedRewards,
    weeklyCloseDisplay,
    openWeeklyCloseModal,
    historyReport,
    awaitingMatch,
  };
}
