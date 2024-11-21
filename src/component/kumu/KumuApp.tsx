import { useAction } from "convex/react";
import React, { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import ObstacleGrid from "./battle/ObstacleGrid";
import "./map.css";
import BattleProvider, { useCombatManager } from "./service/CombatManager";
import useCombatHandlers from "./service/useCombatHandlers";
import useGameInit from "./service/useGameInit";
import CharacterGrid from "./sprite/CharacterGrid";
import GridGround from "./sprite/GridGround";
const CombatActPanel: React.FC = () => {
  const doSomething = useAction(api.rule.test.doSomething);
  return (
    <div className="action-panel" style={{ left: 0 }}>
      <div className="action-panel-item">SKILL</div>
      <div className="action-panel-item">STANDBY</div>
      <div className="action-panel-item" onClick={() => doSomething()}>
        DEFEND
      </div>
    </div>
  );
};
const CombatPlaza: React.FC = () => {
  return (
    <div className="plaza-container">
      <div className="plaza-layer" style={{ top: 0, left: 0 }}>
        <ObstacleGrid />
      </div>
      <div className="plaza-layer" style={{ top: 0, left: 0 }}>
        <GridGround />
      </div>
      <div className="plaza-layer" style={{ top: 0, left: 0, pointerEvents: "none" }}>
        <CharacterGrid />
      </div>
      {/* <div className="map-background" style={{ pointerEvents: "none" }}>
        <GridCover />
      </div> */}
    </div>
  );
};

const placeRatio = 1.9;

const BattleVenue: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [placePosition, setPlacePosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [plazaPosition, setPlazaPosition] = useState<{
    bottom: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const { map, changeCellSize } = useCombatManager();
  useCombatHandlers();
  useGameInit();

  useEffect(() => {
    if (!map || map.cols === 0 || map.rows === 0) return;
    const { rows, cols } = map;
    const updateMap = () => {
      if (containerRef.current) {
        const wratio = window.innerWidth / window.innerHeight;
        const mwidth = placeRatio < wratio ? window.innerHeight * placeRatio : window.innerWidth;
        const mheight = placeRatio < wratio ? window.innerHeight : window.innerWidth / placeRatio;
        const bottom = mheight * 0.05;
        const cheight = mheight * 0.95;
        const h = rows % 2 === 0 ? (1.5 * rows) / 2 : 1 + Math.floor(rows / 2) * 1.5;
        const plazaRatio = cols / h;
        const cwidth = cheight * plazaRatio;
        const left = (mwidth - cwidth) / 2;
        const cellSize = cwidth / cols - 2;
        const dw = (window.innerWidth - mwidth) / 2;
        const dh = (window.innerHeight - mheight) / 2;

        // changeMap((pre) => ({
        //   ...pre,
        //   rows,
        //   cols,
        //   size: Math.round(cellSize),
        //   width: cwidth,
        //   height: cheight,
        // }));
        changeCellSize(cellSize);
        setPlazaPosition({ bottom, left, width: cwidth, height: cheight });
        setPlacePosition({ top: dh, left: dw, width: mwidth, height: mheight });
      }
    };

    updateMap(); // 初始化时设置一次
    window.addEventListener("resize", updateMap); // 监听屏幕变化
    return () => window.removeEventListener("resize", updateMap); // 清除监听器
  }, [map]);

  return (
    <div className="battle-container">
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          ...placePosition,
          backgroundColor: "white",
        }}
      >
        <div style={{ position: "absolute", ...plazaPosition }}>
          <CombatPlaza />
        </div>
        <CombatActPanel />
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
