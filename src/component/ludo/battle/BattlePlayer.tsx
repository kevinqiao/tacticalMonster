import { PageProp } from "component/RenderApp";
import React, { useEffect, useRef, useState } from "react";
import { SSAProvider } from "service/SSAManager";
import "../map.css";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import SeatGrid from "./view/SeatGrid";


const CombatBoard: React.FC<{ width: number, height: number }> = ({ width, height }) => {
  const { boardSize } = useCombatManager();
  const tileSize = Math.floor(width / boardSize);
  return (
    <div className="plaza-container" style={{ width, height, backgroundColor: "blue" }}>
      <SeatGrid tileSize={tileSize} />
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

  const [boardDimension, setBoardDimension] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  useEffect(() => {
    const updatePosition = () => {
      console.log("updateMap")

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        console.log(width, height)
        const size = width > height ? { width: height, height } : { width, height: width }
        const plazaLeft = (width - size.width) / 2;
        const plazaTop = (height - size.height) / 2;
        setBoardDimension(size);
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
          backgroundColor: "red",
        }}
      >
        <div style={{ ...boardDimension }}>
          <CombatBoard width={boardDimension.width} height={boardDimension.height} />
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
