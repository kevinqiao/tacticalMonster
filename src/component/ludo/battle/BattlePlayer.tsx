import Dice from "component/kumu/lobby/view/Dice";
import React, { useCallback, useEffect, useRef } from "react";
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
  const { game, boardDimension, updateBoardDimension } = useCombatManager();
  const { roll } = useCombatAct();

  const isAvailable = useCallback((seatNo: number) => {
    const seat = game?.seats.find((seat) => seat.no === seatNo);
    if (seat?.tokens.length && seat.tokens.length > 0) return true;
    return false;
  }, [game]);
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
        <div style={{ display: "flex", width: boardDimension.width, height: boardDimension.height / 15, marginBottom: "2px" }}>
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "50%", height: "100%" }}>
            <div style={{ width: 10 }}></div><Dice size={Math.floor(boardDimension.height / 15)} seatNo={0} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "50%" }}>
            <Dice size={Math.floor(boardDimension.height / 15)} seatNo={1} />
          </div>
        </div>
        <div style={{ ...boardDimension }}>
          <CombatBoard />
        </div>
        <div style={{ display: "flex", width: boardDimension.width, height: boardDimension.height / 15, marginTop: "4px" }}>
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "50%", height: "100%" }}>
            <div style={{ width: 10 }}></div><Dice size={Math.floor(boardDimension.height / 15)} seatNo={3} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "50%" }}>
            <Dice size={Math.floor(boardDimension.height / 15)} seatNo={2} />
          </div>
        </div>
      </div>
      <div style={{ ...boardDimension }}></div>

    </div>
  );
};
const BattlePlayer: React.FC<{ gameId: string }> = ({ gameId }) => {
  console.log("gameId", gameId)
  return (
    <SSAProvider app="ludo">
      <CombatProvider gameId={gameId}>
        <BattlePlaza></BattlePlaza>
      </CombatProvider>
    </SSAProvider>
  );
};
export default BattlePlayer;
