import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { useConvex, useQuery } from "convex/react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/_generated/api";
import { allObstacles } from "../data/CombatData";
import {
  CharacterUnit,
  CombatEvent,
  CombatRound,
  GameModel,
  GridCell,
  ICombatContext,
  MapModel
} from "../types/CombatTypes";


// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);



// const characterList = players.reduce<CharacterUnit[]>(
//   (acc, cur) => [
//     ...acc,
//     ...cur.characters.map((char) => ({
//       ...char,
//       id: char.character_id,
//       asset: char.asset ?? "",
//     })),
//   ],
//   []
// );
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
  // rowContainers: {},
  coordDirection: 0,
  currentRound: { no: 0, turns: [], status: 0 },
  gameId: null,
  hexCell: { width: 0, height: 0 },
  resourceLoad: { character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 },
  map: { rows: 7, cols: 8 },
  gridCells: null,
  timeClock: 0,
  eventQueue: [],
  setResourceLoad: () => null,
  changeCell: () => null,
  changeCoordDirection: () => null
});
const round: CombatRound = {
  no: 1,
  turns: [],
  status: 0
};

const CombatProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {
  const [coordDirection, setCoordDirection] = useState<number>(0);
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
  const { map, challenger, challengee, characters, timeClock, currentRound } = game || {};
  const { user } = useUserManager();
  useEffect(() => {
    if (Array.isArray(events) && events.length > 0) {
      eventQueueRef.current.push(...events);
      setLastTime(events[events.length - 1].time);
    }
  }, [events]);
  useEffect(() => {


    if (!gameId || !user.uid) return;

    const fetchGame = async (gameId: string) => {

      console.log("gameId", gameId);
      const gameObj = await convex.query(api.dao.tmGameDao.find, {
        gameId, uid: "1",
        token: "test-token"
      });
      if (gameObj) {
        console.log("gameObj", gameObj);
        if (gameObj.challenger !== user.uid) {
          const map = gameObj.map as MapModel;
          map.direction = 1;
        }
        gameObj.characters.forEach((character) => {
          const c = character as CharacterUnit;
          if (c.uid === user.uid) {
            c.scaleX = 1;
          } else {
            c.scaleX = -1;
          }
        });
        setGame({
          gameId: gameObj.id,
          map: gameObj.map as MapModel,
          challenger: gameObj.challenger,
          challengee: gameObj.challengee,
          players: gameObj.players,
          characters: gameObj.characters,
          currentRound: gameObj.currentRound ?? round,
          timeClock: 0
        });
        setLastTime(gameObj.lastUpdate);
        eventQueueRef.current.push({ name: "gameInit", data: gameObj, status: 0 });
      }

    };
    fetchGame(gameId);
  }, [gameId, user]);

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
        // const disable = disables?.find((d) => d.q === x && d.r === y);
        // if (disable) {
        //   cell.walkable = false;
        //   cell.type = 2;
        // }
        return cell;
      })
    );
    // console.log(cells);
    setGridCells(cells);
  }, [map]);

  const changeCoordDirection = useCallback((direction: number) => {
    console.log("changeCoordDirection", direction);
    if (map) {
      map.direction = direction;
      eventQueueRef.current.push({ name: "changeCoordDirection", data: map, status: 0 });
    }

  }, [map, eventQueueRef.current]);


  const value = {
    coordDirection,
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
    changeCoordDirection


  };
  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};

export const useCombatManager = () => {
  const ctx = useContext(CombatContext);
  return ctx;
};
export default CombatProvider;
