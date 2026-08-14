import React from "react";

import type { PortalWeeklyLeagueTierView } from "component/lobby/portal/service/usePortalManager";
import { TOWN_THEME } from "./townTheme";
import { TownLeagueStatus } from "./TownLeagueStatus";
import { BUILDING_ICONS, TownBuildingView } from "./types";
import "./townHall.css";

export interface TownHallViewProps {
  buildings: TownBuildingView[];
  coins: number;
  gems: number;
  mayorLevel?: number;
  prosperityScore?: number;
  collectablePassive?: number;
  isMobile?: boolean;
  league?: PortalWeeklyLeagueTierView | null;
  leagueHref?: string;
  authed?: boolean;
  onBuildingClick: (building: TownBuildingView) => void;
  onOpenMayorOffice?: () => void;
  onOpenSoloPicker?: () => void;
  onOpenShowdownPicker?: () => void;
  soloOpenCount?: number;
  showdownOpenCount?: number;
  venueLevel?: { trial: number; showdown: number };
}

const TownHallView: React.FC<TownHallViewProps> = ({
  buildings,
  coins,
  gems,
  mayorLevel = 1,
  prosperityScore = 0,
  collectablePassive = 0,
  isMobile = false,
  league = null,
  leagueHref = "",
  authed = false,
  onBuildingClick,
  onOpenMayorOffice,
  onOpenSoloPicker,
  onOpenShowdownPicker,
  soloOpenCount = 0,
  showdownOpenCount = 0,
  venueLevel = { trial: 1, showdown: 1 },
}) => {
  const prosperityPct = Math.min(100, prosperityScore);
  const metaBuildings = buildings.filter((b) => !b.hallKind);
  const rootClass = `town-hall${isMobile ? " town-hall--mobile" : ""}`;

  return (
    <div className={rootClass} style={{ fontFamily: TOWN_THEME.fonts.ui }}>
      <header className="town-hall__hero">
        <div className="town-hall__hero-main">
          <div className="town-hall__hero-icon" aria-hidden>
            🏛️
          </div>
          <div className="town-hall__hero-copy">
            <h1 className="town-hall__title">Mayfield</h1>
            <p className="town-hall__subtitle">Old Square</p>
          </div>
          {!isMobile ? (
            <div className="town-hall__wallet">
              <span className="town-hall__wallet-chip">🪙 {coins.toLocaleString()}</span>
              <span className="town-hall__wallet-chip">💎 {gems.toLocaleString()}</span>
            </div>
          ) : null}
        </div>

        <div className="town-hall__prosperity town-hall__prosperity--inline" aria-label="Town prosperity">
          <div className="town-hall__prosperity-head">
            {leagueHref ? (
              <TownLeagueStatus league={league} leagueHref={leagueHref} authed={authed} />
            ) : (
              <span>Mayor Lv.{mayorLevel}</span>
            )}
            <span>Prosperity {prosperityPct}%</span>
          </div>
          <div className="town-hall__prosperity-track">
            <div className="town-hall__prosperity-fill" style={{ width: `${prosperityPct}%` }} />
          </div>
          {collectablePassive > 0 ? (
            <button type="button" className="town-hall__collect-link" onClick={onOpenMayorOffice}>
              Collect {collectablePassive} coins →
            </button>
          ) : null}
        </div>
      </header>

      {onOpenSoloPicker ? (
        <section className="town-hall__section town-hall__section--solo">
          <h2 className="town-hall__section-label">Solo challenge</h2>
          <button type="button" className="town-hall__venue-hub town-hall__venue-hub--solo" onClick={onOpenSoloPicker}>
            <span className="town-hall__venue-hub-icon" aria-hidden>
              🎴
            </span>
            <span className="town-hall__venue-hub-body">
              <span className="town-hall__venue-hub-name">Solo Challenge</span>
              <span className="town-hall__venue-hub-meta">
                Venue Lv.{venueLevel.trial} · Benchmark · no Week Score
                {soloOpenCount > 0 ? ` · ${soloOpenCount} open` : ""}
              </span>
            </span>
            <span className="town-hall__venue-hub-cta">Choose →</span>
          </button>
        </section>
      ) : null}

      {onOpenShowdownPicker ? (
        <section className="town-hall__section town-hall__section--showdown">
          <h2 className="town-hall__section-label">Multiplayer showdown</h2>
          <button
            type="button"
            className="town-hall__venue-hub town-hall__venue-hub--showdown"
            onClick={onOpenShowdownPicker}
          >
            <span className="town-hall__venue-hub-icon" aria-hidden>
              ⚔️
            </span>
            <span className="town-hall__venue-hub-body">
              <span className="town-hall__venue-hub-name">Showdown Arena</span>
              <span className="town-hall__venue-hub-meta">
                Venue Lv.{venueLevel.showdown} · Async ranked · Week Score
                {showdownOpenCount > 0 ? ` · ${showdownOpenCount} open` : ""}
              </span>
            </span>
            <span className="town-hall__venue-hub-cta">Choose →</span>
          </button>
        </section>
      ) : null}

      {metaBuildings.length > 0 ? (
        <section className="town-hall__section town-hall__section--services">
          <h2 className="town-hall__section-label">Town services</h2>
          <div className="town-hall__service-row">
            {metaBuildings.map((building) => (
              <button
                key={building.id}
                type="button"
                className="town-hall__service-chip"
                onClick={() => onBuildingClick(building)}
              >
                <span aria-hidden>{BUILDING_ICONS[building.id] ?? "🏠"}</span>
                <span>{building.name}</span>
                {building.id !== "town_hall" ? (
                  <span className="town-hall__service-chip-lock" aria-hidden>
                    🔒
                  </span>
                ) : (
                  <span className="town-hall__service-chip-cta" aria-hidden>
                    →
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="town-hall__quest" aria-label="Daily quest">
        <span className="town-hall__quest-icon" aria-hidden>
          📋
        </span>
        <span className="town-hall__quest-text">Play 1 solo challenge to warm up the square.</span>
      </section>
    </div>
  );
};

export default TownHallView;
