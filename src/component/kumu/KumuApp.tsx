import React from "react";
import ObstacleGrid from "./battle/ObstacleGrid";
import "./map.css";
import BattleProvider, { useCombatManager } from "./service/CombatManager";
import CharacterGrid from "./svg/CharacterGrid";
import PathGrid from "./svg/GridGround";
import GridCover from "./svg/GridCover";

const BattleVenue: React.FC = () => {
  const { map } = useCombatManager();
  const { top, left } = map;
  console.log(top + "-" + left);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
      }}
    >
      <div className="map-background" style={{ position: "relative", width: "100%", height: "100%", margin: 0 }}>
        <div style={{ position: "absolute", top, left, margin: 0 }}>
          <ObstacleGrid />
        </div>
        <div style={{ position: "absolute", top, left, margin: 0 }}>
          <PathGrid />
        </div>
        <div style={{ position: "absolute", top, left, margin: 0 }}>
          <CharacterGrid />
        </div>
        <div style={{ position: "absolute", top, left, margin: 0 }}>
          <GridCover />
        </div>
      </div>
    </div>
  );
};
const KumuApp: React.FC = () => {
  return (
    <BattleProvider>
      <BattleVenue></BattleVenue>
    </BattleProvider>
  );
};
export default KumuApp;
