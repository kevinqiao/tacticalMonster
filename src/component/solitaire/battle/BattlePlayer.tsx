import React, { useEffect, useMemo, useRef, useState } from "react";
import { SSAProvider } from "../../../service/SSAManager";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import { SceneProvider } from "./service/CombatSceneProvider";
import useCombatAct from "./service/useCombatAct";
import "./style.css";
import { createDualZones } from "./utils";
import BackGround from "./view/BackGround";
import CardGrid from "./view/CardGrid";
import SceneGrid from "./view/SceneGrid";
const DeckPanel: React.FC = () => {
  const { game, boardDimension } = useCombatManager();
  const { flipCard } = useCombatAct();
  const zone = boardDimension?.zones[1];
  const left = useMemo(() => {
    if (zone) {
      return zone?.['left'] + zone?.['cwidth'] * 2
    }
    return 0
  }, [zone])
  const top = useMemo(() => {
    if (zone) {
      return zone['top'] + (zone['height'] - zone['cheight']) / 2
    }
    return 0
  }, [zone])

  return (
    <>
      {zone && <div style={{ zIndex: 3000, position: "absolute", top: top, left: left, width: zone?.['cwidth'], height: zone?.['cheight'] }} onClick={flipCard}>
      </div>}
    </>
  )
}
const CombatBoard: React.FC = () => {
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 10, width: "100%", height: "100%", backgroundColor: "blue" }}>
        {/* <div style={{ width: "100%", height: zones?.[3]?.['height'], backgroundColor: "red" }}>

        </div>
        <div style={{ width: "100%", height: zones?.[0]?.['height'], backgroundColor: "green" }}>

        </div>
        <div style={{ width: "100%", height: zones?.[2]['height'], backgroundColor: "yellow" }}>

        </div> */}
        <BackGround />
        <CardGrid />
        <SceneGrid />
        {/* <SeatGrid /> */}
        {/* <DeckPanel /> */}
      </div>

    </>
  );
};

export const BattlePlaza: React.FC = () => {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { game, boardDimension, updateBoardDimension } = useCombatManager();

  useEffect(() => {
    const updatePosition = () => {

      if (containerRef.current) {
        const { x, y, top, left, width, height } = containerRef.current.getBoundingClientRect();
        // console.log("x", x, "y", y, "top", top, "left", left, "width", width, "height", height);
        const boardDimension = { width: 0, height: 0, top: 0, left: 0, zones: {} }
        if (width / height > 0.9) {
          boardDimension.width = height * 0.9
          boardDimension.height = height
          boardDimension.top = 0;
          boardDimension.left = (width - height * 0.9) / 2
        } else {
          boardDimension.width = width;
          boardDimension.height = width / 0.9
          boardDimension.top = (height - width / 0.9) / 2
          boardDimension.left = 0
        }
        // const zones = getDualBoardZones(boardDimension.width, boardDimension.height);
        createDualZones(boardDimension);
        updateBoardDimension(boardDimension);
      }
    };
    if (game) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
    }
    return () => window.removeEventListener("resize", updatePosition);
  }, [game]);

  const render = useMemo(() =>
    <div ref={containerRef} className="battle-container" style={{ width: "100%", height: "100%", backgroundColor: "black" }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%", width: boardDimension?.width, height: boardDimension?.height, backgroundColor: "white", transform: "translate(-50%, -50%)"
      }}>
        <CombatBoard />
      </div >
    </div >
    , [boardDimension]);
  return render;
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
  const render = useMemo(() =>
    <SSAProvider app="solitaire">
      {isVisible && <CombatProvider gameId={gameId}>
        <SceneProvider>
          <BattlePlaza></BattlePlaza>
        </SceneProvider>
      </CombatProvider>}
    </SSAProvider>
    , [isVisible]);
  return render;
};
export default BattlePlayer;
