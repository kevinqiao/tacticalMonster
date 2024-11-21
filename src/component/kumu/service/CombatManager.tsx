import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { allObstacles, players } from "./data/CombatData";
import {
  CharacterUnit,
  CombatEvent,
  CombatRound,
  GridCell,
  ICombatContext,
  MapModel,
  Player,
} from "./model/CombatModels";
import useCombatAct from "./useCombatAct";

// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);

const characterList = players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
const mapData = {
  rows: 7,
  cols: 8,
  obstacles: allObstacles,
  disables: [
    { x: 0, y: 0 },
    { x: 7, y: 0 },
    { x: 7, y: 1 },
    { x: 0, y: 6 },
    { x: 7, y: 6 },
    { x: 7, y: 5 },
    { x: 7, y: 3 },
  ],
};
export const CombatContext = createContext<ICombatContext>({
  cellSize: 0,
  resourceLoad: null,
  map: { rows: 7, cols: 8 },
  gridCells: null,
  challenger: null,
  challengee: null,
  characters: null,
  currentRound: null,
  timeClock: 0,
  eventQueue: [],
  setResourceLoad: () => null,
  changeCellSize: () => null,
  walk: () => null,
});

const CombatProvider = ({ children }: { children: ReactNode }) => {
  // console.log("combat provider....");
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [cellSize, setCellSize] = useState<number>(0);
  const [map, setMap] = useState<MapModel>(mapData);
  const [gridCells, setGridCells] = useState<GridCell[][] | null>(null);
  const [challenger, setChallenger] = useState<Player | null>({ uid: "1" });
  const [challengee, setChallengee] = useState<Player | null>({ uid: "2" });
  const [characters, setCharacters] = useState<CharacterUnit[] | null>(characterList);
  const [timeClock, setTimeClock] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<CombatRound | null>(null);

  const [resourceLoad, setResourceLoad] = useState<{
    character: number;
    gridContainer: number;
    gridGround: number;
    gridCover: number;
    gridStand: number;
    gridAttack: number;
  }>({ character: 0, gridContainer: 0, gridGround: 0, gridCover: 1, gridStand: 0, gridAttack: 0 });

  useEffect(() => {
    if (!map || map.cols === 0 || map.rows === 0) return;
    const { rows, cols, obstacles, disables } = map;

    const cells: GridCell[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        const cell: GridCell = {
          x,
          y,
          gridContainer: null,
          gridGround: null,
          gridStand: null,
          gridAttack: null,
          gridCover: null,
          walkable: true,
          type: 0,
        };
        const obstacle = obstacles?.find((o) => o.col === x && o.row === y);
        if (obstacle) {
          cell.walkable = false;
          cell.type = 1;
        }
        const disable = disables?.find((d) => d.x === x && d.y === y);
        if (disable) {
          cell.walkable = false;
          cell.type = 2;
        }
        return cell;
      })
    );
    // console.log(cells);
    setGridCells(cells);
  }, [map]);

  const { walk } = useCombatAct();
  const value = {
    cellSize,
    map,
    gridCells,
    challenger,
    challengee,
    currentRound,
    characters,
    timeClock,
    eventQueue: eventQueueRef.current,
    resourceLoad,
    setResourceLoad,
    changeCellSize: setCellSize,
    walk,
  };
  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};

export const useCombatManager = () => {
  const ctx = useContext(CombatContext);
  return ctx;
};
export default CombatProvider;
