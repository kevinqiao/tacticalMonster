import { PageProp } from "component/RenderApp";
import React, { useEffect, useRef } from "react";
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

  const { boardDimension, updateBoardDimension } = useCombatManager();
  const { roll } = useCombatAct();

  useEffect(() => {
    const updatePosition = () => {

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const size = { width: 0, height: 0 }
        if (width / height > 15 / 17) {
          size.width = height * 15 / 17
          size.height = size.width
        } else {
          size.width = width;
          size.height = width
        }

        updateBoardDimension(size.width, size.height);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  return (
    <div ref={containerRef} className="battle-container" style={{ width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <div style={{ display: "flex", width: boardDimension.width, height: boardDimension.height / 15, border: "1px solid white", marginTop: "2px" }}>
          <div style={{ width: "50%" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", width: boardDimension.height / 15, height: "100%", backgroundColor: "grey" }} onClick={() => roll(0)}>0</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "50%" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", width: boardDimension.height / 15, height: "100%", backgroundColor: "grey" }} onClick={() => roll(1)}>1</div>
          </div>
        </div>
        <div style={{ ...boardDimension }}>
          <CombatBoard />
        </div>
        <div style={{ display: "flex", width: boardDimension.width, height: boardDimension.height / 15, border: "1px solid white", marginTop: "2px" }}>
          <div style={{ width: "50%" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", width: boardDimension.height / 15, height: "100%", backgroundColor: "grey" }} onClick={() => roll(3)}>3</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "50%" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", width: boardDimension.height / 15, height: "100%", backgroundColor: "grey" }} onClick={() => roll(2)}>2</div>
          </div>
        </div>
      </div>
      <div style={{ ...boardDimension }}></div>

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
