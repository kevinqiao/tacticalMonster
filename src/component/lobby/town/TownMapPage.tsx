import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPortalHttpClient,
  portalPlayModalForGameType,
  PortalProvider,
  usePortal,
} from "component/lobby/portal/service/usePortalManager";
import { portalTournamentFns } from "component/lobby/portal/service/portalConvexFunctionRefs";
import GateCard from "./GateCard";
import {
  BUILDING_ICONS,
  FALLBACK_BUILDINGS,
  GateSelection,
  TownBuildingView,
} from "./types";
import "./town.css";

type TownProgress = {
  coins: number;
  gems: number;
  unlockedTierIds: string[];
  buildings: TownBuildingView[];
};

const TownMapInner: React.FC<PageProp> = ({ visible }) => {
  const { openModal } = useModalManager();
  const { user, askAuth } = useUserManager();
  const { joinTournament, playerWallet, portalSessionReady, refresh } = usePortal();
  const authed = isPlatformAuthed(user);

  const [toast, setToast] = useState<string | null>(null);
  const [approaching, setApproaching] = useState<string | null>(null);
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 65 });
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TownProgress | null>(null);
  const [gateSelection, setGateSelection] = useState<GateSelection | null>(null);

  const loadProgress = useCallback(async () => {
    const http = getPortalHttpClient();
    if (!http || !portalSessionReady) return;
    try {
      const data = (await http.query(portalTournamentFns.townGetProgress, {})) as TownProgress;
      if (data) setProgress(data);
    } catch (e) {
      console.warn("[Town] progress fallback", e);
      setProgress({
        coins: playerWallet?.coins ?? 0,
        gems: playerWallet?.gems ?? 0,
        unlockedTierIds: ["parlor_t1", "saloon_t1"],
        buildings: FALLBACK_BUILDINGS,
      });
    }
  }, [portalSessionReady, playerWallet?.coins, playerWallet?.gems]);

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
  const unlockedTierIds = progress?.unlockedTierIds ?? ["parlor_t1"];

  const activeBuilding = useMemo(
    () => buildings.find((b) => b.id === gateSelection?.buildingId),
    [buildings, gateSelection?.buildingId]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const openGateForBuilding = useCallback(
    (building: TownBuildingView) => {
      if (!building.ssaKey) {
        showToast(`${building.name} — coming in M2`);
        return;
      }
      const defaultMode = building.modes[0]?.id ?? "standard";
      const defaultTier =
        building.tiers.find((t) => unlockedTierIds.includes(t.id)) ?? building.tiers[0];
      if (!defaultTier) {
        showToast("No tiers available");
        return;
      }
      setGateSelection({
        buildingId: building.id,
        buildingName: building.name,
        ssaKey: building.ssaKey,
        modeId: defaultMode,
        tierId: defaultTier.id,
        buyIn: defaultTier.buyIn,
      });
      setGateError(null);
      setGateOpen(true);
    },
    [showToast, unlockedTierIds]
  );

  const handleBuildingClick = useCallback(
    (building: TownBuildingView) => {
      if (approaching) return;
      setApproaching(building.id);
      setPlayerPos({ x: building.position.x, y: building.position.y + 8 });
      window.setTimeout(() => {
        setApproaching(null);
        openGateForBuilding(building);
      }, 650);
    },
    [approaching, openGateForBuilding]
  );

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
      setGateSelection({ ...gateSelection, tierId, buyIn: tier.buyIn });
    },
    [gateSelection, activeBuilding]
  );

  const updateMode = useCallback(
    (modeId: string) => {
      if (!gateSelection) return;
      setGateSelection({ ...gateSelection, modeId });
    },
    [gateSelection]
  );

  const handleEnter = useCallback(async () => {
    if (!gateSelection || gateSelection.ssaKey !== "solitaire") {
      setGateError("Poker Saloon is not ready yet.");
      return;
    }
    if (gateSelection.tierId !== "parlor_t1") {
      setGateError("M1 supports Table 1 (Free) only.");
      return;
    }

    const http = getPortalHttpClient();
    if (!http || !portalSessionReady) {
      if (!authed) {
        askAuth({});
        setGateLoading(false);
        return;
      }
      setGateError("Portal session not ready. Please wait or re-login.");
      return;
    }

    setGateLoading(true);
    setGateError(null);

    try {
      const validation = await http.query(portalTournamentFns.townValidateEntry, {
        buildingId: gateSelection.buildingId,
        modeId: gateSelection.modeId,
        tierId: gateSelection.tierId,
      });

      if (!validation?.ok) {
        setGateError(
          validation?.error === "INSUFFICIENT_FUNDS"
            ? "Not enough coins."
            : validation?.message ?? validation?.error ?? "Cannot enter"
        );
        setGateLoading(false);
        return;
      }

      const entry = await http.mutation(portalTournamentFns.townRecordEntry, {
        buildingId: gateSelection.buildingId,
        modeId: gateSelection.modeId,
        tierId: gateSelection.tierId,
      });

      if (!entry?.ok) {
        setGateError(entry?.error ?? "Entry failed");
        setGateLoading(false);
        return;
      }

      const outcome = await joinTournament("solo");
      if (outcome.kind !== "ready" || !outcome.gameId) {
        setGateError(outcome.kind === "failed" ? outcome.error : "Could not start Solitaire.");
        setGateLoading(false);
        return;
      }

      closeGate();
      setGateLoading(false);
      await refresh();
      await loadProgress();

      openModal({
        name: portalPlayModalForGameType("solitaire"),
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
  }, [gateSelection, portalSessionReady, authed, askAuth, closeGate, joinTournament, refresh, loadProgress, openModal]);

  if (!visible) return null;

  return (
    <div className="town-map">
      <div className="town-hud-top">
        <div style={{ display: "flex", gap: 8 }}>
          <span className="town-badge">🪙 {coins.toLocaleString()}</span>
          <span className="town-badge">💎 {progress?.gems ?? playerWallet?.gems ?? 0}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!authed ? (
            <button type="button" className="town-badge town-badge--action" onClick={() => askAuth({})}>
              登录
            </button>
          ) : null}
          <span className="town-badge" title={portalSessionReady ? "Ready" : "Connecting…"}>
            {portalSessionReady ? "✓" : "…"}
          </span>
        </div>
      </div>

      <div className="town-map__canvas">
        <div className="town-map__ground">
          {buildings.map((building) => {
            const highlight = approaching === building.id;
            return (
              <button
                key={building.id}
                type="button"
                className={`town-building town-building--${building.id} ${highlight ? "town-building--highlight" : ""}`}
                style={{ left: `${building.position.x}%`, top: `${building.position.y}%` }}
                disabled={!!approaching && approaching !== building.id}
                onClick={() => handleBuildingClick(building)}
              >
                <div className="town-building__body">
                  <span className="town-building__icon">{BUILDING_ICONS[building.id] ?? "🏠"}</span>
                  <span className="town-building__label">{building.name}</span>
                </div>
              </button>
            );
          })}
          <div className="town-player" style={{ left: `${playerPos.x}%`, top: `${playerPos.y}%` }} />
        </div>
      </div>

      <div className="town-hud-bottom">
        <span className="town-quest-pill">📋 Play 1 game at the Parlor</span>
        <span className="town-season-badge">🥉 Bronze</span>
      </div>

      {gateOpen && gateSelection && activeBuilding && (
        <GateCard
          selection={gateSelection}
          balance={coins}
          unlockedTierIds={unlockedTierIds}
          loading={gateLoading}
          error={gateError}
          onClose={closeGate}
          onEnter={handleEnter}
          onModeChange={updateMode}
          onTierChange={updateTier}
          buildingConfig={{ modes: activeBuilding.modes, tiers: activeBuilding.tiers }}
        />
      )}

      {toast && <div className="town-toast">{toast}</div>}
    </div>
  );
};

const TownMapPage: React.FC<PageProp> = (props) => (
  <PortalProvider gameType="solitaire">
    <TownMapInner {...props} />
  </PortalProvider>
);

export default TownMapPage;
