import React from "react";
import "./townZone.css";
import ProsperityMilestonesStrip from "./ProsperityMilestonesStrip";
import type { ProsperityMilestonesView } from "./prosperityMilestones";

export type TownZoneView = {
  slotId: string;
  districtId: string;
  zoneType: string | null;
  level: number;
  developable: boolean;
  choices: string[];
  developCost: number | null;
  upgradeCost: number | null;
  passivePerHour: number;
  entertainmentBonusActive?: boolean;
  coinTableBonusActive?: boolean;
  label: string | null;
  labelZh: string | null;
};

export type EntertainmentBonusView = {
  minGamesPerWeek: number;
  passiveMultiplier: number;
  gamesThisWeek: number;
  active: boolean;
  remaining: number;
};

export interface TownZonePanelProps {
  prosperityScore: number;
  prosperityMilestones?: ProsperityMilestonesView;
  entertainmentBonus?: EntertainmentBonusView | null;
  hasEntertainmentZone?: boolean;
  coinTableBonus?: EntertainmentBonusView | null;
  hasCommercialZone?: boolean;
  onClose: () => void;
  onOpenDistricts?: () => void;
}

const TownZonePanel: React.FC<TownZonePanelProps> = ({
  entertainmentBonus,
  hasEntertainmentZone = false,
  coinTableBonus,
  hasCommercialZone = false,
  prosperityScore,
  prosperityMilestones,
  onClose,
  onOpenDistricts,
}) => {
  return (
    <div className="town-zone-overlay" role="dialog" aria-label="Mayor's Office">
      <div className="town-zone-panel">
        <header className="town-zone-panel__head">
          <div>
            <h2>Mayor&apos;s Office</h2>
            <p>Prosperity {prosperityScore}%</p>
          </div>
          <button type="button" className="town-zone-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {hasEntertainmentZone && entertainmentBonus ? (
          <div
            className={`town-zone-panel__bonus${entertainmentBonus.active ? " town-zone-panel__bonus--active" : ""}`}
          >
            <strong>Entertainment × Showdown</strong>
            <span>
              {entertainmentBonus.active
                ? `×${entertainmentBonus.passiveMultiplier} passive active (${entertainmentBonus.gamesThisWeek}/${entertainmentBonus.minGamesPerWeek} Showdown this week)`
                : `${entertainmentBonus.gamesThisWeek}/${entertainmentBonus.minGamesPerWeek} Showdown this week for ×${entertainmentBonus.passiveMultiplier} entertainment passive`}
            </span>
          </div>
        ) : null}

        {hasCommercialZone && coinTableBonus ? (
          <div
            className={`town-zone-panel__bonus${coinTableBonus.active ? " town-zone-panel__bonus--active" : ""}`}
          >
            <strong>Finance × Coin tables</strong>
            <span>
              {coinTableBonus.active
                ? `×${coinTableBonus.passiveMultiplier} passive active (${coinTableBonus.gamesThisWeek}/${coinTableBonus.minGamesPerWeek} coin tables this week)`
                : `${coinTableBonus.gamesThisWeek}/${coinTableBonus.minGamesPerWeek} coin tables this week for ×${coinTableBonus.passiveMultiplier} finance passive`}
            </span>
          </div>
        ) : null}

        {prosperityMilestones ? (
          <ProsperityMilestonesStrip milestones={prosperityMilestones} compact />
        ) : null}

        <p className="town-zone-panel__expand-checks">
          Build lots and expand districts from the Districts list.
        </p>
        {onOpenDistricts ? (
          <div className="town-zone-panel__expand">
            <button type="button" className="town-btn-primary" onClick={onOpenDistricts}>
              Open Districts
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TownZonePanel;
