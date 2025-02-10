import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useMemo, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { getRoutePath } from "component/ludo/util/mapUtils";
import { BoardCell, CombatEvent, CombatRound, GameModel, ICombatContext } from "../types/CombatTypes";
import { Seat } from "../types/GridTypes";
import { tokenRoutes } from "./tokenRoutes";



// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);


const boardSize = 15

export const CombatContext = createContext<ICombatContext>({
  seats: [],
  // rowContainers: {},
  boardSize,
  game: null,
  coordDirection: 0,
  currentRound: { no: 0, turns: [], status: 0 },
  gameId: null,
  hexCell: { width: 0, height: 0 },
  resourceLoad: { character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 },
  boardCells: null,
  timeClock: 0,
  eventQueue: [],
  setResourceLoad: () => null,
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
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const [resourceLoad, setResourceLoad] = useState<{
    character: number;
    gridContainer: number;
    gridGround: number;
    gridWalk: number;
  }>({ character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 });
  const [game, setGame] = useState<GameModel | null>(null);

  const { map, challenger, challengee, characters, timeClock, currentRound } = game || {};

  const seats: Seat[] = useMemo(() => {
    return Array.from({ length: 4 }, (_, index) => ({ no: index, x: 0, y: 0 }));
  }, []);

  const boardCells: BoardCell[][] = useMemo(() => {
    return Array.from({ length: 15 }, (_, y) => {
      return Array.from({ length: 15 }, (_, x) => ({ x, y }))
    });
  }, []);

  const routeLine = useMemo(() => {
    // const startX = 1, startY = 6;
    // const endX = 5, endY = 6;
    // const linePath: { x: number, y: number }[] = getRouteLine(startX, startY, endX, endY);
    // return linePath;
    const route = tokenRoutes[1];
    console.log(route)
    return getRoutePath(route);
  }, []);





  const value = {
    seats,
    boardSize,
    game,
    coordDirection,
    gameId,
    hexCell,
    map,
    boardCells,
    challenger,
    challengee,
    currentRound,
    characters,
    timeClock,
    eventQueue: eventQueueRef.current,
    resourceLoad,
    setResourceLoad,
  };
  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};

export const useCombatManager = () => {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error("useCombatManager must be used within a CombatProvider");
  }
  return context;
};

export default CombatProvider;

