import { PageProp } from "component/RenderApp";
import React, { useEffect, useRef, useState } from "react";
import { SSAProvider } from "service/SSAManager";
import "../map.css";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import useCombatAct from "./service/useCombatAct";
import BoardGrid from "./view/BoardGrid";
import GoalPlace from "./view/GoalPlace";
import SeatGrid from "./view/SeatGrid";
import TokenGrid from "./view/TokenGrid";
const CombatBoard: React.FC = () => {

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "black" }}>
      <BoardGrid />
      <GoalPlace />
      <SeatGrid />
      <TokenGrid />
    </div>
  );
};

export const BattlePlaza: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [placePosition, setPlacePosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);


  const { boardDimension, updateBoardDimension } = useCombatManager();
  const { roll } = useCombatAct();

  useEffect(() => {
    const updatePosition = () => {
      console.log("updateMap")

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        console.log(width, height)
        const size = width > height ? { width: height, height } : { width, height: width }
        const plazaLeft = (width - size.width) / 2;
        const plazaTop = (height - size.height) / 2;
        updateBoardDimension(size.width, size.height);
        setPlacePosition({ top: plazaTop, left: plazaLeft, width: size.width, height: size.height });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  return (
    <div ref={containerRef} className="battle-container" style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          ...placePosition,
        }}
      >
        <div style={{ ...boardDimension }}>
          <CombatBoard />
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", position: "absolute", bottom: 0, right: 0, width: "40%", height: 100, backgroundColor: "red" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", width: 100, height: 40, backgroundColor: "white" }} onClick={() => roll(1)}>1</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", width: 100, height: 40, backgroundColor: "white" }} onClick={() => roll(3)}>3</div>
          </div>
        </div>
      </div>
    </div>
  );
};
const BattlePlayer: React.FC<PageProp> = ({ data }) => {

  if (!data || !data.gameId) return;

  return (
    <SSAProvider app="tacticalMonster">
      <CombatProvider gameId={data.gameId}>
        <BattlePlaza></BattlePlaza>
      </CombatProvider>
    </SSAProvider>
  );
};
export default BattlePlayer;
