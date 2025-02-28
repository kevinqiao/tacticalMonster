import Dice from "component/ludo/battle/view/Dice";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SSAProvider } from "service/SSAManager";
import "../map.css";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import useCombatAct from "./service/useCombatAct";
import { Seat } from "./types/CombatTypes";
import BoardGrid from "./view/BoardGrid";
import BotOn from "./view/BotOn";
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
  console.log("boardDimension", boardDimension)
  const seats: { [k: number]: Seat } = useMemo(() => {
    const seats: { [k: number]: Seat } = {};
    game?.seats.forEach((seat) => {
      seats[seat.no] = seat;
    })
    return seats;
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
            <div style={{ width: 10 }}></div>{seats[0]?.uid && <><Dice size={Math.floor(boardDimension.height / 15)} seat={seats[0]} /><BotOn seat={seats[0]} size={Math.floor(boardDimension.height / 15)} /></>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "50%" }}>
            {seats[1]?.uid && <><BotOn seat={seats[1]} size={Math.floor(boardDimension.height / 15)} /><Dice size={Math.floor(boardDimension.height / 15)} seat={seats[1]} /></>}
          </div>
        </div>
        <div style={{ ...boardDimension }}>
          <CombatBoard />
        </div>
        <div style={{ display: "flex", width: boardDimension.width, height: boardDimension.height / 15, marginTop: "4px" }}>
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "50%", height: "100%" }}>
            <div style={{ width: 10 }}></div>{seats[3]?.uid && <><Dice size={Math.floor(boardDimension.height / 15)} seat={seats[3]} /><BotOn seat={seats[3]} size={Math.floor(boardDimension.height / 15)} /></>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", width: "50%" }}>
            <div style={{ width: 10 }}></div>{seats[2]?.uid && <><Dice size={Math.floor(boardDimension.height / 15)} seat={seats[2]} /><BotOn seat={seats[2]} size={Math.floor(boardDimension.height / 15)} /></>}
          </div>
        </div>
      </div>
      <div style={{ ...boardDimension }}></div>

    </div>
  );
};
const BattlePlayer: React.FC<{ gameId: string }> = ({ gameId }) => {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时的逻辑处理
        setIsVisible(false);
      } else {
        // 页面恢复可见时的逻辑处理
        setIsVisible(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理函数：组件卸载时移除事件监听
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  return (
    <SSAProvider app="ludo">
      {isVisible && <CombatProvider gameId={gameId}>
        <BattlePlaza></BattlePlaza>
      </CombatProvider>}
    </SSAProvider>
  );
};
export default BattlePlayer;
