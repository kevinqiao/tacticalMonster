import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import i18n from "@/i18n";
import { getPortalDailyPlayLimits } from "@/convex/portal/convex/data/portalDailyPlayLimits";
import {
  getPortalTournamentDefinition,
  isJoinableCasualTournament,
  portalTournamentIdForMode,
  portalTournamentUsesPlayEntryLadder,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import {
  getPortalAdPhase,
  setPortalAdPhase,
  subscribePortalAdPhase,
} from "host/service/ads/display/portalAdPhase";
import { isPortalAdCoinClientSurfaceEnabled } from "host/service/ads/rewarded/portalAdCoinSurface";
import { useModalManager } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";

import {
  hasAnyOpenCasualRunAssignment,
  modalDataForOpenAssignment,
  type CasualPlayModalName,
  type OpenCasualRunAssignment,
} from "../../casual/service/casualOpenRunAssignment";

const CASUAL_PLAY_MODAL_NAMES = new Set<CasualPlayModalName>([
  "play_solitaire_solo",
  "play_block_blast",
  "play_tower_arena",
  "play_match_3",
  "play_yatz",
  "play_casual_triathlon_session",
]);
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
import { portalTournamentFns } from "../service/portalConvexFunctionRefs";
import {
  pickActivePortalOpenAssignment,
  pickActivePortalOpenAssignmentsForGameType,
  inferPortalGameKindFromAssignment,
  pickPortalOpenAssignmentForMode,
  pickPortalOpenAssignmentsForGameType,
  pickPortalMatchQueueForGameType,
  portalAssignmentMatchesAwaitWatch,
} from "../service/portalOpenRunHelpers";
import {
  usePortalLobby,
  type PortalLobbyOfferingView,
} from "../PortalLobbyContext";
import { localizePortalTournamentTitle } from "../portalTournamentLocalize";

const getTournamentDef = getPortalTournamentDefinition;

/** Lobby offerings for Solo/Arena — filter by matchType only (never invent a game slice). */
function filterLobbyOfferingsForMode(
  offerings: PortalLobbyOfferingView[] | undefined,
  mode: "solo" | "multi"
): PortalLobbyOfferingView[] {
  const matchType = mode === "solo" ? "solo_p75" : "multi_ranked";
  return (offerings ?? []).filter((o) => {
    const def = getTournamentDef(o.tournamentId);
    const resolvedMatch = def?.matchType ?? o.matchType;
    return resolvedMatch === matchType;
  });
}

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
   * Keep the shared match overlay up after join/`openAssignment` until the play
   * modal mounts — covers Suspense/chunk gap for both solo and multi.
   * Mode-tagged: multi open-play uses Creating (no Leave), not Matching.
   */
  const [openingPlay, setOpeningPlay] = useState<"solo" | "multi" | null>(null);
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
  const [accountFocusBadges, setAccountFocusBadges] = useState(false);
  const [weeklyCloseModalOpen, setWeeklyCloseModalOpen] = useState(false);
  const [seasonMarksModalOpen, setSeasonMarksModalOpen] = useState(false);
  const weeklyCloseShownRef = useRef<string | null>(null);
  const seasonMarksShownRef = useRef<string | null>(null);
  const prevSeasonLevelRef = useRef<number | null>(null);

  useEffect(() => {
    portal.setCohortLeaderboardPolling(panelModal === "lb");
    return () => portal.setCohortLeaderboardPolling(false);
  }, [panelModal, portal]);

  const openAssignments = useMemo(() => {
    if (!portal.gameType) {
      return [...portal.openRunAssignments].sort(
        (a, b) => b.createdAt - a.createdAt
      );
    }
    return pickPortalOpenAssignmentsForGameType(
      portal.openRunAssignments,
      portal.gameType
    );
  }, [portal.openRunAssignments, portal.gameType]);

  const soloOpenAssignment = useMemo(
    () =>
      pickPortalOpenAssignmentForMode(
        portal.openRunAssignments,
        portal.gameType,
        "solo"
      ),
    [portal.gameType, portal.openRunAssignments]
  );

  const multiOpenAssignment = useMemo(
    () =>
      pickPortalOpenAssignmentForMode(
        portal.openRunAssignments,
        portal.gameType,
        "multi"
      ),
    [portal.gameType, portal.openRunAssignments]
  );

  const matchQueue = useMemo(
    () =>
      pickPortalMatchQueueForGameType(
        portal.matchQueueEntries,
        portal.gameType
      ),
    [portal.matchQueueEntries, portal.gameType]
  );

  const queueWaiting = matchQueue.some((e) => e.status === "waiting");
  const queueClaiming = matchQueue.some((e) => e.status === "claiming");
  const primaryQueueEntry = matchQueue[0];
  const primaryQueueTitle = primaryQueueEntry
    ? localizePortalTournamentTitle(
        primaryQueueEntry.templateId,
        getPortalTournamentDefinition(primaryQueueEntry.templateId)?.title ??
          primaryQueueEntry.templateId
      )
    : "";

  const hasGlobalOpenRun = hasAnyOpenCasualRunAssignment(portal.openRunAssignments);
  const hasOpenRun = openAssignments.length > 0;
  /** Any casual play surface — not only this lobby’s gameType (join may open a sibling kind). */
  const playModalOpen = modals.some((m) =>
    CASUAL_PLAY_MODAL_NAMES.has(m.name as CasualPlayModalName)
  );
  /**
   * Match overlay:
   * - Solo: brief “Creating match” while joining / opening play (no Leave).
   * - Multi:
   *   1) join RTT → Matching, no Leave
   *   2) queued waiting → Matching + Leave
   *   3) claiming / openingPlay bridge → Creating, no Leave (committed)
   * Keep `openingPlay` Creating on top even after the play modal mounts — modal open
   * batches with setOpeningPlay, so `!playModalOpen` would skip Creating entirely.
   * Clear when gameplay is ready (`markPortalGameplayReady`) or safety timeout.
   * Ignore stale queue rows once the open run for that template already exists.
   */
  // Stale *waiting* rows after open run: ignore. Claiming still means Creating.
  const queueWaitingWithoutOpenRun =
    queueWaiting &&
    !(
      primaryQueueEntry != null &&
      portal.openRunAssignments.some(
        (a) => a.templateId === primaryQueueEntry.templateId
      )
    );
  const matchOverlayOpen =
    openingPlay != null ||
    (!playModalOpen &&
      (queueWaitingWithoutOpenRun ||
        queueClaiming ||
        awaitingMatch != null ||
        joining === "multi" ||
        joining === "solo"));

  useEffect(() => {
    if (!openingPlay) return;
    if (getPortalAdPhase() === "playing") {
      setOpeningPlay(null);
      return;
    }
    const unsub = subscribePortalAdPhase((phase) => {
      if (phase === "playing") setOpeningPlay(null);
    });
    const t = window.setTimeout(() => setOpeningPlay(null), 10_000);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [openingPlay]);

  useEffect(() => {
    if (!playModalOpen) return;
    setTournamentPicker(null);
  }, [playModalOpen]);

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
   * 免费阶梯今日次数（不含金币桌）。
   * 必须以服务端为准：本地战绩 Math.max 会虚高，导致 UI 显示免费已满、
   * 却去拉广告，服务端仍返回 free_quota_available。
   * 配额尚未加载时再回退本地推算。
   */
  const soloSuccessQuota = portal.dailyPlayQuota?.soloSuccess;
  const soloSuccessEnabled = soloSuccessQuota?.enabled === true;
  const soloSuccessDailyCap = Math.max(
    0,
    Math.floor(soloSuccessQuota?.dailyCap ?? 0)
  );
  const soloSuccessUsedToday = Math.min(
    Math.max(0, Math.floor(soloSuccessQuota?.usedToday ?? 0)),
    soloSuccessDailyCap > 0 ? soloSuccessDailyCap : Number.POSITIVE_INFINITY
  );

  const soloLadderPlaysToday =
    portal.dailyPlayQuota?.solo.playsToday ?? clientSoloLadderPlays;
  const multiLadderPlaysToday =
    portal.dailyPlayQuota?.multi.playsToday ?? clientMultiLadderPlays;
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
        const server =
          portal.tournamentDailyPlayQuotas?.[templateId]?.playsToday;
        const plays =
          server ??
          countPortalModePlaysToday({
            gameHistory: portal.gameHistory,
            openAssignments: portal.openRunAssignments,
            mode,
            templateId,
            entryLadderOnly: true,
          });
        return plays >= max;
      }
      return mode === "solo" ? soloDailyExhausted : multiDailyExhausted;
    },
    [
      authed,
      multiDailyExhausted,
      multiMaxPlaysPerDay,
      portal.gameHistory,
      portal.openRunAssignments,
      portal.tournamentDailyPlayQuotas,
      quotaScope,
      soloDailyExhausted,
      soloMaxPlaysPerDay,
    ]
  );
  // Ad/ticket CTA follows server offer remaining only. Do not gate on client
  // playsToday (Math.max with history can over-count and gray the lobby while
  // ad remaining is still > 0). beginAdEntrySession enforces the hard ceiling.
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

  const soloOfferingsForBlock = filterLobbyOfferingsForMode(
    lobby?.offerings,
    "solo"
  );
  const multiOfferingsForBlock = filterLobbyOfferingsForMode(
    lobby?.offerings,
    "multi"
  );
  /** Multi-offering modes open a picker — home CTA stays clickable; gray only for single-ticket modes. */
  const soloHasMultipleOfferings = (soloOfferingsForBlock?.length ?? 0) > 1;
  const multiHasMultipleOfferings = (multiOfferingsForBlock?.length ?? 0) > 1;
  const modeHasPaidEntryOffering = (
    offerings: PortalLobbyOfferingView[] | undefined
  ) =>
    (offerings ?? []).some((o) => {
      const def = getTournamentDef(o.tournamentId);
      return def != null && !portalTournamentUsesPlayEntryLadder(def);
    });
  const modeLadderOfferingCount = (
    offerings: PortalLobbyOfferingView[] | undefined
  ) =>
    (offerings ?? []).filter((o) => {
      const def = getTournamentDef(o.tournamentId);
      return def != null && portalTournamentUsesPlayEntryLadder(def);
    }).length;
  /**
   * Home shows Play(n/m) / watch-ad(n/m) only when this mode has exactly one
   * free→ad ladder ticket (no picker). Otherwise just 「开始」.
   */
  const soloShowHomeLadderCta =
    (soloOfferingsForBlock?.length ?? 0) === 1 &&
    modeLadderOfferingCount(soloOfferingsForBlock) === 1;
  const multiShowHomeLadderCta =
    (multiOfferingsForBlock?.length ?? 0) === 1 &&
    modeLadderOfferingCount(multiOfferingsForBlock) === 1;
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

  // Only gray for ladder exhaustion when this game actually has ladder tickets.
  const soloHasLadderTickets = modeLadderOfferingCount(soloOfferingsForBlock) > 0;
  const multiHasLadderTickets = modeLadderOfferingCount(multiOfferingsForBlock) > 0;
  // No lobby tickets for this game → cannot start (do not fall back to a default template).
  const soloNoOfferings =
    (soloOfferingsForBlock?.length ?? 0) === 0 && soloOpenAssignment == null;
  const multiNoOfferings =
    (multiOfferingsForBlock?.length ?? 0) === 0 && multiOpenAssignment == null;
  const soloJoinBlocked =
    matchOverlayOpen ||
    (hasGlobalOpenRun && soloOpenAssignment == null) ||
    soloNoOfferings ||
    (!soloHasMultipleOfferings && soloHasLadderTickets && soloDailyLadderBlocked);
  const multiJoinBlocked =
    matchOverlayOpen ||
    (hasGlobalOpenRun && multiOpenAssignment == null) ||
    multiNoOfferings ||
    (!multiHasMultipleOfferings && multiHasLadderTickets && multiDailyLadderBlocked);

  const openAssignment = useCallback(
    (hit: OpenCasualRunAssignment) => {
      setPanelModal(null);
      // Drop stale queue watch — open run is already playable.
      setAwaitingMatch(null);
      setNote(null);
      const kind = inferPortalGameKindFromAssignment(hit);
      const matchType = getPortalTournamentDefinition(hit.templateId)?.matchType;
      setOpeningPlay(matchType === "multi_ranked" ? "multi" : "solo");
      openModal({
        name: portalPlayModalForGameType(kind),
        data: modalDataForOpenAssignment(hit),
      });
    },
    [openModal]
  );

  // Allow a fresh auto-resume when navigating to another game / lobby deep link.
  useEffect(() => {
    autoResumeOpenRunRef.current = false;
  }, [portal.gameType, lobby?.lobbyId]);

  useEffect(() => {
    if (autoResumeOpenRunRef.current) return;
    if (visible === 0 || !authed) return;

    if (playModalOpen) {
      autoResumeOpenRunRef.current = true;
      return;
    }

    // Open run is already ready — do not wait for match overlay / weekly close.
    // (Stale queue claiming + weekly modal used to block reload resume forever.)
    // Multi-game lobby (gameType null): resume newest active open run by assignment.
    const resume = portal.gameType
      ? pickActivePortalOpenAssignmentsForGameType(
          portal.openRunAssignments,
          portal.gameType
        )[0]
      : pickActivePortalOpenAssignment(portal.openRunAssignments) ??
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
      peakLeagueTier: (league?.peakLeagueTier as PortalTierId | undefined) ?? null,
      seasonId: league?.seasonId ?? null,
      seasonLevel: league?.seasonLevel ?? null,
      seasonWeek: league?.seasonWeek ?? null,
      seasonWeeks: league?.seasonWeeks ?? null,
      seasonXpIntoLevel: league?.seasonXpIntoLevel ?? null,
      seasonXpForLevel: league?.seasonXpForLevel ?? null,
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
    // Unfinished run first — show weekly close after the player returns to lobby.
    if (hasGlobalOpenRun || playModalOpen) return;
    const key = league.closeWeekKey ?? league.weekKey;
    if (weeklyCloseShownRef.current === key) return;
    weeklyCloseShownRef.current = key;
    setWeeklyCloseModalOpen(true);
  }, [
    visible,
    league?.unreadCloseResult,
    league?.closeWeekKey,
    league?.weekKey,
    hasGlobalOpenRun,
    playModalOpen,
  ]);

  useEffect(() => {
    if (visible === 0 || !league?.unreadSeasonMarks) return;
    if (hasGlobalOpenRun || playModalOpen || weeklyCloseModalOpen) return;
    if (league.unreadCloseResult) return;
    const key = league.unreadSeasonId ?? league.seasonId ?? "season";
    if (seasonMarksShownRef.current === key) return;
    seasonMarksShownRef.current = key;
    setSeasonMarksModalOpen(true);
  }, [
    visible,
    league?.unreadSeasonMarks,
    league?.unreadSeasonId,
    league?.seasonId,
    league?.unreadCloseResult,
    hasGlobalOpenRun,
    playModalOpen,
    weeklyCloseModalOpen,
  ]);

  useEffect(() => {
    const lv = league?.seasonLevel;
    if (lv == null) return;
    if (
      prevSeasonLevelRef.current != null &&
      lv > prevSeasonLevelRef.current
    ) {
      showNote(`Season level up · Lv ${lv}`);
    }
    prevSeasonLevelRef.current = lv;
  }, [league?.seasonLevel, showNote]);

  const openAccountBadges = useCallback(() => {
    setAccountFocusBadges(true);
    setAccountModalOpen(true);
  }, []);

  const dismissSeasonMarksModal = useCallback(async () => {
    setSeasonMarksModalOpen(false);
    const lobbyId = lobby?.lobbyId;
    if (!lobbyId) return;
    try {
      const { getPortalHttpClient } = await import("../service/usePortalManager");
      const http = getPortalHttpClient();
      if (!http) return;
      await http.mutation(portalTournamentFns.dismissPortalSeasonMarks, {
        lobbyId: lobbyId as never,
      });
      portal.refresh();
    } catch (e) {
      console.warn("[Portal] dismissPortalSeasonMarks", e);
    }
  }, [lobby?.lobbyId, portal]);

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
    if (entry && (entry.status === "waiting" || entry.status === "claiming")) {
      if (suppressAwaitRearmRef.current) return;
      // Table already open (or play modal up) — do not re-arm Matching overlay.
      if (
        playModalOpen ||
        portal.openRunAssignments.some((a) => a.templateId === entry.templateId)
      ) {
        sawQueueForAwaitRef.current = false;
        setAwaitingMatch(null);
        return;
      }
      const entryGameKind =
        (getTournamentDef(entry.templateId)?.gameType as
          | typeof portal.gameType
          | undefined) ??
        portal.gameType ??
        null;
      if (!entryGameKind) return;
      sawQueueForAwaitRef.current = true;
      // Idempotent: avoid new object every render → infinite update loop.
      setAwaitingMatch((prev) => {
        if (
          prev?.templateId === entry.templateId &&
          prev?.gameKind === entryGameKind
        ) {
          return prev;
        }
        return {
          templateId: entry.templateId,
          gameKind: entryGameKind,
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
        portalAssignmentMatchesAwaitWatch(a, watch)
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
    playModalOpen,
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
    if (!awaitingMatch) return;
    const hit = portal.openRunAssignments.find((a) =>
      portalAssignmentMatchesAwaitWatch(a, awaitingMatch)
    );
    if (!hit) return;
    setAwaitingMatch(null);
    setNote(null);
    openAssignment(hit);
  }, [awaitingMatch, portal.openRunAssignments, openAssignment]);

  const handleLeaveMatchQueue = useCallback(async () => {
    const canLeave =
      queueWaiting || queueClaiming || awaitingMatchRef.current != null;
    if (leavingMatch || !canLeave) return;
    setLeavingMatch(true);
    try {
      const tid =
        primaryQueueEntry?.templateId ?? awaitingMatchRef.current?.templateId;
      const res = await portal.leaveCasualMatchQueue(tid);
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

      // When a lobby is loaded, only join tickets from its offerings (via override /
      // handleJoin). Never fall back to a hard-coded default template — that skipped
      // the multi-ticket picker and could open the wrong game.
      const templateId =
        tournamentIdOverride ??
        (lobby
          ? null
          : portal.gameType
            ? portalTournamentIdForMode(portal.gameType, mode)
            : null);
      if (!templateId) {
        setNote(portalFlowMessage("noTournamentsForGame"));
        return "error";
      }

      const templateDef = getTournamentDef(templateId);
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

        // Paid coin tables may keep the mode card enabled; free-ladder templates
        // must still stop when free is gone and no ad/ticket remains.
        if (freeExhausted && !adAvailable && !ticketAvailable) {
          setNote(joinEntryErrorMessage("daily_play_limit_reached"));
          return "error";
        }

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
                // Client thought free was gone; server still has free slots —
                // join as free instead of surfacing free_quota_available.
                if (ad.error !== "free_quota_available") {
                  setNote(joinEntryErrorMessage(ad.error));
                  return "error";
                }
              } else {
                adEntry = true;
              }
            } else {
              adEntry = true;
            }
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
          if (outcome.ritualForcedSolo) {
            setNote(
              i18n.t("lobby.ritualForcedSolo", { ns: "portal.player" })
            );
          }
          setOpeningPlay(mode);
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
            setOpeningPlay(mode);
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
      const tournamentClosed = def != null && !isJoinableCasualTournament(def);
      // New joins blocked while another run/queue is active (resume uses home CTA).
      const globalBusy =
        hasGlobalOpenRun || queueWaiting || queueClaiming;

      // Paid coin/gem tables: picker shows wallet fee, not free/ad/ticket ladder.
      if (def && !portalTournamentUsesPlayEntryLadder(def)) {
        const wallet = portal.playerWallet;
        const entryKind = def.entry.kind;
        const amount =
          entryKind === "coins" || entryKind === "gems" ? def.entry.amount : 0;
        const canAfford =
          wallet == null
            ? true
            : entryKind === "gems"
              ? wallet.gems >= amount
              : wallet.coins >= amount;
        return {
          dailyExhausted: false,
          adEntryAvailable: false,
          ticketEntryAvailable: false,
          playsToday: 0,
          maxPlaysPerDay: 0,
          joining: isJoiningThis,
          siblingJoining,
          playable: !tournamentClosed && !globalBusy && canAfford,
          perTournamentQuota: false,
        };
      }

      const serverTournamentQuota =
        portal.tournamentDailyPlayQuotas?.[tournamentId] ?? null;
      const maxPlaysPerDay =
        quotaScope === "tournament" && serverTournamentQuota
          ? serverTournamentQuota.maxPlaysPerDay
          : mode === "solo"
            ? soloMaxPlaysPerDay
            : multiMaxPlaysPerDay;
      // Picker free-quota stub uses ladder-only counts (coin tables have their own fee UI).
      // Prefer server plays — client history can over-count vs beginAdEntrySession.
      const playsToday =
        quotaScope === "tournament" && serverTournamentQuota
          ? serverTournamentQuota.playsToday
          : mode === "solo"
            ? soloLadderPlaysToday
            : multiLadderPlaysToday;
      const dailyExhausted =
        quotaScope === "tournament"
          ? playsToday >= maxPlaysPerDay
          : mode === "solo"
            ? soloDailyExhausted
            : multiDailyExhausted;
      const adEntryAvailable =
        mode === "solo" ? soloAdEntryAvailable : multiAdEntryAvailable;
      const ticketEntryAvailable =
        mode === "solo" ? soloTicketEntryAvailable : multiTicketEntryAvailable;
      const ladderBlocked =
        dailyExhausted && !adEntryAvailable && !ticketEntryAvailable;
      return {
        dailyExhausted,
        adEntryAvailable,
        ticketEntryAvailable,
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
        playable: !tournamentClosed && !globalBusy && !ladderBlocked,
        perTournamentQuota: quotaScope === "tournament",
      };
    },
    [
      hasGlobalOpenRun,
      joining,
      joiningTournamentId,
      multiAdEntryAvailable,
      multiDailyExhausted,
      multiMaxPlaysPerDay,
      multiLadderPlaysToday,
      multiTicketEntryAvailable,
      portal.playerWallet,
      portal.ticketEntryOffer?.multi.priceTickets,
      portal.ticketEntryOffer?.multi.remaining,
      portal.ticketEntryOffer?.solo.priceTickets,
      portal.ticketEntryOffer?.solo.remaining,
      portal.tournamentDailyPlayQuotas,
      queueClaiming,
      queueWaiting,
      quotaScope,
      soloAdEntryAvailable,
      soloDailyExhausted,
      soloMaxPlaysPerDay,
      soloLadderPlaysToday,
      soloTicketEntryAvailable,
    ]
  );

  const soloOfferings = useMemo(
    () => filterLobbyOfferingsForMode(lobby?.offerings, "solo"),
    [lobby?.offerings]
  );
  const multiOfferings = useMemo(
    () => filterLobbyOfferingsForMode(lobby?.offerings, "multi"),
    [lobby?.offerings]
  );

  const handleJoin = useCallback(
    async (mode: "solo" | "multi") => {
      // 进行中对局优先继续，不打开多赛事选择
      const resume = mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
      if (resume) {
        await executeJoin(mode);
        return;
      }
      const modeOfferings = mode === "solo" ? soloOfferings : multiOfferings;
      // Always allow opening the picker when multiple tickets exist — per-row
      // playable state is enforced inside the modal, not by graying the home CTA.
      if (modeOfferings.length > 1) {
        setTournamentPicker({ mode, offerings: modeOfferings });
        return;
      }
      if (modeOfferings.length === 1) {
        await executeJoin(mode, modeOfferings[0]!.tournamentId);
        return;
      }
      setNote(portalFlowMessage("noTournamentsForGame"));
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
    accountFocusBadges,
    setAccountFocusBadges,
    openAccountBadges,
    weeklyCloseModalOpen,
    setWeeklyCloseModalOpen,
    seasonMarksModalOpen,
    setSeasonMarksModalOpen,
    dismissSeasonMarksModal,
    openAssignments,
    soloOpenAssignment,
    multiOpenAssignment,
    soloJoinBlocked,
    multiJoinBlocked,
    soloLadderPlaysToday,
    multiLadderPlaysToday,
    soloMaxPlaysPerDay,
    multiMaxPlaysPerDay,
    soloSuccessEnabled,
    soloSuccessUsedToday,
    soloSuccessDailyCap,
    soloDailyExhausted,
    multiDailyExhausted,
    soloAdEntryAvailable,
    multiAdEntryAvailable,
    soloAdEntryEnabled: portal.adEntryOffer?.solo.enabled === true,
    multiAdEntryEnabled: portal.adEntryOffer?.multi.enabled === true,
    soloAdEntryUsedToday: portal.adEntryOffer?.solo.usedToday ?? 0,
    multiAdEntryUsedToday: portal.adEntryOffer?.multi.usedToday ?? 0,
    soloAdEntryCap: portal.adEntryOffer?.solo.cap ?? 0,
    multiAdEntryCap: portal.adEntryOffer?.multi.cap ?? 0,
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
    soloShowHomeLadderCta,
    multiShowHomeLadderCta,
    tournamentPicker,
    quotaScope,
    entryStateForTournament,
    closeTournamentPicker: () => setTournamentPicker(null),
    selectTournamentFromPicker: (tournamentId: string) => {
      const mode = tournamentPicker?.mode;
      if (!mode) return;
      // Keep picker open on failures (e.g. insufficient_coins) so the user can pick again.
      // Multi queued: keep picker until live queue overlay; Leave queue can reopen it.
      void executeJoin(mode, tournamentId).then((result) => {
        if (result === "ok" && mode === "solo") setTournamentPicker(null);
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
