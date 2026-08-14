import React from "react";

import {
  MAYFIELD_D0_ZONE_OVERLAYS,
  hotspotsForDistricts,
  districtLabel,
} from "./mayfieldSceneLayout";
import { MAYFIELD_ART } from "./mayfieldArtCatalog";
import TownBuildingHotspot, { BuildingHotspotState } from "./TownBuildingHotspot";
import { TownBuildingView } from "./types";
import type { TownZoneView } from "./TownZonePanel";
import "./mayfieldTownScene.css";

export interface MayfieldTownSceneProps {
  buildings: TownBuildingView[];
  zones?: TownZoneView[];
  unlockedDistricts?: string[];
  currentDistrict?: string;
  activeBuildingId: string | null;
  approachingId: string | null;
  playerPos: { x: number; y: number };
  showPlayer?: boolean;
  onBuildingClick: (building: TownBuildingView) => void;
  onZoneClick?: () => void;
}

const MayfieldTownScene: React.FC<MayfieldTownSceneProps> = ({
  buildings,
  zones = [],
  unlockedDistricts = ["D0"],
  currentDistrict = "D0",
  activeBuildingId,
  approachingId,
  playerPos,
  showPlayer = true,
  onBuildingClick,
  onZoneClick,
}) => {
  const buildingById = React.useMemo(() => {
    const map = new Map<string, TownBuildingView>();
    buildings.forEach((b) => map.set(b.id, b));
    return map;
  }, [buildings]);

  const zoneBySlot = React.useMemo(() => {
    const map = new Map<string, TownZoneView>();
    zones.forEach((z) => map.set(z.slotId, z));
    return map;
  }, [zones]);

  const hotspots = React.useMemo(
    () => hotspotsForDistricts(unlockedDistricts),
    [unlockedDistricts]
  );

  const hotspotState = (buildingId: string): BuildingHotspotState => {
    if (approachingId && approachingId !== buildingId) return "disabled";
    if (approachingId === buildingId || activeBuildingId === buildingId) return "highlight";
    return "available";
  };

  const districtName = districtLabel(currentDistrict);

  return (
    <div className="mayfield-scene" data-town-renderer="saloon-row-plate-v1">
      <div className="mayfield-scene__frame">
        <div className="mayfield-scene__district-label">{districtName}</div>
        <div className="mayfield-scene__stage">
          <img
            className="mayfield-scene__plate"
            src={MAYFIELD_ART.mapD0}
            alt={`Mayfield ${districtName}`}
            draggable={false}
          />

          {MAYFIELD_D0_ZONE_OVERLAYS.map((overlay) => {
            const zone = zoneBySlot.get(overlay.slotId);
            const empty = !zone?.zoneType || zone.level === 0;
            const level = zone?.level ?? 0;
            return (
              <button
                key={overlay.slotId}
                type="button"
                className={`mayfield-scene__zone${empty ? " mayfield-scene__zone--empty" : ""}`}
                style={{
                  left: `${overlay.x * 100}%`,
                  top: `${overlay.y * 100}%`,
                  width: `${overlay.w * 100}%`,
                  height: `${overlay.h * 100}%`,
                }}
                onClick={onZoneClick}
                title={zone?.labelZh ?? zone?.label ?? "Zone slot"}
              >
                {empty ? "+" : `L${level}`}
              </button>
            );
          })}

          {hotspots.map((hotspot) => {
            const building = buildingById.get(hotspot.buildingId);
            if (!building) return null;
            return (
              <div
                key={hotspot.buildingId}
                className="mayfield-scene__hotspot-wrap"
                style={{
                  left: `${hotspot.x * 100}%`,
                  top: `${hotspot.y * 100}%`,
                  width: `${hotspot.w * 100}%`,
                  height: `${hotspot.h * 100}%`,
                }}
              >
                <TownBuildingHotspot
                  building={building}
                  state={hotspotState(hotspot.buildingId)}
                  onClick={() => onBuildingClick(building)}
                />
              </div>
            );
          })}

          {showPlayer ? (
            <div
              className="mayfield-scene__player"
              style={{ left: `${playerPos.x}%`, top: `${playerPos.y}%` }}
            >
              <img src={MAYFIELD_ART.player} alt="" draggable={false} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MayfieldTownScene;
