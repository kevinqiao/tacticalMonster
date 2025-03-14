import React, { useEffect, useRef, useState } from "react";
import { SSAProvider } from "../../../service/SSAManager";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import "./style.css";
import { getDualBoardZones } from "./utils";
import CardGrid from "./view/CardGrid";
const CombatBoard: React.FC = () => {

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "blue" }}>
      <div style={{ width: "100%", height: "37.5%", backgroundColor: "red" }}>

      </div>
      <div style={{ width: "100%", height: "25%", backgroundColor: "green" }}>

      </div>
      <div style={{ width: "100%", height: "37.5%", backgroundColor: "yellow" }}>

      </div>
      <CardGrid />
    </div>
  );
};

export const BattlePlaza: React.FC = () => {
  console.log("BattlePlaza")
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { game, boardDimension, updateBoardDimension } = useCombatManager();
  console.log("boardDimension", boardDimension)
  useEffect(() => {
    const updatePosition = () => {

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const boardDimension = { width: 0, height: 0 }
        if (width / height > 1.2) {
          boardDimension.width = height * 1.2
          boardDimension.height = height
        } else {
          boardDimension.width = width;
          boardDimension.height = width / 1.2
        }
        const zones = getDualBoardZones(boardDimension.width, boardDimension.height);
        updateBoardDimension({ ...boardDimension, zones });
      }
    };
    if (game) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
    }
    return () => window.removeEventListener("resize", updatePosition);
  }, [game]);

  return (
    <div ref={containerRef} className="battle-container" style={{ width: "100%", height: "100%", backgroundColor: "black" }}>
      {boardDimension && boardDimension.width > 0 && <div style={{
        position: "absolute", top: "50%", left: "50%", width: boardDimension.width, height: boardDimension.height, backgroundColor: "white", transform: "translate(-50%, -50%)"
      }}>
        <CombatBoard />
      </div >}


    </div >
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
    <SSAProvider app="solitaire">
      {isVisible && <CombatProvider gameId={gameId}>
        <BattlePlaza></BattlePlaza>
      </CombatProvider>}
    </SSAProvider>

  );
};
export default BattlePlayer;
