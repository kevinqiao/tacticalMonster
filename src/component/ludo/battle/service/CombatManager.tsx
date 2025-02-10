import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useMemo, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { BoardCell, CombatEvent, CombatRound, GameModel, ICombatContext } from "../types/CombatTypes";
import { Seat } from "../types/GridTypes";
import CombatEventHandler from "./CombatEventHandler";



// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);


const boardSize = 15

export const CombatContext = createContext<ICombatContext>({
  seats: [],
  game: null,
  currentRound: { no: 0, turns: [], status: 0 },
  gameId: null,
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
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const [resourceLoad, setResourceLoad] = useState<{
    character: number;
    gridContainer: number;
    gridGround: number;
    gridWalk: number;
  }>({ character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 });
  const [game, setGame] = useState<GameModel | null>(null);

  const { timeClock, currentRound } = game || {};

  const seats: Seat[] = useMemo(() => {
    return Array.from({ length: 4 }, (_, index) => ({ no: index, x: 0, y: 0 }));
  }, []);

  const boardCells: BoardCell[][] = useMemo(() => {
    return Array.from({ length: 15 }, (_, y) => {
      return Array.from({ length: 15 }, (_, x) => ({ x, y }))
    });
  }, [])



  const value = {
    seats,
    game,
    gameId,
    boardCells,
    currentRound,
    timeClock,
    eventQueue: eventQueueRef.current,
    resourceLoad,
    setResourceLoad,
  };
  return <CombatContext.Provider value={value}> <CombatEventHandler>{children}</CombatEventHandler></CombatContext.Provider>;
};

export const useCombatManager = () => {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error("useCombatManager must be used within a CombatProvider");
  }
  return context;
};

export default CombatProvider;

