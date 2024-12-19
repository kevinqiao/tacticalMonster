import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { allObstacles, players } from "../data/CombatData";
import {
  CharacterUnit,
  CombatEvent,
  CombatRound,
  GridCell,
  ICombatContext,
  MapModel,
  Player
} from "../types/CombatTypes";


// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);

interface GameModel {
  gameId: string;
  map: MapModel;
  challenger: string;
  challengee: string;
  players: Player[];
  characters: CharacterUnit[];
  currentRound?: CombatRound;
  timeClock: number;
}

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
  gameId: null,
  hexCell: { width: 0, height: 0 },
  resourceLoad: { character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 },
  map: { rows: 7, cols: 8 },
  gridCells: null,
  timeClock: 0,
  eventQueue: [],
  setResourceLoad: () => null,
  changeCell: () => null,

});
const round: CombatRound = {
  no: 1,
  gameId: "current",
  currentTurn: { uid: "1", character: "1", startTime: Date.now() },
  turns: [],
  status: 1
};

const CombatProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {

  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [hexCell, setHexCell] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [gridCells, setGridCells] = useState<GridCell[][] | null>(null);

  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const [resourceLoad, setResourceLoad] = useState<{
    character: number;
    gridContainer: number;
    gridGround: number;
    gridWalk: number;
  }>({ character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 });
  const [game, setGame] = useState<GameModel | null>(null);
  const events: any = useQuery(api.dao.tmEventDao.find, { gameId, lastTime });
  const convex = useConvex();
  const { map, challenger, challengee, characters, currentRound, timeClock } = game || {};
  useEffect(() => {
    if (Array.isArray(events) && events.length > 0) {
      console.log(events)
      eventQueueRef.current.push(...events);
      setLastTime(events[events.length - 1].time);
    }
  }, [events]);
  useEffect(() => {

    const fetchGame = async () => {
      if (gameId) {
        console.log("gameId", gameId);
        const gameObj = await convex.query(api.dao.tmGameDao.findBySession, {
          gameId, uid: "1",
          token: "test-token"
        });
        if (gameObj) {
          console.log(gameObj);
          setGame({
            gameId: gameObj.id,
            map: gameObj.map as MapModel ?? mapData,
            challenger: gameObj.challenger,
            challengee: gameObj.challengee,
            players: gameObj.players,
            characters: gameObj.characters ?? characterList,
            currentRound: round,
            timeClock: 0
          });
          setLastTime(gameObj.lastUpdate);
        }
      }
    };

    fetchGame();
  }, [gameId]);

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
          gridWalk: null,
          walkable: true,
          type: 0,
        };
        const obstacle = obstacles?.find((o) => o.q === x && o.r === y);
        if (obstacle) {
          cell.walkable = false;
          cell.type = 1;
        }
        const disable = disables?.find((d) => d.q === x && d.r === y);
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



  // const walk = useCallback(async (to: { q: number; r: number }) => {
  //   // const character = characters?.find((c) => c.id === currentRound?.turns[0].character);
  //   if (!characters || !gridCells) return;
  //   console.log('characters', characters[0]);
  //   const path = findPath(gridCells,
  //     { x: characters[0].q, y: characters[0].r },
  //     { x: to.q, y: to.r }
  //   );

  //   if (!path) return;

  //   eventQueueRef.current.push({
  //     type: EVENT_TYPE.ACTION,
  //     name: "walk",
  //     status: 0,
  //     gameId: "current",
  //     time: Date.now(),
  //     data: {
  //       uid: "1",
  //       character: characters[0].character_id,
  //       act: ACT_CODE.WALK,
  //       data: { path },
  //     },
  //   });
  // }, [characters, currentRound, gridCells]);

  const value = {
    gameId,
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


  };
  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};

export const useCombatManager = () => {
  const ctx = useContext(CombatContext);
  return ctx;
};
export default CombatProvider;
