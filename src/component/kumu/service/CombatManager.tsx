import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";
export interface PathCell {
  row: number;
  col: number;
  element?: HTMLDivElement;
}
export interface ObstacleCell {
  row: number;
  col: number;
  type: number;
  walkable: boolean;
  element?: HTMLDivElement;
}
export interface CharacterUnit {
  id: number;
  position: { x: number; y: number };
  element?: SVGSVGElement;
}
export interface MapModel {
  top: number;
  left: number;
  rows: number;
  cols: number;
  size: number;
}

interface ICombatContext {
  map: MapModel;
  pathCells: PathCell[];
  obstacles: ObstacleCell[];
  characters: CharacterUnit[];
}
const CombatContext = createContext<ICombatContext>({
  map: { rows: 7, cols: 8, top: 0, left: 0, size: 0 },
  pathCells: [],
  obstacles: [],
  characters: [],
});
const allCharacters = [
  { id: 1, position: { x: 1, y: 3 } },
  { id: 2, position: { x: 5, y: 4 } },
];

const CombatProvider = ({ children }: { children: ReactNode }) => {
  const [map, setMap] = useState<MapModel>({ rows: 7, cols: 8, top: 0, left: 0, size: 0 });
  const [pathCells, setPathCells] = useState<PathCell[]>([]);
  const [obstacles, setObstacles] = useState<ObstacleCell[]>([]);
  const [characters, setCharacters] = useState<CharacterUnit[]>(allCharacters);
  const { partner } = usePartnerManager();
  const { locale } = useLocalization();
  useEffect(() => {
    if (!map) return;
    const { rows, cols } = map;
    const updateSize = () => {
      const newSize = Math.min(window.innerWidth / (cols + 1), window.innerHeight / ((rows + 1) * 0.75)); // 最大六边形边长为100px
      const dw = (window.innerWidth - (newSize + 1) * 8.5) / 2;
      const dh = (window.innerHeight - newSize * 0.75 * 7.5) / 2;
      setMap({ rows: 7, cols: 8, top: dh, left: dw, size: newSize });
      // setMap((pre) => {
      //   return { ...pre, top: dh, left: dw, size: newSize };
      // });
    };
    updateSize(); // 初始化时设置一次
    window.addEventListener("resize", updateSize); // 监听屏幕变化
    return () => window.removeEventListener("resize", updateSize); // 清除监听器
  }, []);
  const value = {
    map,
    pathCells,
    obstacles,
    characters,
  };

  return (
    <>
      <CombatContext.Provider value={value}> {children} </CombatContext.Provider>
    </>
  );
};
export const useCombatManager = () => {
  return useContext(CombatContext);
};
export default CombatProvider;
