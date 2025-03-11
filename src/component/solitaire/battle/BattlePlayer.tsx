import React, { useEffect, useRef, useState } from "react";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import "./style.css";
import CardGrid from "./view/CardGrid";
const CombatBoard: React.FC = () => {

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "blue" }}>
      <CardGrid />
    </div>
  );
};
const bgColors = ["red", "yellow", "green", "white", "black", "grey", "white"]
export const BattlePlaza: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { game, boardDimension, updateBoardDimension } = useCombatManager();

  useEffect(() => {
    const updatePosition = () => {

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const size = { width: 0, height: 0 }
        if (width / height > 1.2) {
          size.width = height * 1.2
          size.height = height
        } else {
          size.width = width;
          size.height = width / 1.2
        }

        updateBoardDimension(size.width, size.height);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  return (
    <div ref={containerRef} className="battle-container" style={{ width: "100%", height: "100%", backgroundColor: "black" }}>
      {boardDimension.width > 0 && <div style={{
        position: "absolute", top: "50%", left: "50%", width: boardDimension.width, height: boardDimension.height, backgroundColor: "white", transform: "translate(-50%, -50%)"
      }}>
        <CombatBoard />
      </div >}


    </div >
  );
};
const BattlePlayer: React.FC<{ gameId: string }> = () => {
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
    <CombatProvider gameId="123">
      <BattlePlaza></BattlePlaza>
    </CombatProvider>

  );
};
export default BattlePlayer;
