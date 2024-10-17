import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";

import useCombatAnimate from "../animation/useCombatAnimate";
import { HexNode, ReachableHexNode } from "../utils/Utlis";
import useCombatAct from "./useCombatAct";

export interface Player {
  uid: string;
  characters: CharacterUnit[];
}
interface CombatAction {
  uid: string;
  characterId: number;
  code: number;
  data: any;
  time: number;
  round: number;
}
interface CombatRound {
  no: number;
  uid: string;
  startTime: number;
  endTime?: number;
  actions: CombatAction[];
}
export interface PathCell {
  x: number;
  y: number;
  container: SVGSVGElement | null;
  element: SVGPolygonElement | null;
  cover: HTMLDivElement | null;
}
export interface ObstacleCell {
  row: number;
  col: number;
  asset: string;
  type?: number;
  walkable?: boolean;
  element?: HTMLDivElement;
}
export interface CharacterUnit {
  id: number;
  uid?: string;
  position: { x: number; y: number };
  asset: string;
  container?: HTMLDivElement;
  walkablCells?: ReachableHexNode[];
  attackables?: CharacterUnit[];
  healables?: CharacterUnit[];
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
  gridMap: HexNode[][] | null;
  pathCells: PathCell[][] | null;
  obstacles: ObstacleCell[];
  players: Player[];
  currentRound: CombatRound | null;
  currentAction: CombatAction | null;
  selectedCharacter: CharacterUnit | null;
  select: (character: CharacterUnit) => void;
  run: (x: number, y: number) => void;
  setResourceLoad: React.Dispatch<
    React.SetStateAction<{
      character: number;
      grid: number;
      gridGround: number;
      gridCover: number;
    }>
  >;
}
const CombatContext = createContext<ICombatContext>({
  map: { rows: 7, cols: 8, top: 0, left: 0, size: 0 },
  gridMap: null,
  pathCells: null,
  obstacles: [],
  players: [],
  currentRound: null,
  currentAction: null,
  selectedCharacter: null,
  select: () => null,
  run: () => null,
  setResourceLoad: () => null,
});

const allPlayers = [
  {
    uid: "1",
    characters: [
      { id: 1, position: { x: 0, y: 1 }, asset: "/assets/hero_baboon.png" },
      { id: 2, position: { x: 1, y: 4 }, asset: "/assets/hero_tiger.png" },
    ],
  },
  {
    uid: "2",
    characters: [
      { id: 1, position: { x: 6, y: 2 }, asset: "/assets/hero_elephant.png" },
      { id: 2, position: { x: 5, y: 5 }, asset: "/assets/hero_rhino.png" },
    ],
  },
];
const allObstacles = [
  { row: 0, col: 3, asset: "/assets/obstacle1.png" },
  { row: 2, col: 4, asset: "/assets/obstacle2.png" },
];

const CombatProvider = ({ children }: { children: ReactNode }) => {
  const initRef = useRef<boolean>(false);
  const [size, setSize] = useState<{ rows: number; cols: number }>({ rows: 6, cols: 8 });
  const [map, setMap] = useState<MapModel>({ rows: 0, cols: 0, top: 0, left: 0, size: 0 });
  const [pathCells, setPathCells] = useState<PathCell[][] | null>(null);
  const [obstacles, setObstacles] = useState<ObstacleCell[]>(allObstacles);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState<CombatRound | null>({
    no: 1,
    uid: "1",
    startTime: Date.now(),
    actions: [],
  });
  const [currentAction, setCurrentAction] = useState<CombatAction | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterUnit | null>(null);
  const [resourceLoad, setResourceLoad] = useState<{
    character: number;
    grid: number;
    gridGround: number;
    gridCover: number;
  }>({ character: 0, grid: 0, gridGround: 0, gridCover: 0 });
  const gridMap: HexNode[][] | null = useMemo(() => {
    if (pathCells && obstacles && size) {
      const { rows, cols } = size;
      const mapGrid: HexNode[][] = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => {
          const node = { x, y, g: 0, h: 0, f: 0, walkable: true, parent: null };
          const obstacle = obstacles.find((o) => o.col === x && o.row === y);
          if (obstacle) node.walkable = false;
          return node;
        })
      );
      return mapGrid;
    }
    return null;
  }, [obstacles, pathCells, size]);
  const { getRunables, attack, walk, heal } = useCombatAct({ gridMap, players });
  const { playSelectHero, playInit } = useCombatAnimate(pathCells, map);
  const { partner } = usePartnerManager();
  const { locale } = useLocalization();

  useEffect(() => {
    const playerList: Player[] = [];
    for (const player of allPlayers) {
      const characters = player.characters.map((c, index) => ({ ...c, uid: player.uid }));
      playerList.push({ ...player, characters });
    }
    setPlayers(playerList);
  }, []);
  useEffect(() => {
    if (!size) return;
    const { rows, cols } = size;
    const updateMap = () => {
      const newSize = Math.min(window.innerWidth / (cols + 1), window.innerHeight / ((rows + 1) * 0.75)); // 最大六边形边长为100px
      const dw = (window.innerWidth - (newSize + 1) * (cols + 0.5)) / 2;
      const dh = (window.innerHeight - newSize * 0.75 * (rows + 0.5)) / 2;
      setMap({ rows, cols, top: dh, left: dw, size: newSize });
    };
    setPathCells(
      Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => ({ x, y, container: null, element: null, cover: null }))
      )
    );
    updateMap(); // 初始化时设置一次
    window.addEventListener("resize", updateMap); // 监听屏幕变化
    return () => window.removeEventListener("resize", updateMap); // 清除监听器
  }, [size]);
  useEffect(() => {
    if (!initRef.current && players && resourceLoad.character && resourceLoad.grid && resourceLoad.gridCover) {
      initRef.current = true;
      const characters = players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
      playInit(characters);
    }
  }, [resourceLoad, players, playInit]);
  const select = useCallback(
    (character: CharacterUnit) => {
      const walkablCells: ReachableHexNode[] | undefined = getRunables(character);
      if (walkablCells) {
        setSelectedCharacter((pre) => {
          playSelectHero({ unselects: pre?.walkablCells, walkables: walkablCells });
          return { ...character, walkablCells };
        });
      }
    },
    [getRunables]
  );
  const run = useCallback((x: number, y: number) => {
    console.log(x + ":" + y);
  }, []);

  const value = {
    map,
    gridMap,
    pathCells,
    obstacles,
    players,
    currentRound,
    currentAction,
    selectedCharacter,
    select,
    run,
    setResourceLoad,
  };

  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};
export const useCombatManager = () => {
  return useContext(CombatContext);
};
export default CombatProvider;
