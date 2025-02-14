import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { getRoutePath } from "component/ludo/util/mapUtils";
import { CombatEvent, GameModel, ICombatContext } from "../types/CombatTypes";
import CombatEventHandler from "./CombatEventHandler";
import { tokenRoutes } from "./tokenRoutes";



// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);


const boardSize = 15

export const CombatContext = createContext<ICombatContext>({
  boardDimension: { width: 0, height: 0 },
  game: null,
  tokens: [],
  currentRound: { no: 0, turns: [], status: 0 },
  timeClock: 0,
  eventQueue: [],
  seatRoutes: {},
  updateBoardDimension: () => { }
});


const CombatProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const [game, setGame] = useState<GameModel | null>(null);
  const [boardDimension, setBoardDimension] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const { timeClock, currentRound } = game || {};
  const tokens = useMemo(() => {
    return game?.seats.map(seat =>
      seat.tokens.map(token => ({
        ...token,
        seatNo: seat.no
      }))
    ).flat();
  }, [game]);
  const seatRoutes = useMemo(() => {
    if (!game) return {};
    const { seats } = game;
    const routes: { [k: number]: { x: number, y: number }[] } = {};
    seats.forEach((seat) => {
      const tokens = tokenRoutes[seat.no];
      if (tokens) {
        const route = getRoutePath(tokens);
        routes[seat.no] = route;
      }
    });
    return routes;
  }, [game])

  const updateBoardDimension = (width: number, height: number) => {
    setBoardDimension({ width, height });
  }
  useEffect(() => {
    setGame({
      gameId: "123",
      seats: [
        { no: 0, tokens: [], stationEles: {} },
        { no: 2, tokens: [], stationEles: {} },
        {
          no: 1,
          uid: "123", tokens: [
            { id: 0, x: 8, y: 4 },
            { id: 1, x: -1, y: -1 },
            { id: 2, x: -1, y: -1 },
            { id: 3, x: -1, y: -1 },
          ],
          stationEles: {}
        },
        {
          no: 3,
          uid: "543", tokens: [
            { id: 0, x: -1, y: -1 },
            { id: 1, x: 6, y: 10 },
            { id: 2, x: -1, y: -1 },
            { id: 3, x: -1, y: -1 },
          ],
          stationEles: {}
        }],
    })
  }, [])

  const value = {
    game,
    tokens,
    currentRound,
    timeClock,
    eventQueue: eventQueueRef.current,
    seatRoutes,
    boardDimension,
    updateBoardDimension
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

