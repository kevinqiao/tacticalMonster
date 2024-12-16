import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { allObstacles, players } from "../data/CombatData";
import {
  ACT_CODE,
  CharacterUnit,
  CombatEvent,
  CombatRound,
  EVENT_TYPE,
  GridCell,
  ICombatContext,
  MapModel,
  Player
} from "../model/CombatModels";
import { findPath } from "../utils/PathFind";


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
  // findPath: () => null,
  // getPixelPosition: () => ({ x: 0, y: 0 }),
  // paths: {},
  // setPaths: () => null,
  // updateCharacterPosition: () => null,
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

  // const [paths, setPaths] = useState<Record<string, Hex[]>>({});
  const { character, gridContainer, gridGround, gridStand, gridAttack } = resourceLoad;
  // 添加状态来存储可移动格子
  useEffect(() => {
    if (gridGround) {

      setTimeout(() => {
        eventQueueRef.current.push({
          type: EVENT_TYPE.PHASE,
          name: "round",
          status: 0,
          gameId: "current",
          time: Date.now(),
          data: {
            no: 1,
            gameId: "current",
            currentTurn: { uid: "1", character: "1", startTime: Date.now() },
            turns: [],
          },
        });
      }, 1000);
    }
  }, [gridGround]);

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



  const walk = useCallback(async (to: { q: number; r: number }) => {
    // const character = characters?.find((c) => c.id === currentRound?.turns[0].character);
    if (!characters || !gridCells) return;
    console.log('characters', characters[0]);
    const path = findPath(gridCells,
      { x: characters[0].q, y: characters[0].r },
      { x: to.q, y: to.r }
    );

    if (!path) return;

    eventQueueRef.current.push({
      type: EVENT_TYPE.ACTION,
      name: "walk",
      status: 0,
      gameId: "current",
      time: Date.now(),
      data: {
        uid: "1",
        character: characters[0].id,
        act: ACT_CODE.WALK,
        data: { path },
      },
    });
  }, [characters, currentRound, gridCells]);

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

  };
  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};

export const useCombatManager = () => {
  const ctx = useContext(CombatContext);
  return ctx;
};
export default CombatProvider;
