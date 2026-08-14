import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { usePartnerManager } from "host/service/PartnerManager";
import { useUserManager } from "host/service/UserManager";
import { portalLobbyPath } from "host/util/portalPathParse";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import {
  getPortalHttpClient,
  portalPlayModalForGameType,
  PortalProvider,
  PORTAL_CONVEX_URL,
  usePortal,
} from "component/lobby/portal/service/usePortalManager";
import { portalTournamentFns } from "component/lobby/portal/service/portalConvexFunctionRefs";
import type { PortalLobbyView } from "component/lobby/portal/PortalLobbyContext";
import TownZonePanel, { EntertainmentBonusView, TownZoneView } from "./TownZonePanel";
import GateCard from "./GateCard";
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
  GateSelection,
  listShowdownTournamentOptions,
  listTrialTournamentOptions,
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
import { districtLabel } from "./mayfieldSceneLayout";
import { useTownViewMode } from "./useTownViewMode";
import { casualGameKindFromGameType } from "component/lobby/casual/service/casualOpenRunAssignment";
import "./town.css";
import "./townShell.css";

type D1ExpansionView = {
  minMayorLevel: number;
  minDevelopedZones: number;
  questId: string;
  feeCoins: number;
  canExpand: boolean;
} | null;

type TownTermView = {
  termId: string;
  termNumber: number;
  weekOf: number;
  weeksTotal: number;
};

type TownProgress = {
  townTitle?: string;
  townSlug?: string;
  coins: number;
  gems: number;
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
  d1Expansion?: D1ExpansionView;
  term?: TownTermView;
};

type TownMapInnerProps = PageProp & {
  leagueHref: string;
};

const TownMapInner: React.FC<TownMapInnerProps> = ({ visible, leagueHref }) => {
  const { openModal } = useModalManager();
  const { user, askAuth } = useUserManager();
  const { partnerPid, partnerResolveReady } = usePartnerManager();
  const { joinTournament, playerWallet, portalSessionReady, refresh, weeklyLeagueTierView } =
    usePortal();
  const authed = isPlatformAuthed(user);
  const { mode: viewMode, mobile: isMobile, toggleMode } = useTownViewMode();
  const townSlug = DEFAULT_TOWN_SLUG;

  const [townTitle, setTownTitle] = useState("Mayfield");

  const [toast, setToast] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TownProgress | null>(null);
  const [gateSelection, setGateSelection] = useState<GateSelection | null>(null);
  const [zonePanelOpen, setZonePanelOpen] = useState(false);
  const [soloPickerOpen, setSoloPickerOpen] = useState(false);
  const [showdownPickerOpen, setShowdownPickerOpen] = useState(false);
  const [shellTab, setShellTab] = useState<TownShellTab>("hall");

  const loadProgress = useCallback(async () => {
    const http = getPortalHttpClient();
    if (!http || !portalSessionReady) return;
    try {
      const data = (await http.query(portalTournamentFns.townGetProgress, {
        townSlug,
      })) as TownProgress;
      if (data) {
        setProgress(data);
        if (data.townTitle) setTownTitle(data.townTitle);
        if (!data.zones?.length) {
          await http.mutation(portalTournamentFns.townEnsureZones, { townSlug });
          const refreshed = (await http.query(portalTournamentFns.townGetProgress, {
            townSlug,
          })) as TownProgress;
          if (refreshed) setProgress(refreshed);
        }
      }
    } catch (e) {
      console.warn("[Town] progress fallback", e);
      setProgress({
        coins: playerWallet?.coins ?? 0,
        gems: playerWallet?.gems ?? 0,
        unlockedTierIds: ["solo_solitaire_free", "multi_solitaire_free"],
        hallLevels: { parlor: 1, saloon: 1 },
        venueLevel: DEFAULT_VENUE_LEVEL,
        buildings: FALLBACK_BUILDINGS,
      });
    }
  }, [portalSessionReady, playerWallet?.coins, playerWallet?.gems, townSlug]);

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
    if (visible && portalSessionReady) {
      void loadProgress();
    }
  }, [visible, portalSessionReady, loadProgress]);

  useEffect(() => {
    if (playerWallet && progress) {
      setProgress((p) =>
        p
          ? {
              ...p,
              coins: playerWallet.coins,
              gems: playerWallet.gems,
            }
          : p
      );
    }
  }, [playerWallet?.coins, playerWallet?.gems]);

  const buildings = progress?.buildings ?? FALLBACK_BUILDINGS;
  const coins = progress?.coins ?? playerWallet?.coins ?? 0;
  const gems = progress?.gems ?? playerWallet?.gems ?? 0;
  const unlockedDistricts = progress?.unlockedDistricts ?? ["D0"];
  const venueLevel = progress?.venueLevel ?? DEFAULT_VENUE_LEVEL;
  const prosperityMilestones = progress?.prosperityMilestones ?? FALLBACK_PROSPERITY_MILESTONES;

  const soloOptions = useMemo(
    () => listTrialTournamentOptions(buildings, unlockedDistricts, venueLevel.trial),
    [buildings, unlockedDistricts, venueLevel.trial]
  );

  const showdownOptions = useMemo(
    () => listShowdownTournamentOptions(buildings, unlockedDistricts, venueLevel.showdown),
    [buildings, unlockedDistricts, venueLevel.showdown]
  );

  const soloOpenCount = soloOptions.filter((o) => o.open).length;

  const showdownOpenCount = showdownOptions.filter((o) => o.open).length;

  const activeBuilding = useMemo(
    () => buildings.find((b) => b.id === gateSelection?.buildingId),
    [buildings, gateSelection?.buildingId]
  );

  const quickPlayLabel = useMemo(() => {
    const last = readLastGateSelection();
    if (last?.buildingName) return last.buildingName;
    return "Solo Challenge";
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const pickDefaultTier = useCallback((building: TownBuildingView) => building.tiers[0], []);

  const openGateForBuilding = useCallback(
    (building: TownBuildingView) => {
      if (building.id === "town_hall") {
        setZonePanelOpen(true);
        return;
      }
      if (building.hallKind === "showdown") {
        setShowdownPickerOpen(true);
        return;
      }
      if (building.hallKind === "trial") {
        setSoloPickerOpen(true);
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
      setGateSelection(buildGateSelection(building, defaultTier));
      setGateError(null);
      setGateOpen(true);
    },
    [showToast, pickDefaultTier]
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

  const handleVenuePick = useCallback((option: VenueTournamentOption) => {
    setSoloPickerOpen(false);
    setShowdownPickerOpen(false);
    setGateSelection(buildGateSelection(option.venue, option.tier));
    setGateError(null);
    setGateOpen(true);
  }, []);

  const handleQuickPlay = useCallback(() => {
    const last = readLastGateSelection();
    if (last) {
      const building = buildings.find((b) => b.id === last.buildingId);
      if (building?.hallKind) {
        setGateSelection(last);
        setGateError(null);
        setGateOpen(true);
        return;
      }
    }
    const soloVenue = buildings.find((b) => b.id === "parlor");
    if (soloVenue) setSoloPickerOpen(true);
  }, [buildings]);

  const closeGate = useCallback(() => {
    setGateOpen(false);
    setGateSelection(null);
    setGateError(null);
  }, []);

  const updateTier = useCallback(
    (tierId: string) => {
      if (!gateSelection || !activeBuilding) return;
      const tier = activeBuilding.tiers.find((t) => t.id === tierId);
      if (!tier) return;
      setGateSelection(buildGateSelection(activeBuilding, tier));
    },
    [gateSelection, activeBuilding]
  );

  const handleEnter = useCallback(async () => {
    if (!gateSelection) return;

    const http = getPortalHttpClient();
    if (!http || !portalSessionReady) {
      if (!authed) {
        askAuth({});
        return;
      }
      setGateError("Portal session not ready. Please wait or re-login.");
      return;
    }

    setGateLoading(true);
    setGateError(null);

    try {
      const validation = await http.query(portalTournamentFns.townValidateEntry, {
        townSlug,
        buildingId: gateSelection.buildingId,
        tierId: gateSelection.tierId,
      });

      if (!validation?.ok) {
        setGateError(
          validation?.error === "INSUFFICIENT_FUNDS"
            ? "Not enough coins."
            : validation?.error === "TABLE_LOCKED" || validation?.error === "DISTRICT_LOCKED"
              ? validation?.message ?? "This table is locked."
              : validation?.error === "TIER_LOCKED"
              ? validation?.message ?? "This table is locked."
              : validation?.message ?? validation?.error ?? "Cannot enter"
        );
        setGateLoading(false);
        return;
      }

      const entry = await http.mutation(portalTournamentFns.townRecordEntry, {
        townSlug,
        buildingId: gateSelection.buildingId,
        tierId: gateSelection.tierId,
      });

      if (!entry?.ok) {
        setGateError(entry?.error ?? "Entry failed");
        setGateLoading(false);
        return;
      }

      writeLastGateSelection(gateSelection);

      const joinMode = gateSelection.matchType === "solo_p75" ? "solo" : "multi";
      const outcome = await joinTournament(joinMode, {
        tournamentId: gateSelection.tournamentId,
        townEntryToken: entry.entryToken,
      });
      if (outcome.kind !== "ready" || !outcome.gameId) {
        setGateError(outcome.kind === "failed" ? outcome.error : "Could not start game.");
        setGateLoading(false);
        return;
      }

      closeGate();
      setGateLoading(false);
      await refresh();
      await loadProgress();

      openModal({
        name: portalPlayModalForGameType(casualGameKindFromGameType(gateSelection.gameType)),
        data: {
          casualTournamentId: outcome.templateId,
          casualMatchGameId: outcome.gameId,
          casualSessionKey: `${outcome.gameId}:${Date.now()}`,
          fromTown: true,
        },
      });
    } catch (e) {
      console.error("[Town] enter", e);
      setGateError("Something went wrong. Try again.");
      setGateLoading(false);
    }
  }, [
    gateSelection,
    portalSessionReady,
    authed,
    askAuth,
    closeGate,
    joinTournament,
    refresh,
    loadProgress,
    openModal,
  ]);

  if (!visible) return null;

  const viewToggleLabel = viewMode === "hall" ? "Map" : "Town Hall";
  const hallMobile = viewMode === "hall" && isMobile;
  const showWalletInHud = viewMode === "scene" || hallMobile;

  const currentDistrict = progress?.currentDistrict ?? "D0";
  const termLine = progress?.term
    ? `Term ${progress.term.termNumber} · Week ${progress.term.weekOf}`
    : null;

  const hallContent = (
    <div className={`town-map town-map--${viewMode}${hallMobile ? " town-map--hall-mobile" : ""}`}>
      <header className="town-hud-top">
        <div className="town-hud-top__start">
          {showWalletInHud ? (
            <>
              <span className="town-badge town-badge--wallet">🪙 {coins.toLocaleString()}</span>
              <span className="town-badge town-badge--wallet">💎 {gems.toLocaleString()}</span>
            </>
          ) : (
            <span className="town-badge town-badge--compact">
              Mayfield · {districtLabel(currentDistrict)}
            </span>
          )}
          {termLine ? <span className="town-badge town-badge--term">{termLine}</span> : null}
          {(progress?.collectablePassive ?? 0) > 0 ? (
            <button
              type="button"
              className="town-badge town-badge--passive"
              onClick={() => setZonePanelOpen(true)}
            >
              +{progress?.collectablePassive}
            </button>
          ) : null}
        </div>
        <div className="town-hud-top__end">
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
          <span
            className="town-badge town-badge--compact town-badge--status"
            title={portalSessionReady ? "Ready" : "Connecting…"}
            aria-label={portalSessionReady ? "Portal ready" : "Portal connecting"}
          >
            {portalSessionReady ? "✓" : "…"}
          </span>
        </div>
      </header>

      <div className="town-map__body">
        {viewMode === "hall" ? (
          <TownHallView
            buildings={buildings}
            coins={coins}
            gems={gems}
            mayorLevel={progress?.mayorLevel ?? 1}
            prosperityScore={progress?.prosperityScore ?? 0}
            collectablePassive={progress?.collectablePassive ?? 0}
            isMobile={isMobile}
            league={weeklyLeagueTierView}
            leagueHref={leagueHref}
            authed={authed}
            onBuildingClick={handleBuildingClick}
            onOpenMayorOffice={() => setZonePanelOpen(true)}
            onOpenSoloPicker={() => setSoloPickerOpen(true)}
            onOpenShowdownPicker={() => setShowdownPickerOpen(true)}
            soloOpenCount={soloOpenCount}
            showdownOpenCount={showdownOpenCount}
            venueLevel={venueLevel}
          />
        ) : (
          <div className="town-map__canvas">
            <TownSceneView
              buildings={buildings}
              zones={progress?.zones}
              unlockedDistricts={unlockedDistricts}
              currentDistrict={currentDistrict}
              activeBuildingId={gateOpen ? gateSelection?.buildingId ?? null : null}
              onBuildingClick={handleBuildingClick}
              onZoneClick={() => setZonePanelOpen(true)}
            />
          </div>
        )}
      </div>

      {viewMode === "scene" ? (
        <footer className="town-hud-bottom">
          <span className="town-quest-pill">📋 Play 1 game at the Trial Hall</span>
          <TownLeagueStatus
            league={weeklyLeagueTierView}
            leagueHref={leagueHref}
            authed={authed}
          />
          <button type="button" className="town-btn-primary town-hud-bottom__play" onClick={handleQuickPlay}>
            ▶ Play
          </button>
        </footer>
      ) : (
        <footer
          className={`town-hud-bottom town-hud-bottom--hall${hallMobile ? "" : " town-hud-bottom--hall-desktop"}`}
        >
          <button type="button" className="town-btn-primary town-hud-bottom__quick" onClick={handleQuickPlay}>
            ▶ Play {quickPlayLabel}
          </button>
        </footer>
      )}

      {soloPickerOpen && (
        <VenuePickerModal
          kind="trial"
          options={soloOptions}
          balance={coins}
          onClose={() => setSoloPickerOpen(false)}
          onSelect={handleVenuePick}
        />
      )}

      {showdownPickerOpen && (
        <VenuePickerModal
          kind="showdown"
          options={showdownOptions}
          balance={coins}
          onClose={() => setShowdownPickerOpen(false)}
          onSelect={handleVenuePick}
        />
      )}

      {gateOpen && gateSelection && activeBuilding && (
        <GateCard
          selection={gateSelection}
          balance={coins}
          loading={gateLoading}
          error={gateError}
          portalReady={activeBuilding.portalReady !== false}
          onClose={closeGate}
          onEnter={handleEnter}
          onTierChange={updateTier}
          tiers={activeBuilding.tiers}
        />
      )}

      {zonePanelOpen && (
        <TownZonePanel
          zones={progress?.zones ?? []}
          coins={coins}
          mayorLevel={progress?.mayorLevel ?? 1}
          prosperityScore={progress?.prosperityScore ?? 0}
          prosperityMilestones={prosperityMilestones}
          collectablePassive={progress?.collectablePassive ?? 0}
          entertainmentBonus={progress?.entertainmentBonus}
          hasEntertainmentZone={progress?.hasEntertainmentZone}
          d1Expansion={progress?.d1Expansion ?? null}
          portalSessionReady={portalSessionReady}
          townSlug={townSlug}
          onClose={() => setZonePanelOpen(false)}
          onUpdated={() => void loadProgress()}
          onToast={showToast}
        />
      )}
    </div>
  );

  return (
    <TownShell
      active={shellTab}
      onChange={setShellTab}
      collectablePassive={progress?.collectablePassive ?? 0}
    >
      {shellTab === "hall" ? hallContent : null}
      {shellTab === "shop" ? <TownShopTab onToast={showToast} /> : null}
      {shellTab === "reward" ? <TownRewardTab onToast={showToast} /> : null}
      {shellTab === "league" ? <TownLeagueTab /> : null}
      {shellTab === "me" ? (
        <TownMeTab
          mayorLevel={progress?.mayorLevel ?? 1}
          prosperityScore={progress?.prosperityScore ?? 0}
          venueLevel={venueLevel}
          unlockedDistricts={unlockedDistricts}
          prosperityMilestones={prosperityMilestones}
          entertainmentBonus={progress?.entertainmentBonus}
        />
      ) : null}

      {toast && <div className="town-toast">{toast}</div>}
    </TownShell>
  );
};

const TownMapPage: React.FC<PageProp> = (props) => {
  const {
    partner,
    partnerPid,
    partnerResolveReady,
    isFirstPartyPortal,
    portalPartnerSlug,
  } = usePartnerManager();
  const [lobby, setLobby] = useState<PortalLobbyView | null>(null);

  useEffect(() => {
    if (!partnerResolveReady) return;
    if (!isFirstPartyPortal && !portalPartnerSlug) {
      setLobby(null);
      return;
    }

    let cancelled = false;
    void townLobbyClient()
      .mutation(portalTournamentFns.resolvePortalLobby, {
        partnerId: isFirstPartyPortal ? 0 : partnerPid,
      })
      .then((row) => {
        if (cancelled) return;
        setLobby(row ? (row as PortalLobbyView) : null);
      })
      .catch(() => {
        if (!cancelled) setLobby(null);
      });

    return () => {
      cancelled = true;
    };
  }, [partnerResolveReady, isFirstPartyPortal, portalPartnerSlug, partnerPid, partner]);

  const leagueHref = useMemo(
    () => portalLobbyPath(portalPartnerSlug, lobby?.slug),
    [portalPartnerSlug, lobby?.slug]
  );

  return (
    <PortalProvider
      gameType="solitaire"
      lobbyId={lobby?.lobbyId ?? null}
      lobbySlug={lobby?.slug ?? null}
    >
      <TownMapInner {...props} leagueHref={leagueHref} />
    </PortalProvider>
  );
};

let townLobbyHttp: ConvexHttpClient | null = null;

function townLobbyClient(): ConvexHttpClient {
  if (!townLobbyHttp) {
    townLobbyHttp = new ConvexHttpClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(townLobbyHttp);
  }
  return townLobbyHttp;
}

export default TownMapPage;
