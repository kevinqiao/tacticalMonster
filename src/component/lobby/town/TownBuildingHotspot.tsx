import React from "react";

import { BUILDING_ICONS, TownBuildingView } from "./types";

export type BuildingHotspotState = "available" | "highlight" | "disabled";

export interface TownBuildingHotspotProps {
  building: TownBuildingView;
  state: BuildingHotspotState;
  onClick: () => void;
}

/** Transparent hit area + label ring on the map plate (buildings baked into art). */
const TownBuildingHotspot: React.FC<TownBuildingHotspotProps> = ({
  building,
  state,
  onClick,
}) => {
  const icon = BUILDING_ICONS[building.id] ?? "🏠";
  const showLabel = state === "highlight";

  return (
    <button
      type="button"
      className={`town-hotspot town-hotspot--${building.id} town-hotspot--${state}`}
      disabled={state === "disabled"}
      onClick={onClick}
      aria-label={building.name}
    >
      {state === "highlight" ? <span className="town-hotspot__pulse" aria-hidden /> : null}
      {showLabel ? (
        <span className="town-hotspot__label">
          {icon} {building.name}
        </span>
      ) : null}
    </button>
  );
};

export default TownBuildingHotspot;
