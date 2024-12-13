import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { allObstacles, players } from "../data/CombatData";
import {
  ACT_CODE,
  CharacterUnit,
  CombatEvent,
  CombatRound,
  GridCell,
  ICombatContext,
  MapModel,
  Player,
} from "../model/CombatModels";

import { aStar, Hex, gridToHex, hexToGrid } from "../../utils/PathFind";
import { calculateHexMetrics } from "../utils/gridUtils";

// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);

const characterList = players.reduce<CharacterUnit[]>(
  (acc, cur) => [
    ...acc,
    ...cur.characters.map((char) => ({
      ...char,
      id: char.character_id,
      asset: char.asset ?? "",
    })),
  ],
  []
);
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
  ],
};
export const CombatContext = createContext<ICombatContext>({
  hexCell: { width: 0, height: 0 },
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
  changeCell: () => null,
  walk: () => null,
  findPath: () => null,
  getPixelPosition: () => ({ x: 0, y: 0 }),
  paths: {},
  setPaths: () => null,
  updateCharacterPosition: () => null,
});

const CombatProvider = ({ children }: { children: ReactNode }) => {
  // console.log("combat provider....");
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [hexCell, setHexCell] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
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
    gridStand: number;
    gridAttack: number;
  }>({ character: 0, gridContainer: 0, gridGround: 0, gridStand: 0, gridAttack: 0 });

  const [paths, setPaths] = useState<Record<string, Hex[]>>({});

  const updateCharacterPosition = (characterId: string, x: number, y: number) => {
    setCharacters(
      (prev) =>
        prev?.map((char) => (char.character_id === characterId ? { ...char, position: { x, y } } : char)) ?? null
    );
  };

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

  const isWalkable = (q: number, r: number): boolean => {
    if (!gridCells) return false;
    // Check bounds
    if (r < 0 || r >= map.rows || q < 0 || q >= map.cols) return false;
    return gridCells[r][q].walkable ?? false;
  };

  const findPath = (from: { q: number; r: number }, to: { q: number; r: number }): Hex[] | null => {
    const start: Hex = { q: from.q, r: from.r };
    const goal: Hex = { q: to.q, r: to.r };
    return aStar(start, goal, isWalkable);
  };

  const getPixelPosition = (q: number, r: number) => {
    const metrics = calculateHexMetrics(hexCell.width);
    return {
      x: q * metrics.width + ((r % 2) * metrics.width) / 2,
      y: (r * metrics.height * 3) / 4,
    };
  };

  const walk = async (to: { q: number; r: number }) => {
    const character = characters?.find((c) => c.id === currentRound?.turns[0].character);
    if (!character) return;

    const path = findPath({ q: character.q, r: character.r }, to);

    if (!path) return;

    // Convert path to pixel coordinates for animation
    const pixelPath = path.map((hex) => getPixelPosition(hex.q, hex.r));

    // Add to event queue
    eventQueueRef.current.push({
      category: "action",
      name: "walk",
      gameId: "current",
      time: Date.now(),
      data: {
        gameId: "current",
        actor: character.id,
        act: ACT_CODE.WALK,
        data: { path: pixelPath },
      },
    });
  };

  const value = {
    hexCell,
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
    changeCell: setHexCell,
    walk,
    findPath,
    getPixelPosition,
    paths,
    setPaths,
    updateCharacterPosition,
  };
  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};

export const useCombatManager = () => {
  const ctx = useContext(CombatContext);
  return ctx;
};
export default CombatProvider;
