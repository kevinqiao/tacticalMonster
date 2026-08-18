import React from "react";

import MayfieldTownScene from "./MayfieldTownScene";
import type { DistrictOpView } from "./districtSystem";
import { TownBuildingView } from "./types";

export interface TownSceneViewProps {
  buildings: TownBuildingView[];
  districtOps?: DistrictOpView[];
  unlockedDistricts?: string[];
  currentDistrict?: string;
  activeBuildingId: string | null;
  onBuildingClick: (building: TownBuildingView) => void;
  onDistrictClick?: () => void;
}

/** Mode 1: static town plate + clickable building hotspots (no walk animation). */
const TownSceneView: React.FC<TownSceneViewProps> = ({
  buildings,
  districtOps,
  unlockedDistricts,
  currentDistrict,
  activeBuildingId,
  onBuildingClick,
  onDistrictClick,
}) => (
  <MayfieldTownScene
    buildings={buildings}
    districtOps={districtOps}
    unlockedDistricts={unlockedDistricts}
    currentDistrict={currentDistrict}
    activeBuildingId={activeBuildingId}
    approachingId={null}
    playerPos={{ x: -999, y: -999 }}
    showPlayer={false}
    onBuildingClick={onBuildingClick}
    onDistrictClick={onDistrictClick}
  />
);

export default TownSceneView;
