import { PageProp } from "component/RenderApp";
import { useConvex } from "convex/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../convex/sso/convex/_generated/api";
import { usePageManager } from "service/PageManager";
import { SSA_AUTH_URLS } from "service/SSAManager";
import { useUserManager, AppSessionStatus } from "service/UserManager";
import GateCard from "./GateCard";
import { BUILDING_ICONS, GateSelection, TownBuildingView } from "./types";
import "./town.css";

const SOLITAIRE_HTTP = SSA_AUTH_URLS.solitaire;

const FALLBACK_BUILDINGS: TownBuildingView[] = [
  {
    id: "saloon",
    name: "Poker Saloon",
    districtId: "D0",
    ssaKey: "poker",
    modes: [{ id: "cash", label: "Cash" }, { id: "sng", label: "SNG" }],
    tiers: [
      { id: "saloon_t1", label: "Tier 1", buyIn: 100 },
      { id: "saloon_t2", label: "Tier 2", buyIn: 500, unlockTierId: "saloon_t1" },
    ],
    position: { x: 28, y: 42 },
  },
  {
    id: "parlor",
    name: "Solitaire Parlor",
    districtId: "D0",
    ssaKey: "solitaire",
    modes: [{ id: "standard", label: "Standard" }],
    tiers: [
      { id: "parlor_t1", label: "Table 1", buyIn: 0 },
      { id: "parlor_t2", label: "Table 2", buyIn: 100, unlockTierId: "parlor_t1" },
    ],
    position: { x: 62, y: 38 },
  },
  {
    id: "town_hall",
    name: "Town Hall",
    districtId: "D0",
    modes: [],
    tiers: [],
    position: { x: 50, y: 22 },
  },
  {
    id: "telegraph",
    name: "Telegraph",
    districtId: "D0",
    modes: [],
    tiers: [],
    position: { x: 78, y: 52 },
  },
];

async function createSolitaireMatch(uid: string, matchId: string) {
  const res = await fetch(`${SOLITAIRE_HTTP}/game/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uids: [uid], matchId }),
  });
  return res.json();
}

const TownMap: React.FC<PageProp> = ({ visible }) => {
  const convex = useConvex();
  const { user, sessions } = useUserManager();
  const { openPage } = usePageManager();

  const [toast, setToast] = useState<string | null>(null);
  const [approaching, setApproaching] = useState<string | null>(null);
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 65 });
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<{
    coins: number;
    gems: number;
    unlockedTierIds: string[];
    buildings: TownBuildingView[];
  } | null>(null);
  const [gateSelection, setGateSelection] = useState<GateSelection | null>(null);

  const uid = user?.uid;
  const token = user?.token;

  const loadProgress = useCallback(async () => {
    if (!uid) return;
    try {
      const progress = await convex.query(api.town.progress.getProgress, { uid, token });
      if (progress) {
        setLocalProgress({
          coins: progress.coins,
          gems: progress.gems,
          unlockedTierIds: progress.unlockedTierIds,
          buildings: progress.buildings as TownBuildingView[],
        });
      }
    } catch (e) {
      console.warn("town progress fallback", e);
      setLocalProgress({
        coins: 5000,
        gems: 0,
        unlockedTierIds: ["parlor_t1", "saloon_t1"],
        buildings: FALLBACK_BUILDINGS,
      });
    }
  }, [convex, uid, token]);

  useEffect(() => {
    if (visible && uid) {
      loadProgress();
    }
  }, [visible, uid, loadProgress]);

  const buildings = localProgress?.buildings ?? FALLBACK_BUILDINGS;
  const coins = localProgress?.coins ?? 0;
  const unlockedTierIds = localProgress?.unlockedTierIds ?? ["parlor_t1"];

  const activeBuilding = useMemo(
    () => buildings.find((b) => b.id === gateSelection?.buildingId),
    [buildings, gateSelection?.buildingId]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
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
    if (!uid || !token || !gateSelection) return;
    if (gateSelection.ssaKey !== "solitaire") {
      setGateError("Poker Saloon is not ready yet. Use Solitaire Parlor.");
      return;
    }

    setGateLoading(true);
    setGateError(null);

    try {
      const validation = await convex.query(api.gate.validate.validateEntry, {
        uid,
        token,
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

      const entry = await convex.mutation(api.gate.validate.recordEntry, {
        uid,
        token,
        buildingId: gateSelection.buildingId,
        modeId: gateSelection.modeId,
        tierId: gateSelection.tierId,
      });

      if (!entry?.ok) {
        setGateError(entry?.error ?? "Entry failed");
        setGateLoading(false);
        return;
      }

      const solitaireSession = sessions.find((s) => s.app === "solitaire");
      if (solitaireSession?.status !== AppSessionStatus.SIGNED_IN) {
        await fetch(`${SSA_AUTH_URLS.solitaire}/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: token,
            expire: (user.expire ?? Date.now()) - Date.now(),
          }),
        });
      }

      const matchId = `town_${Date.now()}_${uid}`;
      await createSolitaireMatch(uid, matchId);

      closeGate();
      setGateLoading(false);
      await loadProgress();

      openPage({
        uri: "/play/solitaire",
        data: { matchId, fromTown: true, buildingId: gateSelection.buildingId },
      });
    } catch (e) {
      console.error(e);
      setGateError("Something went wrong. Try again.");
      setGateLoading(false);
    }
  }, [uid, token, gateSelection, convex, sessions, user, closeGate, loadProgress, openPage]);

  if (!visible) return null;

  return (
    <div className="town-map">
      <div className="town-hud-top">
        <div style={{ display: "flex", gap: 8 }}>
          <span className="town-badge">🪙 {coins.toLocaleString()}</span>
          <span className="town-badge">💎 {localProgress?.gems ?? 0}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="town-badge">⚙️</span>
          <span className="town-badge">📨</span>
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

export default TownMap;
