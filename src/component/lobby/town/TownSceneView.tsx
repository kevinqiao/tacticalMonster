import React from "react";

import MayfieldTownScene from "./MayfieldTownScene";
import type { TownZoneView } from "./TownZonePanel";
import { TownBuildingView } from "./types";

export interface TownSceneViewProps {
  buildings: TownBuildingView[];
  zones?: TownZoneView[];
  unlockedDistricts?: string[];
  currentDistrict?: string;
  activeBuildingId: string | null;
  onBuildingClick: (building: TownBuildingView) => void;
  onZoneClick?: () => void;
}

/** Mode 1: static town plate + clickable building hotspots (no walk animation). */
const TownSceneView: React.FC<TownSceneViewProps> = ({
  buildings,
  zones,
  unlockedDistricts,
  currentDistrict,
  activeBuildingId,
  onBuildingClick,
  onZoneClick,
}) => (
  <MayfieldTownScene
    buildings={buildings}
    zones={zones}
    unlockedDistricts={unlockedDistricts}
    currentDistrict={currentDistrict}
    activeBuildingId={activeBuildingId}
    approachingId={null}
    playerPos={{ x: -999, y: -999 }}
    showPlayer={false}
    onBuildingClick={onBuildingClick}
    onZoneClick={onZoneClick}
  />
);

export default TownSceneView;
