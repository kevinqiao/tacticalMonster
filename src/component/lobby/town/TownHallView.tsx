import React from "react";

import {
  DISTRICT_CATALOG,
  DEFAULT_D1_EXPANSION,
  checklistGates,
  expansionChecklist,
  type DistrictExpansionView,
} from "./districtSystem";
import { TOWN_THEME } from "./townTheme";
import { BUILDING_ICONS, TownBuildingView } from "./types";
import "./townHall.css";

export interface TownHallViewProps {
  buildings: TownBuildingView[];
  isMobile?: boolean;
  mayorLevel?: number;
  prosperityPct?: number;
  coins?: number;
  developedZonesD0?: number;
  developedZonesD1?: number;
  d1Expansion?: DistrictExpansionView | null;
  onBuildingClick: (building: TownBuildingView) => void;
  onOpenMayorOffice?: () => void;
  onOpenDistrict?: (districtId: string) => void;
  onOpenSoloPicker?: () => void;
  onOpenShowdownPicker?: () => void;
  soloOpenCount?: number;
  showdownOpenCount?: number;
  venueLevel?: { trial: number; showdown: number };
  currentDistrict?: string;
  unlockedDistricts?: string[];
  collectablePassive?: number;
}

const TownHallView: React.FC<TownHallViewProps> = ({
  buildings,
  isMobile = false,
  mayorLevel = 1,
  prosperityPct = 0,
  coins = 0,
  developedZonesD0 = 0,
  developedZonesD1 = 0,
  d1Expansion = null,
  onBuildingClick,
  onOpenMayorOffice,
  onOpenDistrict,
  onOpenSoloPicker,
  onOpenShowdownPicker,
  soloOpenCount = 0,
  showdownOpenCount = 0,
  venueLevel = { trial: 1, showdown: 1 },
  currentDistrict = "D0",
  unlockedDistricts = ["D0"],
  collectablePassive = 0,
}) => {
  const metaBuildings = buildings.filter((b) => !b.hallKind && b.id !== "town_hall");
  const rootClass = `town-hall${isMobile ? " town-hall--mobile" : ""}`;
  const d1List = expansionChecklist(
    d1Expansion ?? DEFAULT_D1_EXPANSION,
    mayorLevel,
    developedZonesD0,
    coins
  );

  return (
    <div className={rootClass} style={{ fontFamily: TOWN_THEME.fonts.ui }}>
      <section className="town-hall__section town-hall__section--town-hall" aria-label="Town Hall">
        <h2 className="town-hall__section-label">Town Hall</h2>
        <button
          type="button"
          className="town-hall__district-chip town-hall__district-chip--current"
          onClick={onOpenMayorOffice}
          disabled={!onOpenMayorOffice}
        >
          <span className="town-hall__district-chip-name">Mayor&apos;s Office</span>
          <span className="town-hall__district-chip-state">
            Lv.{mayorLevel} · Prosperity {prosperityPct}%
          </span>
        </button>
      </section>

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
                Venue Lv.{venueLevel.trial} · Benchmark
                {soloOpenCount > 0 ? ` · ${soloOpenCount} open` : ""}
              </span>
            </span>
            <span className="town-hall__venue-hub-cta">
              {unlockedDistricts.includes("D1") ? "Choose →" : "Play →"}
            </span>
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
                Venue Lv.{venueLevel.showdown} · Ranked
                {showdownOpenCount > 0 ? ` · ${showdownOpenCount} open` : ""}
              </span>
            </span>
            <span className="town-hall__venue-hub-cta">
              {unlockedDistricts.includes("D1") ? "Choose →" : "Play →"}
            </span>
          </button>
        </section>
      ) : null}

      <section className="town-hall__section town-hall__section--districts" aria-label="Districts">
        <h2 className="town-hall__section-label">Districts</h2>
        <div className="town-hall__district-row">
          {DISTRICT_CATALOG.map((district) => {
            const unlocked = unlockedDistricts.includes(district.id);
            const current = district.id === currentDistrict;
            const developed = district.id === "D0" ? developedZonesD0 : developedZonesD1;
            const isD1Locked = district.id === "D1" && !unlocked;

            let state: string;
            if (current) state = "Here";
            else if (unlocked) state = "Open";
            else state = "Locked";

            const detail = `${developed}/${district.developableSlots} lots`;
            const showCollect = unlocked && developed > 0 && collectablePassive > 0;
            const cta = isD1Locked
              ? d1List.canExpand
                ? "Expand ready"
                : "View gates"
              : showCollect
                ? `Collect +${collectablePassive}`
                : "Open";

            return (
              <button
                key={district.id}
                type="button"
                className={`town-hall__district-chip${current ? " town-hall__district-chip--current" : ""}${
                  unlocked ? "" : " town-hall__district-chip--locked"
                }${isD1Locked ? " town-hall__district-chip--gates" : ""}${
                  showCollect ? " town-hall__district-chip--collect" : ""
                }`}
                onClick={() => onOpenDistrict?.(district.id)}
                disabled={!onOpenDistrict}
              >
                <span className="town-hall__district-chip-id">{district.id}</span>
                <span className="town-hall__district-chip-name">{district.label}</span>
                <span className="town-hall__district-chip-state">{state}</span>
                {isD1Locked ? (
                  <span className="town-hall__district-gates">
                    {checklistGates(d1List).map((gate) => (
                      <span
                        key={gate.label}
                        className={`town-hall__district-gate${gate.ok ? " town-hall__district-gate--ok" : ""}`}
                      >
                        <span aria-hidden>{gate.ok ? "✓" : "○"}</span>
                        {gate.label}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="town-hall__district-chip-detail">
                    {detail}
                    {showCollect ? ` · +${collectablePassive} ready` : ""}
                  </span>
                )}
                <span className="town-hall__district-chip-cta">{cta}</span>
              </button>
            );
          })}
        </div>
      </section>

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

      {unlockedDistricts.includes("D1") ? (
        <section className="town-hall__quest" aria-label="District quest">
          <span className="town-hall__quest-icon" aria-hidden>
            📋
          </span>
          <span className="town-hall__quest-text">Play 1 solo challenge to warm up the square.</span>
        </section>
      ) : d1List.canExpand ? (
        <section className="town-hall__quest" aria-label="District quest">
          <span className="town-hall__quest-icon" aria-hidden>
            📋
          </span>
          <button
            type="button"
            className="town-hall__quest-action"
            onClick={() => onOpenDistrict?.("D1")}
            disabled={!onOpenDistrict}
          >
            <span className="town-hall__quest-text">Market Street is ready to expand.</span>
            <span className="town-hall__quest-cta">D1 →</span>
          </button>
        </section>
      ) : null}
    </div>
  );
};

export default TownHallView;
