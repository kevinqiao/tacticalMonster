import React from "react";
import "./map.css";
import BattleProvider, { useCombatManager } from "./service/CombatManager";
import CharacterGrid from "./svg/CharacterGrid";
import PathGrid from "./svg/PathGrid";

const BattleVenue: React.FC = () => {
  const { map } = useCombatManager();
  const { top, left } = map;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", margin: 0 }}>
        {/* <VenueLayer top={top} left={left}>
          <ObstacleGrid />
        </VenueLayer> */}
        <div style={{ position: "absolute", top, left, margin: 0 }}>
          <PathGrid />
        </div>
        <div style={{ position: "absolute", top, left, margin: 0 }}>
          <CharacterGrid />
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
