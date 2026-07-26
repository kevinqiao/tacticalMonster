import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getPortalDailyPlayLimits } from "@/convex/portal/convex/data/portalDailyPlayLimits";
import {
  getPortalTournamentDefinition,
  portalTournamentIdForMode,
  portalTournamentUsesPlayEntryLadder,
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
  usePortalLobby,
  type PortalLobbyOfferingView,
} from "../PortalLobbyContext";

const getTournamentDef = getPortalTournamentDefinition;

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
  const { lobby } = usePortalLobby();
  const { user, askAuth, cancelAuth, logout } = useUserManager();
  const { openModal, modals } = useModalManager();
  const historyReport = usePortalHistoryReport();
  /** 刷新后若有进行中对局，自动打开一次（避免再点「继续」） */
  const autoResumeOpenRunRef = useRef(false);
  const [tournamentPicker, setTournamentPicker] = useState<{
    mode: "solo" | "multi";
    offerings: PortalLobbyOfferingView[];
  } | null>(null);

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);

  const signOut = useCallback(() => {
    cancelAuth();
    void logout();
  }, [cancelAuth, logout]);

  const authed = Boolean(isPlatformAuthed(user) && portal.portalSessionReady);
  const [joining, setJoining] = useState<"solo" | "multi" | null>(null);
  /** Which offering is joining — picker shows "joining" only on this ticket. */
  const [joiningTournamentId, setJoiningTournamentId] = useState<string | null>(
    null
  );
  /**
   * Keep the shared match overlay up after join returns `ready` until the play
   * modal is registered — covers the Suspense/chunk gap solo used to flash through.
   */
  const [openingPlay, setOpeningPlay] = useState(false);
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
  const sawQueueForAwaitRef = useRef(false);
  const suppressAwaitRearmRef = useRef(false);
  const awaitingMatchRef = useRef(awaitingMatch);
  awaitingMatchRef.current = awaitingMatch;
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
  const playModalName = portal.gameType
    ? portalPlayModalForGameType(portal.gameType)
    : null;
  const playModalOpen = Boolean(
    playModalName && modals.some((m) => m.name === playModalName)
  );
  /** Solo (and multi pre-queue) reuse the multi “Creating match” overlay. */
  // Keep off while tournament picker is open — stacking its dim backdrop under the
  // picker's semi-transparent mask briefly turns the screen black on failed joins.
  const matchOverlayOpen =
    tournamentPicker == null &&
    (joining != null ||
      openingPlay ||
      awaitingMatch != null ||
      queueWaiting ||
      queueClaiming);

  useEffect(() => {
    if (!openingPlay) return;
    if (playModalOpen) {
      setOpeningPlay(false);
      return;
    }
    const t = window.setTimeout(() => setOpeningPlay(false), 10_000);
    return () => window.clearTimeout(t);
  }, [openingPlay, playModalOpen]);

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
  const quotaScope = portal.dailyPlayQuota?.quotaScope ?? "mode";
  const soloMaxPlaysPerDay =
    portal.dailyPlayQuota?.solo.maxPlaysPerDay ?? dailyPlayLimits.solo;
  const multiMaxPlaysPerDay =
    portal.dailyPlayQuota?.multi.maxPlaysPerDay ?? dailyPlayLimits.multi;
  // Ladder pool (free/ad/ticket only) — used for exhaustion / join CTA.
  const clientSoloLadderPlays = countPortalModePlaysToday({
    gameHistory: portal.gameHistory,
    openAssignments: portal.openRunAssignments,
    mode: "solo",
    allModes: quotaScope === "lobby",
    entryLadderOnly: true,
  });
  const clientMultiLadderPlays = countPortalModePlaysToday({
    gameHistory: portal.gameHistory,
    openAssignments: portal.openRunAssignments,
    mode: "multi",
    allModes: quotaScope === "lobby",
    entryLadderOnly: true,
  });
  /**
   * 免费/广告/门票阶梯今日次数（不含金币桌）。
   * 取服务端与战绩推算的较大值；服务端 0 时 `??` 不会回退，故用 Math.max。
   */
  const soloLadderPlaysToday = Math.max(
    portal.dailyPlayQuota?.solo.playsToday ?? 0,
    clientSoloLadderPlays
  );
  const multiLadderPlaysToday = Math.max(
    portal.dailyPlayQuota?.multi.playsToday ?? 0,
    clientMultiLadderPlays
  );
  /** 主页「今日已挑战 N」：含金币/宝石桌等全部对局。 */
  const soloPlaysToday = countPortalModePlaysToday({
    gameHistory: portal.gameHistory,
    openAssignments: portal.openRunAssignments,
    mode: "solo",
    allModes: quotaScope === "lobby",
    entryLadderOnly: false,
  });
  const multiPlaysToday = countPortalModePlaysToday({
    gameHistory: portal.gameHistory,
    openAssignments: portal.openRunAssignments,
    mode: "multi",
    allModes: quotaScope === "lobby",
    entryLadderOnly: false,
  });
  /** 免费档用尽 → 切到广告/门票入场 CTA（上限仍是免费 cap，与 assert 的 free 段一致） */
  const soloDailyExhausted = authed && soloLadderPlaysToday >= soloMaxPlaysPerDay;
  const multiDailyExhausted = authed && multiLadderPlaysToday >= multiMaxPlaysPerDay;

  const isFreeExhaustedForTemplate = useCallback(
    (mode: "solo" | "multi", templateId: string | null | undefined) => {
      if (!authed) return false;
      if (templateId) {
        const def = getTournamentDef(templateId);
        if (def && !portalTournamentUsesPlayEntryLadder(def)) return false;
      }
      if (quotaScope === "tournament" && templateId) {
        const max =
          mode === "solo" ? soloMaxPlaysPerDay : multiMaxPlaysPerDay;
        const client = countPortalModePlaysToday({
          gameHistory: portal.gameHistory,
          openAssignments: portal.openRunAssignments,
          mode,
          templateId,
          entryLadderOnly: true,
        });
        return client >= max;
      }
      return mode === "solo" ? soloDailyExhausted : multiDailyExhausted;
    },
    [
      authed,
      multiDailyExhausted,
      multiMaxPlaysPerDay,
      portal.gameHistory,
      portal.openRunAssignments,
      quotaScope,
      soloDailyExhausted,
      soloMaxPlaysPerDay,
    ]
  );
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

  const soloOfferingsForBlock = lobby?.offerings.filter(
    (o) => o.matchType === "solo_p75"
  );
  const multiOfferingsForBlock = lobby?.offerings.filter(
    (o) => o.matchType === "multi_ranked"
  );
  const modeHasPaidEntryOffering = (
    offerings: PortalLobbyOfferingView[] | undefined
  ) =>
    (offerings ?? []).some((o) => {
      const def = getTournamentDef(o.tournamentId);
      return def != null && !portalTournamentUsesPlayEntryLadder(def);
    });
  // Paid coin/gem offerings stay joinable after free/ad/ticket ladder is spent.
  const soloDailyLadderBlocked =
    soloDailyExhausted &&
    !soloAdEntryAvailable &&
    !soloTicketEntryAvailable &&
    soloOpenAssignment == null &&
    !modeHasPaidEntryOffering(soloOfferingsForBlock);
  const multiDailyLadderBlocked =
    multiDailyExhausted &&
    !multiAdEntryAvailable &&
    !multiTicketEntryAvailable &&
    multiOpenAssignment == null &&
    !modeHasPaidEntryOffering(multiOfferingsForBlock);

  const soloJoinBlocked =
    matchOverlayOpen ||
    (hasGlobalOpenRun && soloOpenAssignment == null) ||
    soloDailyLadderBlocked;
  const multiJoinBlocked =
    matchOverlayOpen ||
    (hasGlobalOpenRun && multiOpenAssignment == null) ||
    multiDailyLadderBlocked;

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

    if (playModalOpen) {
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
    playModalOpen,
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
      const tid =
        awaitingMatchRef.current?.templateId ?? primaryQueueEntry?.templateId;
      // Prevent queue sync from immediately re-arming overlay while leave runs.
      suppressAwaitRearmRef.current = true;
      sawQueueForAwaitRef.current = false;
      setAwaitingMatch(null);
      void portal.leaveCasualMatchQueue(tid).finally(() => {
        suppressAwaitRearmRef.current = false;
      });
      setNote(campaignFlowErrorMessage("matchTimeout"));
    },
  });

  useEffect(() => {
    if (!awaitingMatch) {
      sawQueueForAwaitRef.current = false;
    }
  }, [awaitingMatch]);

  useEffect(() => {
    const entry = primaryQueueEntry;
    if (!portal.gameType) return;
    if (entry && (entry.status === "waiting" || entry.status === "claiming")) {
      if (suppressAwaitRearmRef.current) return;
      sawQueueForAwaitRef.current = true;
      // Idempotent: avoid new object every render → infinite update loop.
      setAwaitingMatch((prev) => {
        if (
          prev?.templateId === entry.templateId &&
          prev?.gameKind === portal.gameType
        ) {
          return prev;
        }
        return {
          templateId: entry.templateId,
          gameKind: portal.gameType!,
        };
      });
      return;
    }
    // Only clear after we observed a live queue row, then it vanished without open run.
    // Avoid racing the first subscription frame right after join returns `queued`.
    const watch = awaitingMatchRef.current;
    if (
      watch &&
      sawQueueForAwaitRef.current &&
      !queueWaiting &&
      !queueClaiming &&
      !portal.openRunAssignments.some((a) =>
        assignmentMatchesAwaitWatch(a, watch)
      )
    ) {
      sawQueueForAwaitRef.current = false;
      setAwaitingMatch(null);
      setNote(campaignFlowErrorMessage("matchTimeout"));
    }
  }, [
    portal.gameType,
    portal.openRunAssignments,
    primaryQueueEntry?.templateId,
    primaryQueueEntry?.status,
    queueClaiming,
    queueWaiting,
  ]);

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
    if (leavingMatch || (!queueWaiting && !queueClaiming)) return;
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
    queueClaiming,
    queueWaiting,
  ]);

  const executeJoin = useCallback(
    async (
      mode: "solo" | "multi",
      tournamentIdOverride?: string
    ): Promise<"ok" | "error"> => {
      if (!authed) {
        askAuth({});
        setNote(portalFlowMessage("signInToChallenge"));
        return "error";
      }
      if (!portal.portalSessionReady) {
        setNote(campaignFlowErrorMessage("syncingSession"));
        return "error";
      }

      const resumeAssignment =
        mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
      if (resumeAssignment) {
        openAssignment(resumeAssignment);
        return "ok";
      }

      if (hasGlobalOpenRun) {
        setNote(joinEntryErrorMessage("already_in_open_match"));
        return "error";
      }

      if (mode === "multi" && queueWaiting) {
        setNote(portalFlowMessage("alreadyInQueue"));
        return "error";
      }

      const templateId =
        tournamentIdOverride ??
        (lobby
          ? mode === "solo"
            ? lobby.soloTournamentId
            : lobby.multiTournamentId
          : null) ??
        (portal.gameType ? portalTournamentIdForMode(portal.gameType, mode) : null);

      const templateDef = templateId ? getTournamentDef(templateId) : null;
      const usesPlayEntryLadder =
        !templateDef || portalTournamentUsesPlayEntryLadder(templateDef);

      // Coin/gem tables bypass free→ad→ticket daily ladder (and its join block).
      if (usesPlayEntryLadder) {
        if (mode === "multi" && multiJoinBlocked && !queueWaiting) {
          setNote(
            multiDailyExhausted && !multiOpenAssignment
              ? joinEntryErrorMessage("daily_play_limit_reached")
              : campaignFlowErrorMessage("matchingInProgress")
          );
          return "error";
        }
        if (mode === "solo" && soloJoinBlocked) {
          setNote(
            soloDailyExhausted && !soloOpenAssignment
              ? joinEntryErrorMessage("daily_play_limit_reached")
              : campaignFlowErrorMessage("matchingInProgress")
          );
          return "error";
        }
      }

      const playGameType =
        (templateDef?.gameType ?? null) ?? portal.gameType;

      setJoining(mode);
      setJoiningTournamentId(templateId ?? null);
      setNote(null);
      try {
        const freeExhausted =
          usesPlayEntryLadder && isFreeExhaustedForTemplate(mode, templateId);
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
              if (!templateId) {
                setNote(joinEntryErrorMessage("unknown_tournament"));
                return "error";
              }
              const ad = await requestPortalAdEntry({
                mode,
                templateId,
                lobbyId: lobby?.lobbyId ?? null,
              });
              if (!ad.ok) {
                setNote(joinEntryErrorMessage(ad.error));
                return "error";
              }
            }
            adEntry = true;
          } else if (ticketAvailable) {
            ticketEntry = true;
          }
        }

        const outcome = await portal.joinTournament(mode, {
          ...(templateId ? { tournamentId: templateId } : {}),
          ...(adEntry ? { adEntry: true } : {}),
          ...(ticketEntry ? { ticketEntry: true } : {}),
        });
        if (outcome.kind === "ready") {
          setOpeningPlay(true);
          const modalGame =
            getTournamentDef(outcome.templateId)?.gameType ?? playGameType;
          openModal({
            name: portalPlayModalForGameType(modalGame as typeof portal.gameType),
            data: {
              casualTournamentId: outcome.templateId,
              casualMatchGameId: outcome.gameId,
              casualSessionKey: `${outcome.gameId}:${Date.now()}`,
            },
          });
          return "ok";
        }
        if (outcome.kind === "queued") {
          setAwaitingMatch({
            templateId: outcome.templateId,
            gameKind: (playGameType ?? portal.gameType)!,
          });
          return "ok";
        }
        if (outcome.error === joinEntryErrorMessage("already_in_open_match")) {
          const fallback =
            mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
          if (fallback) {
            setOpeningPlay(true);
            openAssignment(fallback);
            return "ok";
          }
          setNote(outcome.error);
          return "error";
        }
        setNote(outcome.error);
        return "error";
      } finally {
        setJoining(null);
        setJoiningTournamentId(null);
      }
    },
    [
      askAuth,
      authed,
      hasGlobalOpenRun,
      isFreeExhaustedForTemplate,
      lobby,
      multiAdEntryAvailable,
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
      soloJoinBlocked,
      soloOpenAssignment,
      soloTicketEntryAvailable,
    ]
  );

  const entryStateForTournament = useCallback(
    (tournamentId: string, mode: "solo" | "multi") => {
      const def = getTournamentDef(tournamentId);
      const isJoiningThis =
        joiningTournamentId != null
          ? joiningTournamentId === tournamentId
          : joining === mode;
      const siblingJoining =
        joining === mode && joiningTournamentId != null && !isJoiningThis;
      // Paid coin/gem tables: picker shows wallet fee, not free/ad/ticket ladder.
      if (def && !portalTournamentUsesPlayEntryLadder(def)) {
        return {
          dailyExhausted: false,
          adEntryAvailable: false,
          ticketEntryAvailable: false,
          playsToday: 0,
          maxPlaysPerDay: 0,
          joining: isJoiningThis,
          siblingJoining,
        };
      }
      const maxPlaysPerDay =
        mode === "solo" ? soloMaxPlaysPerDay : multiMaxPlaysPerDay;
      // Picker free-quota stub uses ladder-only counts (coin tables have their own fee UI).
      const playsToday =
        quotaScope === "tournament"
          ? countPortalModePlaysToday({
              gameHistory: portal.gameHistory,
              openAssignments: portal.openRunAssignments,
              mode,
              templateId: tournamentId,
              entryLadderOnly: true,
            })
          : mode === "solo"
            ? soloLadderPlaysToday
            : multiLadderPlaysToday;
      const dailyExhausted =
        quotaScope === "tournament"
          ? playsToday >= maxPlaysPerDay
          : mode === "solo"
            ? soloDailyExhausted
            : multiDailyExhausted;
      return {
        dailyExhausted,
        adEntryAvailable:
          mode === "solo" ? soloAdEntryAvailable : multiAdEntryAvailable,
        ticketEntryAvailable:
          mode === "solo" ? soloTicketEntryAvailable : multiTicketEntryAvailable,
        ticketEntryPrice:
          mode === "solo"
            ? portal.ticketEntryOffer?.solo.priceTickets
            : portal.ticketEntryOffer?.multi.priceTickets,
        ticketEntryRemaining:
          mode === "solo"
            ? portal.ticketEntryOffer?.solo.remaining
            : portal.ticketEntryOffer?.multi.remaining,
        playsToday,
        maxPlaysPerDay,
        joining: isJoiningThis,
        siblingJoining,
      };
    },
    [
      joining,
      joiningTournamentId,
      multiAdEntryAvailable,
      multiDailyExhausted,
      multiMaxPlaysPerDay,
      multiLadderPlaysToday,
      multiTicketEntryAvailable,
      portal.gameHistory,
      portal.openRunAssignments,
      portal.ticketEntryOffer?.multi.priceTickets,
      portal.ticketEntryOffer?.multi.remaining,
      portal.ticketEntryOffer?.solo.priceTickets,
      portal.ticketEntryOffer?.solo.remaining,
      quotaScope,
      soloAdEntryAvailable,
      soloDailyExhausted,
      soloMaxPlaysPerDay,
      soloLadderPlaysToday,
      soloTicketEntryAvailable,
    ]
  );

  const soloOfferings = useMemo(
    () => lobby?.offerings.filter((o) => o.matchType === "solo_p75") ?? [],
    [lobby?.offerings]
  );
  const multiOfferings = useMemo(
    () => lobby?.offerings.filter((o) => o.matchType === "multi_ranked") ?? [],
    [lobby?.offerings]
  );
  const soloHasMultipleOfferings = soloOfferings.length > 1;
  const multiHasMultipleOfferings = multiOfferings.length > 1;

  const handleJoin = useCallback(
    async (mode: "solo" | "multi") => {
      // 进行中对局优先继续，不打开多赛事选择
      const resume = mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
      if (resume) {
        await executeJoin(mode);
        return;
      }
      const modeOfferings = mode === "solo" ? soloOfferings : multiOfferings;
      if (modeOfferings.length > 1) {
        setTournamentPicker({ mode, offerings: modeOfferings });
        return;
      }
      const onlyId =
        modeOfferings.length === 1 ? modeOfferings[0]!.tournamentId : undefined;
      await executeJoin(mode, onlyId);
    },
    [
      executeJoin,
      multiOfferings,
      multiOpenAssignment,
      soloOfferings,
      soloOpenAssignment,
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
    openingPlay,
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
    soloLadderPlaysToday,
    multiPlaysToday,
    multiLadderPlaysToday,
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
    soloHasMultipleOfferings,
    multiHasMultipleOfferings,
    tournamentPicker,
    quotaScope,
    entryStateForTournament,
    closeTournamentPicker: () => setTournamentPicker(null),
    selectTournamentFromPicker: (tournamentId: string) => {
      const mode = tournamentPicker?.mode;
      if (!mode) return;
      // Keep picker open on failures (e.g. insufficient_coins) so the user can pick again.
      void executeJoin(mode, tournamentId).then((result) => {
        if (result === "ok") setTournamentPicker(null);
      });
    },
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
