import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { usePartnerManager } from "host/service/PartnerManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getPortalHttpClient,
  portalPlayModalForGameType,
  PortalProvider,
  usePortal,
} from "component/lobby/portal/service/usePortalManager";
import { portalTournamentFns } from "component/lobby/portal/service/portalConvexFunctionRefs";
import TownZonePanel, { EntertainmentBonusView, TownZoneView } from "./TownZonePanel";
import VenuePickerModal from "./VenuePickerModal";
import TownHallView from "./TownHallView";
import TownSceneView from "./TownSceneView";
import { TownLeagueStatus } from "./TownLeagueStatus";
import { readLastGateSelection, writeLastGateSelection } from "./townLastGate";
import {
  buildGateSelection,
  DEFAULT_TOWN_SLUG,
  DEFAULT_VENUE_LEVEL,
  FALLBACK_BUILDINGS,
  filterVenueOptionsByGame,
  GateSelection,
  HallKind,
  listShowdownTournamentOptions,
  listTrialTournamentOptions,
  townLeagueScopeKey,
  VenueLevelMap,
  VenueTournamentOption,
  TownBuildingView,
} from "./types";
import {
  FALLBACK_PROSPERITY_MILESTONES,
  type ProsperityMilestonesView,
} from "./prosperityMilestones";
import TownShell, { TownShellTab } from "./TownShell";
import TownShopTab from "./TownShopTab";
import TownRewardTab from "./TownRewardTab";
import TownLeagueTab from "./TownLeagueTab";
import TownMeTab from "./TownMeTab";
import TownDistrictPanel from "./TownDistrictPanel";
import { districtCatalogEntry, districtErrorMessage } from "./districtSystem";
import { useTownViewMode } from "./useTownViewMode";
import { casualGameKindFromGameType } from "component/lobby/casual/service/casualOpenRunAssignment";
import "./town.css";
import "./townShell.css";

type D1ExpansionView = {
  minMayorLevel: number;
  minDevelopedZones: number;
  questId: string;
  feeCoins: number;
  questComplete?: boolean;
  unlocked?: boolean;
  canExpand: boolean;
} | null;

type TownTermView = {
  termId: string;
  termNumber: number;
  weekOf: number;
  weeksTotal: number;
};

type TownProgress = {
  townId?: string;
  playScopeKey?: string;
  townTitle?: string;
  townSlug?: string;
  coins: number;
  gems: number;
  tickets?: number;
  unlockedTierIds: string[];
  hallLevels: Record<string, number>;
  venueLevel?: VenueLevelMap;
  venueXp?: VenueLevelMap;
  buildings: TownBuildingView[];
  unlockedDistricts?: string[];
  currentDistrict?: string;
  mayorLevel?: number;
  prosperityScore?: number;
  prosperityMilestones?: ProsperityMilestonesView;
  zones?: TownZoneView[];
  collectablePassive?: number;
  showdownGamesThisWeek?: number;
  entertainmentBonus?: EntertainmentBonusView;
  hasEntertainmentZone?: boolean;
  coinTableBonus?: EntertainmentBonusView;
  hasCommercialZone?: boolean;
  developedCommercial?: number;
  d1Expansion?: D1ExpansionView;
  developedZonesD0?: number;
  developedZonesD1?: number;
  term?: TownTermView;
};

type TownMapInnerProps = PageProp & {
  onLeagueScopeKey: (key: string | null) => void;
};

const TownMapInner: React.FC<TownMapInnerProps> = ({ visible, onLeagueScopeKey }) => {
  const { openModal } = useModalManager();
  const { user, askAuth } = useUserManager();
  const { partnerPid, partnerResolveReady } = usePartnerManager();
  const {
    joinTournament,
    playerWallet,
    playerProfile,
    portalSessionReady,
    refresh,
    weeklyLeagueTierView,
    ticketEntryOffer,
  } = usePortal();
  const authed = isPlatformAuthed(user);
  const { mode: viewMode, mobile: isMobile, toggleMode, setPreference } = useTownViewMode();
  const townSlug = DEFAULT_TOWN_SLUG;

  const [townTitle, setTownTitle] = useState("Mayfield");

  const [toast, setToast] = useState<string | null>(null);
  const [gateLoading, setGateLoading] = useState(false);
  const [progress, setProgress] = useState<TownProgress | null>(null);
  const [gateSelection, setGateSelection] = useState<GateSelection | null>(null);
  const enteringRef = useRef(false);
  const [zonePanelOpen, setZonePanelOpen] = useState(false);
  const [soloPickerOpen, setSoloPickerOpen] = useState(false);
  const [showdownPickerOpen, setShowdownPickerOpen] = useState(false);
  const [pickerGameFilter, setPickerGameFilter] = useState<string | null>(null);
  const [shellTab, setShellTab] = useState<TownShellTab>("town");
  const [expandBusy, setExpandBusy] = useState(false);
  const [focusBusy, setFocusBusy] = useState(false);
  const [districtPanelId, setDistrictPanelId] = useState<string | null>(null);
  const [justExpanded, setJustExpanded] = useState(false);

  const loadProgress = useCallback(async () => {
    const http = getPortalHttpClient();
    if (!http || !portalSessionReady) return;
    try {
      await http.mutation(portalTournamentFns.townEnsureZones, { townSlug });
      const data = (await http.query(portalTournamentFns.townGetProgress, {
        townSlug,
      })) as TownProgress;
      if (data) {
        setProgress(data);
        if (data.townTitle) setTownTitle(data.townTitle);
      }
    } catch (e) {
      console.warn("[Town] progress fallback", e);
      setProgress({
        coins: playerWallet?.coins ?? 0,
        gems: playerWallet?.gems ?? 0,
        tickets: playerWallet?.tickets ?? 0,
        unlockedTierIds: ["solo_solitaire_free", "multi_solitaire_free"],
        hallLevels: { parlor: 1, saloon: 1 },
        venueLevel: DEFAULT_VENUE_LEVEL,
        buildings: FALLBACK_BUILDINGS,
      });
    }
  }, [portalSessionReady, playerWallet?.coins, playerWallet?.gems, playerWallet?.tickets, townSlug]);

  useEffect(() => {
    const http = getPortalHttpClient();
    if (!http || !partnerResolveReady) return;
    void http
      .mutation(portalTournamentFns.resolvePortalTown, {
        partnerId: partnerPid,
        townSlug,
      })
      .then((town) => {
        if (town && typeof town === "object" && "title" in town) {
          const branding = (town as { branding?: { displayTitle?: string }; title?: string }).branding;
          setTownTitle(branding?.displayTitle ?? (town as { title: string }).title);
        }
      })
      .catch(() => undefined);
  }, [partnerPid, partnerResolveReady, townSlug]);

  useEffect(() => {
    if (visible && portalSessionReady && shellTab === "town") {
      void loadProgress();
    }
  }, [visible, portalSessionReady, shellTab, loadProgress]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && portalSessionReady) {
        void loadProgress();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [portalSessionReady, loadProgress]);

  useEffect(() => {
    const townScope =
      progress?.playScopeKey ??
      (progress?.townId ? townLeagueScopeKey(progress.townId) : null);
    onLeagueScopeKey(townScope);
  }, [progress?.playScopeKey, progress?.townId, onLeagueScopeKey]);

  useEffect(() => {
    const townScope =
      progress?.playScopeKey ??
      (progress?.townId ? townLeagueScopeKey(progress.townId) : null);
    if (!playerWallet || !progress || !townScope) return;
    if (playerWallet.scopeKey && playerWallet.scopeKey !== townScope) return;
    if (!playerWallet.scopeKey) return;
    setProgress((p) =>
      p
        ? {
            ...p,
            coins: playerWallet.coins,
            gems: playerWallet.gems,
            tickets: playerWallet.tickets,
          }
        : p
    );
  }, [playerWallet?.coins, playerWallet?.gems, playerWallet?.tickets, playerWallet?.scopeKey, progress?.playScopeKey, progress?.townId]);

  const buildings = progress?.buildings ?? FALLBACK_BUILDINGS;
  const coins = progress?.coins ?? playerWallet?.coins ?? 0;
  const tickets = progress?.tickets ?? playerWallet?.tickets ?? 0;
  const showdownTicketPrice = ticketEntryOffer?.multi.priceTickets ?? 1;
  const gems = progress?.gems ?? playerWallet?.gems ?? 0;
  const unlockedDistricts = progress?.unlockedDistricts ?? ["D0"];
  const venueLevel = progress?.venueLevel ?? DEFAULT_VENUE_LEVEL;
  const prosperityMilestones = progress?.prosperityMilestones ?? FALLBACK_PROSPERITY_MILESTONES;
  const developedByZoneType = useMemo(
    () => ({ commercial: progress?.developedCommercial ?? 0 }),
    [progress?.developedCommercial]
  );

  const soloOptions = useMemo(
    () => listTrialTournamentOptions(buildings, unlockedDistricts, venueLevel.trial, developedByZoneType),
    [buildings, unlockedDistricts, venueLevel.trial, developedByZoneType]
  );

  const showdownOptions = useMemo(
    () => listShowdownTournamentOptions(buildings, unlockedDistricts, venueLevel.showdown, developedByZoneType),
    [buildings, unlockedDistricts, venueLevel.showdown, developedByZoneType]
  );

  const soloOpenCount = soloOptions.filter((o) => o.open).length;

  const showdownOpenCount = showdownOptions.filter((o) => o.open).length;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const pickDefaultTier = useCallback((building: TownBuildingView) => building.tiers[0], []);

  const closeVenuePickers = useCallback(() => {
    setSoloPickerOpen(false);
    setShowdownPickerOpen(false);
    setPickerGameFilter(null);
  }, []);

  const enterTable = useCallback(
    async (selection: GateSelection) => {
      if (enteringRef.current) return;
      enteringRef.current = true;
      closeVenuePickers();
      setGateSelection(selection);
      setGateLoading(true);

      const fail = (msg: string) => {
        enteringRef.current = false;
        setGateLoading(false);
        showToast(msg);
      };

      const http = getPortalHttpClient();
      if (!http || !portalSessionReady) {
        enteringRef.current = false;
        setGateLoading(false);
        if (!authed) {
          askAuth({});
          return;
        }
        showToast("Portal session not ready. Please wait or re-login.");
        return;
      }

      try {
        await http.mutation(portalTournamentFns.townEnsureZones, { townSlug });

        const validation = await http.query(portalTournamentFns.townValidateEntry, {
          townSlug,
          buildingId: selection.buildingId,
          tierId: selection.tierId,
          modeId: selection.ssaKey,
        });

        if (!validation?.ok) {
          fail(
            validation?.error === "INSUFFICIENT_FUNDS"
              ? "Not enough coins."
              : validation?.error === "TABLE_LOCKED" ||
                  validation?.error === "DISTRICT_LOCKED" ||
                  validation?.error === "TIER_LOCKED"
                ? validation?.message ?? "This table is locked."
                : validation?.error === "TOWN_UNAVAILABLE"
                  ? "Town is not ready yet. Try again."
                  : validation?.message ?? validation?.error ?? "Cannot enter"
          );
          return;
        }

        const entry = await http.mutation(portalTournamentFns.townRecordEntry, {
          townSlug,
          buildingId: selection.buildingId,
          tierId: selection.tierId,
          modeId: selection.ssaKey,
        });

        if (!entry?.ok) {
          fail(entry?.error ?? "Entry failed");
          return;
        }

        writeLastGateSelection(selection);

        const joinMode = selection.matchType === "solo_p75" ? "solo" : "multi";
        const leagueScopeKey =
          progress?.playScopeKey ??
          (progress?.townId ? townLeagueScopeKey(progress.townId) : undefined);
        if (!leagueScopeKey) {
          fail("Town is not ready yet. Try again.");
          return;
        }
        const ticketEntry = joinMode === "multi" && (selection.buyIn ?? 0) <= 0;
        const outcome = await joinTournament(joinMode, {
          tournamentId: selection.tournamentId,
          leagueScopeKey,
          ...(ticketEntry ? { ticketEntry: true } : {}),
        });
        if (outcome.kind === "queued") {
          fail("Table is filling. Try again in a moment.");
          return;
        }
        if (outcome.kind !== "ready" || !outcome.gameId) {
          const err = outcome.kind === "failed" ? outcome.error : "Could not start game.";
          fail(
            outcome.kind === "failed" && outcome.errorCode === "insufficient_tickets"
              ? "Not enough tickets."
              : outcome.kind === "failed" && outcome.errorCode === "ticket_entry_required"
                ? "This table needs 1 ticket."
                : err
          );
          return;
        }

        enteringRef.current = false;
        setGateLoading(false);
        setGateSelection(null);
        await refresh();
        await loadProgress();

        openModal({
          name: portalPlayModalForGameType(casualGameKindFromGameType(selection.gameType)),
          data: {
            casualTournamentId: outcome.templateId,
            casualMatchGameId: outcome.gameId,
            casualSessionKey: `${outcome.gameId}:${Date.now()}`,
            fromTown: true,
          },
        });
      } catch (e) {
        console.error("[Town] enter", e);
        fail("Something went wrong. Try again.");
      }
    },
    [
      closeVenuePickers,
      showToast,
      portalSessionReady,
      authed,
      askAuth,
      townSlug,
      joinTournament,
      refresh,
      loadProgress,
      openModal,
      progress?.playScopeKey,
      progress?.townId,
    ]
  );

  const handleVenuePick = useCallback(
    (option: VenueTournamentOption) => {
      void enterTable(buildGateSelection(option.venue, option.tier));
    },
    [enterTable]
  );

  const openPlay = useCallback(
    (kind: HallKind, gameType?: string) => {
      const options = kind === "trial" ? soloOptions : showdownOptions;
      const scoped = filterVenueOptionsByGame(options, gameType);
      // Match Lobby: only skip the picker when a single table exists and is open.
      // Locked tables stay visible so players can see unlock gates.
      if (scoped.length === 1 && scoped[0]!.open) {
        handleVenuePick(scoped[0]!);
        return;
      }
      if (scoped.length === 0) return;
      setPickerGameFilter(gameType ?? null);
      if (kind === "trial") setSoloPickerOpen(true);
      else setShowdownPickerOpen(true);
    },
    [soloOptions, showdownOptions, handleVenuePick]
  );

  const openHallPlay = useCallback((kind: HallKind) => {
    setPickerGameFilter(null);
    if (kind === "trial") setSoloPickerOpen(true);
    else setShowdownPickerOpen(true);
  }, []);

  const openGateForBuilding = useCallback(
    (building: TownBuildingView) => {
      if (building.id === "town_hall") {
        setZonePanelOpen(true);
        return;
      }
      if (building.hallKind === "showdown") {
        openHallPlay("showdown");
        return;
      }
      if (building.hallKind === "trial") {
        openHallPlay("trial");
        return;
      }
      if (!building.hallKind) {
        showToast(`${building.name} — coming soon`);
        return;
      }
      const defaultTier = pickDefaultTier(building);
      if (!defaultTier) {
        showToast("No tables available");
        return;
      }
      void enterTable(buildGateSelection(building, defaultTier));
    },
    [showToast, pickDefaultTier, openHallPlay, enterTable]
  );

  const handleBuildingClick = useCallback(
    (building: TownBuildingView) => {
      if (building.id === "telegraph") {
        setShellTab("league");
        return;
      }
      openGateForBuilding(building);
    },
    [openGateForBuilding]
  );

  const handleExpandDistrict = useCallback(async () => {
    const http = getPortalHttpClient();
    if (!http || !portalSessionReady) {
      showToast("Portal not ready");
      return;
    }
    setExpandBusy(true);
    try {
      const result = (await http.mutation(portalTournamentFns.townExpandDistrict, {
        districtId: "D1",
        townSlug,
      })) as { ok?: boolean; error?: string };
      if (result?.ok === false) {
        showToast(districtErrorMessage(result.error));
        return;
      }
      setDistrictPanelId("D1");
      setJustExpanded(true);
      showToast("Market Street is open");
      await loadProgress();
    } catch (e) {
      console.error("[Town] expand", e);
      showToast("Something went wrong");
    } finally {
      setExpandBusy(false);
    }
  }, [portalSessionReady, townSlug, loadProgress, showToast]);

  const handleSetCurrentDistrict = useCallback(
    async (districtId: string) => {
      const http = getPortalHttpClient();
      if (!http || !portalSessionReady) {
        showToast("Portal not ready");
        return;
      }
      setFocusBusy(true);
      try {
        const result = (await http.mutation(portalTournamentFns.townSetCurrentDistrict, {
          districtId,
          townSlug,
        })) as { ok?: boolean; error?: string };
        if (result?.ok === false) {
          showToast(districtErrorMessage(result.error));
          return;
        }
        const label = districtCatalogEntry(districtId)?.label ?? districtId;
        showToast(`Now in ${label}`);
        await loadProgress();
        setDistrictPanelId(null);
        setPreference("scene");
      } catch (e) {
        console.error("[Town] focus district", e);
        showToast("Something went wrong");
      } finally {
        setFocusBusy(false);
      }
    },
    [portalSessionReady, townSlug, loadProgress, showToast, setPreference]
  );

  const handleQuickPlay = useCallback(() => {
    const last = readLastGateSelection();
    if (last) {
      const building = buildings.find((b) => b.id === last.buildingId);
      if (building?.hallKind) {
        void enterTable(last);
        return;
      }
    }
    openHallPlay("trial");
  }, [buildings, openHallPlay, enterTable]);

  if (!visible) return null;

  const viewToggleLabel = viewMode === "hall" ? "Map" : "Town Hall";
  const hallMobile = viewMode === "hall" && isMobile;

  const currentDistrict = progress?.currentDistrict ?? "D0";
  const mayorLevel = progress?.mayorLevel ?? 1;
  const prosperityPct = Math.min(100, progress?.prosperityScore ?? 0);
  const avatarUrl = avatarPhotoUrlFromUser(user);
  const avatarInitial = (
    playerProfile?.resolvedDisplayName ??
    playerProfile?.displayName ??
    "M"
  )
    .trim()
    .charAt(0)
    .toUpperCase() || "M";
  const termLine =
    viewMode === "scene" && progress?.term
      ? `Term ${progress.term.termNumber} · Week ${progress.term.weekOf}`
      : null;

  const hallContent = (
    <div className={`town-map town-map--${viewMode}${hallMobile ? " town-map--hall-mobile" : ""}`}>
      <div className="town-map__body">
        {viewMode === "hall" ? (
          <TownHallView
            buildings={buildings}
            isMobile={isMobile}
            mayorLevel={mayorLevel}
            prosperityPct={prosperityPct}
            onBuildingClick={handleBuildingClick}
            onOpenMayorOffice={() => setZonePanelOpen(true)}
            onOpenDistrict={(id) => {
              setJustExpanded(false);
              setDistrictPanelId(id);
            }}
            onOpenSoloPicker={() => openHallPlay("trial")}
            onOpenShowdownPicker={() => openHallPlay("showdown")}
            soloOpenCount={soloOpenCount}
            showdownOpenCount={showdownOpenCount}
            venueLevel={venueLevel}
            currentDistrict={currentDistrict}
            unlockedDistricts={unlockedDistricts}
            coins={coins}
            developedZonesD0={progress?.developedZonesD0 ?? 0}
            developedZonesD1={progress?.developedZonesD1 ?? 0}
            d1Expansion={progress?.d1Expansion ?? null}
            collectablePassive={progress?.collectablePassive ?? 0}
          />
        ) : (
          <div className="town-map__canvas">
            <TownSceneView
              buildings={buildings}
              zones={progress?.zones}
              unlockedDistricts={unlockedDistricts}
              currentDistrict={currentDistrict}
              activeBuildingId={gateLoading ? gateSelection?.buildingId ?? null : null}
              onBuildingClick={handleBuildingClick}
              onZoneClick={() => setDistrictPanelId(currentDistrict)}
            />
          </div>
        )}
      </div>

      {viewMode === "scene" ? (
        <footer className="town-hud-bottom">
          <span className="town-quest-pill">📋 Play 1 game at the Trial Hall</span>
          <TownLeagueStatus
            league={weeklyLeagueTierView}
            authed={authed}
            onOpenLeague={() => setShellTab("league")}
          />
          <button type="button" className="town-btn-primary town-hud-bottom__play" onClick={handleQuickPlay}>
            ▶ Play
          </button>
        </footer>
      ) : null}

      {soloPickerOpen && (
        <VenuePickerModal
          kind="trial"
          options={soloOptions}
          balance={coins}
          gameFilter={pickerGameFilter}
          onClose={closeVenuePickers}
          onSelect={handleVenuePick}
          onLockedDistrict={(id) => {
            closeVenuePickers();
            setJustExpanded(false);
            setDistrictPanelId(id);
          }}
        />
      )}

      {showdownPickerOpen && (
        <VenuePickerModal
          kind="showdown"
          options={showdownOptions}
          balance={coins}
          ticketBalance={tickets}
          ticketEntryPrice={showdownTicketPrice}
          gameFilter={pickerGameFilter}
          onClose={closeVenuePickers}
          onSelect={handleVenuePick}
          onLockedDistrict={(id) => {
            closeVenuePickers();
            setJustExpanded(false);
            setDistrictPanelId(id);
          }}
        />
      )}

      {gateLoading ? (
        <div className="town-gate-overlay" aria-busy="true" aria-live="polite">
          <p className="town-showdown-picker__hint">Entering…</p>
        </div>
      ) : null}

      {districtPanelId ? (
        <TownDistrictPanel
          districtId={districtPanelId}
          zones={progress?.zones ?? []}
          coins={coins}
          mayorLevel={mayorLevel}
          developedZonesD0={progress?.developedZonesD0 ?? 0}
          developedZonesD1={progress?.developedZonesD1 ?? 0}
          d1Expansion={progress?.d1Expansion ?? null}
          currentDistrict={currentDistrict}
          unlockedDistricts={unlockedDistricts}
          portalSessionReady={portalSessionReady}
          townSlug={townSlug}
          expandBusy={expandBusy}
          focusBusy={focusBusy}
          justExpanded={justExpanded && districtPanelId === "D1"}
          onClose={() => {
            setDistrictPanelId(null);
            setJustExpanded(false);
          }}
          onUpdated={() => void loadProgress()}
          onToast={showToast}
          onGoHere={(id) => void handleSetCurrentDistrict(id)}
          onExpand={() => void handleExpandDistrict()}
          onOpenDistrict={(id) => setDistrictPanelId(id)}
          collectablePassive={progress?.collectablePassive ?? 0}
        />
      ) : null}

      {zonePanelOpen && (
        <TownZonePanel
          prosperityScore={progress?.prosperityScore ?? 0}
          prosperityMilestones={prosperityMilestones}
          entertainmentBonus={progress?.entertainmentBonus}
          hasEntertainmentZone={progress?.hasEntertainmentZone}
          coinTableBonus={progress?.coinTableBonus}
          hasCommercialZone={progress?.hasCommercialZone}
          onClose={() => setZonePanelOpen(false)}
          onOpenDistricts={() => {
            setZonePanelOpen(false);
            setJustExpanded(false);
            setDistrictPanelId(currentDistrict);
          }}
        />
      )}
    </div>
  );

  return (
    <TownShell
      active={shellTab}
      onChange={setShellTab}
      collectablePassive={progress?.collectablePassive ?? 0}
      avatarUrl={avatarUrl}
      avatarInitial={avatarInitial}
      onAvatarClick={() => setShellTab("me")}
      chromeWallet={
        <>
          <span className="town-badge town-badge--wallet">🪙 {coins.toLocaleString()}</span>
          <span className="town-badge town-badge--wallet" aria-label={`${tickets.toLocaleString()} tickets`}>
            🎫 {tickets.toLocaleString()}
          </span>
          {(progress?.collectablePassive ?? 0) > 0 ? (
            <button
              type="button"
              className="town-badge town-badge--passive"
              onClick={() => {
                setJustExpanded(false);
                setDistrictPanelId(currentDistrict);
              }}
            >
              +{progress?.collectablePassive}
            </button>
          ) : null}
        </>
      }
      chromeEnd={
        <>
          {termLine ? <span className="town-badge town-badge--term">{termLine}</span> : null}
          <button
            type="button"
            className="town-badge town-badge--action town-badge--icon"
            onClick={toggleMode}
            title={`Switch to ${viewToggleLabel} view`}
            aria-label={`Switch to ${viewToggleLabel} view`}
          >
            {viewMode === "hall" ? "🗺" : "🏛"}
          </button>
          {!authed ? (
            <button type="button" className="town-badge town-badge--action" onClick={() => askAuth({})}>
              登录
            </button>
          ) : null}
        </>
      }
    >
      {shellTab === "town" ? hallContent : null}
      {shellTab === "shop" ? <TownShopTab onToast={showToast} /> : null}
      {shellTab === "reward" ? <TownRewardTab onToast={showToast} /> : null}
      {shellTab === "league" ? (
        <TownLeagueTab leagueScopeKey={progress?.playScopeKey ?? null} />
      ) : null}
      {shellTab === "me" ? (
        <TownMeTab
          seasonLevel={weeklyLeagueTierView?.seasonLevel ?? 1}
          coins={coins}
          gems={gems}
          prosperityScore={progress?.prosperityScore ?? 0}
          venueLevel={venueLevel}
          unlockedDistricts={unlockedDistricts}
          currentDistrict={currentDistrict}
          prosperityMilestones={prosperityMilestones}
          entertainmentBonus={progress?.entertainmentBonus}
          coinTableBonus={progress?.coinTableBonus}
        />
      ) : null}

      {toast && <div className="town-toast">{toast}</div>}
    </TownShell>
  );
};

const TownMapPage: React.FC<PageProp> = (props) => {
  const [leagueScopeKey, setLeagueScopeKey] = useState<string | null>(null);

  return (
    <PortalProvider gameType="solitaire" leagueScopeKey={leagueScopeKey}>
      <TownMapInner {...props} onLeagueScopeKey={setLeagueScopeKey} />
    </PortalProvider>
  );
};

function avatarPhotoUrlFromUser(u: { data?: Record<string, unknown> | null; picture?: string; imageUrl?: string; avatar?: string } | null): string | undefined {
  if (!u) return undefined;
  const d = u.data ?? null;
  const raw = d?.["imageUrl"] ?? d?.["avatar"] ?? d?.["picture"] ?? d?.["photoUrl"];
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  for (const v of [u.picture, u.imageUrl, u.avatar]) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export default TownMapPage;
