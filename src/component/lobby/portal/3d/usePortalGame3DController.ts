import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getPortalTournamentDefinition } from "@/convex/portal/convex/data/portalTournamentConfigs";
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
import {
  portalPlayModalForGameType,
  usePortal,
} from "../service/usePortalManager";
import {
  pickPortalOpenAssignmentForMode,
  pickPortalOpenAssignmentsForGameType,
  pickPortalMatchQueueForGameType,
} from "../service/portalOpenRunHelpers";

import {
  leaveMatchQueueErrorText,
} from "./portalGame3DFormatters";
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
  const { openModal } = useModalManager();
  const historyReport = usePortalHistoryReport();

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
  const [weeklyCloseModalOpen, setWeeklyCloseModalOpen] = useState(false);
  const weeklyCloseShownRef = useRef<string | null>(null);

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
  const soloJoinBlocked =
    matchOverlayOpen || (hasGlobalOpenRun && soloOpenAssignment == null);
  const multiJoinBlocked =
    matchOverlayOpen || (hasGlobalOpenRun && multiOpenAssignment == null);

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

  const league = portal.weeklyLeagueTierView;
  const totalLeaderboard = portal.totalLeaderboard;
  const cohortLeaderboard = portal.cohortLeaderboard;
  const leaderboardRows =
    league?.enrolled && cohortLeaderboard.length > 0
      ? cohortLeaderboard
      : totalLeaderboard;

  const tierView: Portal3DTierInfo = useMemo(() => {
    if (league) {
      const tierId = (league.tierId as PortalTierId) ?? "bronze";
      const { tierLabel, division } = portalTierDisplayLabel(tierId);
      return {
        tierId,
        tierLabel,
        division,
        cohortNo: league.cohortNo,
        rank: league.cohortRank,
        cohortSize: league.cohortSize,
        points: league.points,
        projectedCoins: league.projectedCoins,
        promoteTo: league.promoteTo,
        demoteFrom: league.demoteFrom,
      };
    }
    const myTotal = portal.myWeeklyPoints?.total;
    const { tierLabel, division } = portalTierDisplayLabel("bronze");
    return {
      tierId: "bronze",
      tierLabel,
      division,
      cohortNo: null,
      rank: myTotal?.rank ?? null,
      cohortSize: 50,
      points: myTotal?.points ?? 0,
      projectedCoins: null,
      promoteTo: 10,
      demoteFrom: 41,
    };
  }, [league, portal.myWeeklyPoints?.total]);

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
      setNote("匹配超时，请稍后重试。");
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
        setNote("请先登录后再开始挑战。");
        return;
      }
      if (!portal.portalSessionReady) {
        setNote("正在同步对局状态，请稍候…");
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
        setNote("已在匹配队列中，请先退出匹配或等待开桌。");
        return;
      }
      if (mode === "multi" && multiJoinBlocked && !queueWaiting) {
        setNote("正在匹配或对局创建中，请稍候。");
        return;
      }
      if (mode === "solo" && soloJoinBlocked) {
        setNote("正在匹配或对局创建中，请稍候。");
        return;
      }

      setJoining(mode);
      setNote(null);
      try {
        const outcome = await portal.joinTournament(mode);
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
      multiJoinBlocked,
      multiOpenAssignment,
      openAssignment,
      openModal,
      portal.gameType,
      portal.joinTournament,
      portal.portalSessionReady,
      queueWaiting,
      soloJoinBlocked,
      soloOpenAssignment,
    ]
  );

  return {
    portal,
    visible,
    authed,
    user,
    signIn,
    signOut,
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
    weeklyCloseModalOpen,
    setWeeklyCloseModalOpen,
    openAssignments,
    soloOpenAssignment,
    multiOpenAssignment,
    soloJoinBlocked,
    multiJoinBlocked,
    queueWaiting,
    queueClaiming,
    hasOpenRun,
    matchOverlayOpen,
    primaryQueueEntry,
    primaryQueueTitle,
    handleJoin,
    handleLeaveMatchQueue,
    openAssignment,
    totalLeaderboard,
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
