import { useAction } from "convex/react";
import React, { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import "../map.css";
import BattleProvider, { useCombatManager } from "./service/CombatManager";
import useCombatHandlers from "./service/useCombatHandlers";
import useGameInit from "./service/useGameInit";
import GridGround from "./view/GridGround";
import ObstacleGrid from "./view/ObstacleGrid";
import SpineTest from "./view/SpineTest";
const CombatActPanel: React.FC = () => {
  const doSomething = useAction(api.rule.test.doSomething);
  const startGame = useAction(api.service.tmGameProxy.start);

  return (
    <div className="action-control" style={{ left: 0 }}>
      <div className="action-panel-item" onClick={() => startGame()}>
        START
      </div>
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
        {/* <CharacterGrid /> */}
        <SpineTest />
      </div>
    </div>
  );
};

const BattleVenue: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [placePosition, setPlacePosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [plazaPosition, setPlazaPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const { map, changeCell } = useCombatManager();
  useCombatHandlers();
  useGameInit();

  useEffect(() => {
    if (!map || map.cols === 0 || map.rows === 0) return;
    const { rows, cols } = map;

    // 计算地图的实际宽高比
    // 对于尖角朝上的正六边形：
    // 高度 = hexHeight * (1 + (rows - 1) * 3/4)
    // 宽度 = hexWidth * (cols + 0.5) = (hexHeight * √3/2) * (cols + 0.5)
    const mapRatio = ((cols + 0.5) * Math.sqrt(3)) / 2 / (1 + ((rows - 1) * 3) / 4);

    const updateMap = () => {
      console.log("updateMap")
      if (containerRef.current) {
        const windowRatio = window.innerWidth / window.innerHeight;

        // 根据地图比例和窗口比例决定容器尺寸
        const mwidth = mapRatio < windowRatio ? window.innerHeight * mapRatio : window.innerWidth;
        const mheight = mapRatio < windowRatio ? window.innerHeight : window.innerWidth / mapRatio;

        // 计算六边形尺寸
        const hexHeight = mheight * 0.92 / (1 + ((rows - 1) * 3) / 4);
        const hexWidth = (hexHeight * Math.sqrt(3)) / 2;

        // 计算总宽度
        const totalWidth = hexWidth * (cols + 0.5);

        const left = (mwidth - totalWidth) / 2;
        const dw = (window.innerWidth - mwidth) / 2;
        const dh = (window.innerHeight - mheight) / 2;

        changeCell({ width: hexWidth, height: hexHeight });
        setPlazaPosition({
          top: 0,  // 1 - 0.92
          left: left + 0.25 * hexWidth,
          width: totalWidth,
          height: mheight * 0.92
        });
        setPlacePosition({ top: dh, left: dw, width: mwidth, height: mheight });
      }
    };

    updateMap();
    window.addEventListener("resize", updateMap);
    return () => window.removeEventListener("resize", updateMap);
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
const BattlePlayer: React.FC = (props) => {
  console.log(props);
  return (
    <BattleProvider>
      <BattleVenue></BattleVenue>
    </BattleProvider>
  );
};
export default BattlePlayer;
