import React from "react";

import {
  hotspotsForDistricts,
  districtLabel,
  districtOverlayForScene,
} from "./mayfieldSceneLayout";
import { MAYFIELD_ART } from "./mayfieldArtCatalog";
import TownBuildingHotspot, { BuildingHotspotState } from "./TownBuildingHotspot";
import { TownBuildingView } from "./types";
import { districtOpFor, districtStatusLine, type DistrictOpView } from "./districtSystem";
import "./mayfieldTownScene.css";

export interface MayfieldTownSceneProps {
  buildings: TownBuildingView[];
  districtOps?: DistrictOpView[];
  unlockedDistricts?: string[];
  currentDistrict?: string;
  activeBuildingId: string | null;
  approachingId: string | null;
  playerPos: { x: number; y: number };
  showPlayer?: boolean;
  onBuildingClick: (building: TownBuildingView) => void;
  onDistrictClick?: () => void;
}

const MayfieldTownScene: React.FC<MayfieldTownSceneProps> = ({
  buildings,
  districtOps = [],
  unlockedDistricts = ["D0"],
  currentDistrict = "D0",
  activeBuildingId,
  approachingId,
  playerPos,
  showPlayer = true,
  onBuildingClick,
  onDistrictClick,
}) => {
  const buildingById = React.useMemo(() => {
    const map = new Map<string, TownBuildingView>();
    buildings.forEach((b) => map.set(b.id, b));
    return map;
  }, [buildings]);

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
  const currentOp = districtOpFor(districtOps, currentDistrict);
  const overlay = districtOverlayForScene();
  const overlayLabel = districtStatusLine(currentOp, unlockedDistricts.includes(currentDistrict));

  return (
    <div
      className={`mayfield-scene${currentDistrict === "D1" ? " mayfield-scene--d1" : ""}`}
      data-town-renderer="saloon-row-plate-v1"
    >
      <div className="mayfield-scene__frame">
        <div className="mayfield-scene__district-label">Here · {districtName}</div>
        <div className="mayfield-scene__stage">
          <img
            className="mayfield-scene__plate"
            src={MAYFIELD_ART.mapD0}
            alt={`Mayfield ${districtName}`}
            draggable={false}
          />

          <button
            type="button"
            className={`mayfield-scene__district${
              currentOp && currentOp.level > 0 ? "" : " mayfield-scene__district--empty"
            }`}
            style={{
              left: `${overlay.x * 100}%`,
              top: `${overlay.y * 100}%`,
              width: `${overlay.w * 100}%`,
              height: `${overlay.h * 100}%`,
            }}
            onClick={onDistrictClick}
            title={districtName}
          >
            {overlayLabel}
          </button>

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
